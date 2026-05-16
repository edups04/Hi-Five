require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const UsersModel = require('./models/users');
const bcrypt = require('bcrypt');
const authRoute = require('./Routes/authRoute');
require('./config/passport');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const recordingsRouter = require('./Routes/recordings');
const adminRouter = require('./Routes/admin');
const { writeLog } = require('./middleware/auditLogger');
const speakeasy = require('speakeasy');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use('/api/recordings', recordingsRouter);
app.use('/auth', authRoute);
app.use('/admin', adminRouter);

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("Connected to MongoDB Atlas");
    await writeLog({
        actor: 'system',
        type: 'System',
        severity: 'INFO',
        action: 'app.startup',
        description: 'Hi-Five server started and connected to MongoDB',
    });
})
.catch(err => console.log(err));

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip;

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && email === adminUsername && password === adminPassword) {
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
            description: 'Admin logged in via login page',
            ip,
        });
        return res.json({ success: true, message: "Login successful", token, role: 'admin' });
    }

    UsersModel.findOne({ email })
    .then(user => {
        if (user) {
            bcrypt.compare(password, user.password, async (err, response) => {
                if (response) {
                    // Check 2FA before issuing JWT
                    if (user.twoFactorEnabled && user.twoFactorSecret) {
                        await writeLog({
                            actor: user.email,
                            actorId: user._id,
                            type: 'User Action',
                            severity: 'INFO',
                            action: 'user.login.2fa_required',
                            description: `User "${user.username || user.email}" passed password, 2FA required`,
                            ip,
                        });
                        return res.json({ success: true, requires2FA: true, userId: String(user._id) });
                    }

                    const token = jwt.sign(
                        { id: user._id, email: user.email },
                        process.env.SECRET_KEY,
                        { expiresIn: "7d" }
                    );
                    await writeLog({
                        actor: user.email,
                        actorId: user._id,
                        type: 'User Action',
                        severity: 'INFO',
                        action: 'user.login',
                        description: `User "${user.username || user.email}" logged in`,
                        ip,
                    });
                    res.json({ success: true, message: "Login successful", token });
                } else {
                    await writeLog({
                        actor: email,
                        type: 'Security',
                        severity: 'WARNING',
                        action: 'user.login.failed',
                        description: `Failed login attempt for email: "${email}"`,
                        ip,
                    });
                    res.json({ success: false, message: "The password is incorrect" });
                }
            });
        } else {
            writeLog({
                actor: email,
                type: 'Security',
                severity: 'WARNING',
                action: 'user.login.failed',
                description: `Login attempt for non-existent account: "${email}"`,
                ip,
            });
            res.json({ success: false, message: "Account not found" });
        }
    });
});

app.post('/signup', async (req, res) => {
    const { username, email, password, phone, twoFactorEnabled, twoFactorSecret } = req.body;
    const ip = req.ip;

    const passwordRules = [
        { test: (p) => p && p.length >= 8, msg: "Password must be at least 8 characters." },
        { test: (p) => /[A-Z]/.test(p), msg: "Password must contain at least one uppercase letter." },
        { test: (p) => /[a-z]/.test(p), msg: "Password must contain at least one lowercase letter." },
        { test: (p) => /[0-9]/.test(p), msg: "Password must contain at least one number." },
        { test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p), msg: "Password must contain at least one special character." },
    ];

    const failed = passwordRules.find(r => !r.test(password));
    if (failed) return res.status(400).json({ success: false, message: failed.msg });

    bcrypt.hash(password, 10)
    .then(hash => {
        UsersModel.create({
            username,
            email,
            password: hash,
            phone: phone || null,
            twoFactorEnabled: twoFactorEnabled || false,
            twoFactorSecret: twoFactorSecret || null,
        })
        .then(async user => {
            await writeLog({
                actor: email,
                actorId: user._id,
                type: 'User Action',
                severity: 'INFO',
                action: 'user.registered',
                description: `New user registered: "${username || email}" via email`,
                ip,
            });
            res.status(201).json({ success: true, message: "Account created", user });
        })
        .catch(err => res.status(400).json({ success: false, message: err.message }));
    })
    .catch(err => res.status(500).json({ success: false, message: err.message }));
});

