const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

const UsersModel = require('../models/users');
const Recording = require('../models/recording');
const AuditLog = require('../models/AuditLog');
const { isAdmin } = require('../middleware/adminAuth');
const { writeLog } = require('../middleware/auditLogger');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        return res.status(500).json({ success: false, message: 'Admin not configured' });
    }

    if (username !== adminUsername || password !== adminPassword) {
        await writeLog({
            actor: username || 'unknown',
            type: 'Security',
            severity: 'WARNING',
            action: 'admin.login.failed',
            description: `Failed admin login attempt for username: "${username}"`,
            ip: req.ip,
        });
        return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
        { role: 'admin', username: adminUsername },
        process.env.ADMIN_SECRET,
        { expiresIn: '8h' }
    );

    await writeLog({
        actor: adminUsername,
        type: 'Security',
        severity: 'INFO',
        action: 'admin.login',
        description: `Admin logged in`,
        ip: req.ip,
    });

    res.json({ success: true, token });
});

router.get('/stats', isAdmin, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const [totalUsers, totalRecordings, newUsersThisWeek] = await Promise.all([
            UsersModel.countDocuments(),
            Recording.countDocuments(),
            UsersModel.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        ]);

        const activeUsersThisMonth = await Recording.distinct('userId', {
            createdAt: { $gte: startOfMonth },
        });

        const year = parseInt(req.query.year) || now.getFullYear();
        const monthlyUsers = await UsersModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${year}-01-01`),
                        $lt: new Date(`${year + 1}-01-01`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const found = monthlyUsers.find(m => m._id === i + 1);
            return { month: i + 1, count: found ? found.count : 0 };
        });

        const recentUsers = await UsersModel.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('username email createdAt googleId lockedUntil loginAttempts deactivated deactivationRequested');

        const thirtyDaysAgoDate = thirtyDaysAgo;
        const recentActivity = await Recording.find({ createdAt: { $gte: thirtyDaysAgoDate } })
            .countDocuments();

        const usersWithActivity = await Promise.all(
            recentUsers.map(async (u) => {
                const recCount = await Recording.countDocuments({ userId: u._id });
                const lastRec = await Recording.findOne({ userId: u._id }).sort({ createdAt: -1 });
                const isActive = lastRec && lastRec.createdAt >= thirtyDaysAgo;
                return {
                    _id: u._id,
                    username: u.username || u.email?.split('@')[0],
                    email: u.email,
                    joinDate: u.createdAt,
                    recordingCount: recCount,
                    isActive,
                    authMethod: u.googleId ? 'google' : 'email',
                };
            })
        );

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalRecordings,
                newUsersThisWeek,
                activeUsersThisMonth: activeUsersThisMonth.length,
            },
            monthlyData,
            recentUsers: usersWithActivity,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/users', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const filter = req.query.filter || '';
        const skip = (page - 1) * limit;

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        let query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await UsersModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('username email createdAt googleId lockedUntil loginAttempts deactivated deactivationRequested');

        const total = await UsersModel.countDocuments(query);

        const usersWithMeta = await Promise.all(
            users.map(async (u) => {
                const lastRec = await Recording.findOne({ userId: u._id }).sort({ createdAt: -1 });
                const recCount = await Recording.countDocuments({ userId: u._id });
                const isActive = lastRec && lastRec.createdAt >= thirtyDaysAgo;

                if (filter === 'active' && !isActive) return null;
                if (filter === 'last30' && u.createdAt < thirtyDaysAgo) return null;

                return {
                    _id: u._id,
                    username: u.username || u.email?.split('@')[0],
                    email: u.email,
                    joinDate: u.createdAt,
                    recordingCount: recCount,
                    lastActive: lastRec ? lastRec.createdAt : null,
                    isActive: !!isActive,
                    authMethod: u.googleId ? 'google' : 'email',
                    lockedUntil: u.lockedUntil || null,
                    loginAttempts: u.loginAttempts || 0,
                    deactivated: u.deactivated || false,
                    deactivationRequested: u.deactivationRequested || false,
                };
            })
        );

        const filtered = usersWithMeta.filter(Boolean);

        res.json({
            success: true,
            users: filtered,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await UsersModel.findById(req.params.id).select('username email createdAt googleId lockedUntil loginAttempts deactivated deactivationRequested');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const recordings = await Recording.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .select('name sentence durationMs sizeBytes createdAt mimeType');

        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username || user.email?.split('@')[0],
                email: user.email,
                joinDate: user.createdAt,
                authMethod: user.googleId ? 'google' : 'email',
            },
            recordings,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await UsersModel.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const username = user.username || user.email;
        await UsersModel.findByIdAndDelete(req.params.id);
        await Recording.deleteMany({ userId: req.params.id });

        await writeLog({
            actor: 'admin',
            type: 'User Action',
            severity: 'WARNING',
            action: 'admin.user.deleted',
            description: `Admin deleted user "${username}" (${user.email}) and all their recordings`,
            metadata: { deletedUserId: req.params.id, email: user.email },
            ip: req.ip,
        });

        res.json({ success: true, message: `User ${username} deleted` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/users', isAdmin, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No user IDs provided' });
        }

        const users = await UsersModel.find({ _id: { $in: ids } }).select('username email');
        await UsersModel.deleteMany({ _id: { $in: ids } });
        await Recording.deleteMany({ userId: { $in: ids } });

        await writeLog({
            actor: 'admin',
            type: 'User Action',
            severity: 'WARNING',
            action: 'admin.users.bulk_deleted',
            description: `Admin bulk deleted ${ids.length} users`,
            metadata: { deletedUsers: users.map(u => ({ id: u._id, email: u.email })) },
            ip: req.ip,
        });

        res.json({ success: true, message: `${ids.length} users deleted` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/logs', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const type = req.query.type || '';
        const severity = req.query.severity || '';
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

        let query = {};
        if (type && type !== 'All') query.type = type;
        if (severity && severity !== 'All Levels') query.severity = severity;
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = dateFrom;
            if (dateTo) query.createdAt.$lte = dateTo;
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(query),
        ]);

        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalEvents24h, criticalAlerts] = await Promise.all([
            AuditLog.countDocuments({ createdAt: { $gte: last24h } }),
            AuditLog.countDocuments({ severity: 'CRITICAL', createdAt: { $gte: last24h } }),
        ]);

        res.json({
            success: true,
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            stats: {
                totalEvents24h,
                criticalAlerts,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/logs/export', isAdmin, async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(5000);

        const headers = ['Timestamp', 'Type', 'Severity', 'Actor', 'Action', 'Description', 'IP'];
        const rows = logs.map(l => [
            new Date(l.createdAt).toISOString(),
            l.type,
            l.severity,
            l.actor,
            l.action,
            `"${l.description.replace(/"/g, '""')}"`,
            l.ip || '',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/deactivation-requests', isAdmin, async (req, res) => {
    try {
        const requests = await UsersModel.find({ deactivationRequested: true })
            .select('-password -twoFactorSecret')
            .sort({ deactivationRequestedAt: -1 });
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/deactivate/:id', isAdmin, async (req, res) => {
    try {
        const user = await UsersModel.findByIdAndUpdate(
            req.params.id,
            { deactivated: true, deactivationRequested: false },
            { new: true }
        ).select('-password -twoFactorSecret');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        await writeLog({
            actor: 'admin',
            type: 'Admin Action',
            severity: 'WARNING',
            action: 'admin.user_deactivated',
            description: `Admin deactivated account "${user.username || user.email}"`,
            ip: req.ip,
        });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/reactivate/:id', isAdmin, async (req, res) => {
    try {
        const user = await UsersModel.findByIdAndUpdate(
            req.params.id,
            { deactivated: false, deactivationRequested: false, deactivationRequestedAt: null },
            { new: true }
        ).select('-password -twoFactorSecret');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        await writeLog({
            actor: 'admin',
            type: 'Admin Action',
            severity: 'INFO',
            action: 'admin.user_reactivated',
            description: `Admin reactivated account "${user.username || user.email}"`,
            ip: req.ip,
        });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/reject-deactivation/:id', isAdmin, async (req, res) => {
    try {
        const user = await UsersModel.findByIdAndUpdate(
            req.params.id,
            { deactivationRequested: false, deactivationRequestedAt: null },
            { new: true }
        ).select('-password -twoFactorSecret');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/unlock/:id', isAdmin, async (req, res) => {
    try {
        const user = await UsersModel.findByIdAndUpdate(
            req.params.id,
            { loginAttempts: 0, lockedUntil: null },
            { new: true }
        ).select('-password -twoFactorSecret');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        await writeLog({
            actor: 'admin',
            type: 'Admin Action',
            severity: 'INFO',
            action: 'admin.user_unlocked',
            description: `Admin unlocked account "${user.username || user.email}"`,
            ip: req.ip,
        });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;