app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const ip = req.ip;

    UsersModel.findOne({ email })
    .then(user => {
        if (!user) return res.send({ Status: "Account not found" });

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.SECRET_KEY, { expiresIn: "1h" });

        var transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
        });

        var mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the link to reset your password: ${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${user._id}/${token}`,
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Email send failed:', error);
                return res.status(500).send({ Status: "Failed to send email. Please try again later." });
            }
            await writeLog({
                actor: email,
                actorId: user._id,
                type: 'User Action',
                severity: 'INFO',
                action: 'user.password_reset_requested',
                description: `Password reset email sent to "${email}"`,
                ip,
            });
            return res.send({ Status: "Password reset email sent" });
        });
    })
    .catch(err => {
        console.error('forgot-password error:', err);
        res.status(500).send({ Status: "Server error" });
    });
});

app.post('/reset-password/:id/:token', (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) return res.json({ Status: "Error with token" });
        bcrypt.hash(password, 10)
        .then(hash => {
            UsersModel.findByIdAndUpdate({ _id: id }, { password: hash })
            .then(async u => {
                await writeLog({
                    actor: u?.email || id,
                    actorId: id,
                    type: 'User Action',
                    severity: 'INFO',
                    action: 'user.password_reset',
                    description: `User "${u?.email || id}" reset their password`,
                });
                res.send({ Status: "Success" });
            })
            .catch(err => res.send({ Status: err }));
        })
        .catch(err => res.send({ Status: err }));
    });
});

app.post('/update-password', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });

        const { currentPassword, newPassword } = req.body;
        try {
            const user = await UsersModel.findById(decoded.id);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if (!user.password) return res.status(400).json({ success: false, message: 'Cannot update password for Google accounts' });

            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

            const hash = await bcrypt.hash(newPassword, 10);
            await UsersModel.findByIdAndUpdate(decoded.id, { password: hash });

            await writeLog({
                actor: user.email,
                actorId: user._id,
                type: 'User Action',
                severity: 'INFO',
                action: 'user.password_updated',
                description: `User "${user.username || user.email}" updated their password`,
                ip: req.ip,
            });

            res.json({ success: true, message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

app.post('/update-profile', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });

        const { username, avatar, phone } = req.body;
        try {
            const updateFields = {};
            if (username && username.trim()) updateFields.username = username.trim();
            if (avatar) updateFields.avatar = avatar;
            if (phone) updateFields.phone = phone;

            const user = await UsersModel.findByIdAndUpdate(decoded.id, updateFields, { new: true }).select('-password');
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            await writeLog({
                actor: user.email,
                actorId: user._id,
                type: 'User Action',
                severity: 'INFO',
                action: 'user.profile_updated',
                description: `User "${user.username || user.email}" updated their profile`,
                ip: req.ip,
            });

            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

app.delete('/delete-account', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });

        try {
            const user = await UsersModel.findById(decoded.id);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            const Recording = require('./models/recording');
            const recordings = await Recording.find({ userId: decoded.id });

            const path = require('path');
            const fsp = require('fs').promises;
            for (const rec of recordings) {
                const filePath = path.join(process.env.UPLOAD_ROOT || path.join(__dirname, 'uploads'), String(decoded.id), `${String(rec._id)}.mp4`);
                await fsp.unlink(filePath).catch(() => {});
            }

            await Recording.deleteMany({ userId: decoded.id });
            await UsersModel.findByIdAndDelete(decoded.id);

            await writeLog({
                actor: user.email,
                actorId: user._id,
                type: 'User Action',
                severity: 'WARNING',
                action: 'user.account_deleted',
                description: `User "${user.username || user.email}" deleted their account`,
                ip: req.ip,
            });

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
});


app.post('/setup-2fa', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const secret = speakeasy.generateSecret({
        name: `HiFive (${email})`,
        issuer: 'HiFive',
        length: 20,
    });

    res.json({
        success: true,
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
    });
});

app.post('/verify-2fa-setup', async (req, res) => {
    const { token, secret } = req.body;
    if (!token || !secret) return res.status(400).json({ success: false, message: 'Token and secret required' });

    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1,
    });

    if (!verified) return res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });
    res.json({ success: true });
});

app.post('/verify-2fa-login', async (req, res) => {
    const { userId, token } = req.body;
    const ip = req.ip;

    if (!userId || !token) return res.status(400).json({ success: false, message: 'Missing fields' });

    try {
        const user = await UsersModel.findById(userId);
        if (!user || !user.twoFactorSecret) return res.status(404).json({ success: false, message: 'User not found' });

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!verified) {
            await writeLog({
                actor: user.email,
                actorId: user._id,
                type: 'Security',
                severity: 'WARNING',
                action: 'user.2fa.failed',
                description: `Failed 2FA attempt for "${user.email}"`,
                ip,
            });
            return res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });
        }

        const jwtToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.SECRET_KEY,
            { expiresIn: '7d' }
        );

        await writeLog({
            actor: user.email,
            actorId: user._id,
            type: 'User Action',
            severity: 'INFO',
            action: 'user.login',
            description: `User "${user.username || user.email}" logged in with 2FA`,
            ip,
        });

        res.json({ success: true, token: jwtToken });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});