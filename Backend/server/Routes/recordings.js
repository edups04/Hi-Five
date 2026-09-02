const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { execFile } = require('child_process');
const { promisify } = require('util');
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');

const Recording = require('../models/recording');
const Comment = require('../models/Comment');
const UsersModel = require('../models/users');
const { isAuthenticated } = require('../middleware/isAuthenticated');
const { writeLog } = require('../middleware/auditLogger');

const ffmpegStatic = require('ffmpeg-static');

const execFileAsync = promisify(execFile);
const router = express.Router();

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '..', 'uploads');
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const ALLOWED_MIME = new Set([
    'video/webm',
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
]);

function isAllowedMime(mimeType) {
    if (!mimeType) return false;
    const base = mimeType.split(';')[0].trim().toLowerCase();
    if (base === 'video/webm') return true;
    return ALLOWED_MIME.has(mimeType.toLowerCase());
}

function isLikelyVideoUpload(file) {
    if (isAllowedMime(file.mimetype)) return true;
    const name = (file.originalname || '').toLowerCase();
    return name.endsWith('.webm') || name.endsWith('.mp4');
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (_req, file, cb) => {
        if (isLikelyVideoUpload(file)) return cb(null, true);
        cb(new Error(`Unsupported file: ${file.mimetype} (${file.originalname})`));
    },
});

async function ensureUserDir(userId) {
    const dir = path.join(UPLOAD_ROOT, String(userId));
    await fsp.mkdir(dir, { recursive: true });
    return dir;
}

function recordingFilePath(userId, recordingId) {
    return path.join(UPLOAD_ROOT, String(userId), `${String(recordingId)}.mp4`);
}

async function convertToMp4(inputPath, outputPath) {
    const ffmpegPath = ffmpegStatic || process.env.FFMPEG_PATH || 'ffmpeg';
    await execFileAsync(ffmpegPath, [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath,
    ]);
}

function serializeRecording(r) {
    return {
        id: String(r._id),
        name: r.name,
        sentence: r.sentence || '',
        sizeBytes: r.sizeBytes,
        durationMs: r.durationMs,
        mimeType: r.mimeType,
        isPublic: r.isPublic || false,
        views: r.views || 0,
        likes: (r.likes || []).map(String),
        description: r.description || '',
        tags: r.tags || [],
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}

async function findOwned(id, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const recording = await Recording.findById(id);
    if (!recording) return null;
    if (String(recording.userId) !== String(userId)) return null;
    return recording;
}

router.post(
    '/',
    isAuthenticated,
    (req, res, next) => {
        upload.single('video')(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ success: false, message: `File too large. Max ${MAX_UPLOAD_BYTES} bytes.` });
                }
                return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
            }
            next();
        });
    },
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "Missing 'video' file field" });
            }
            const name = (req.body.name || '').trim();
            if (!name) {
                return res.status(400).json({ success: false, message: "Missing 'name' field" });
            }
            const sentence = (req.body.sentence || '').slice(0, 1000);
            const durationMs = Math.max(0, parseInt(req.body.durationMs, 10) || 0);

            const recordingId = new mongoose.Types.ObjectId();
            const dir = await ensureUserDir(req.userId);

            const webmPath = path.join(dir, `${String(recordingId)}.webm`);
            const mp4Path = path.join(dir, `${String(recordingId)}.mp4`);

            await fsp.writeFile(webmPath, req.file.buffer);

            try {
                await convertToMp4(webmPath, mp4Path);
                await fsp.unlink(webmPath).catch(() => {});
            } catch (ffmpegErr) {
                console.error('[recordings] ffmpeg conversion failed, keeping webm:', ffmpegErr.message);
                await fsp.rename(webmPath, mp4Path).catch(() => {});
            }

            let mp4Size = req.file.size;
            try {
                const stat = await fsp.stat(mp4Path);
                mp4Size = stat.size;
            } catch {}

            let recording;
            try {
                recording = await Recording.create({
                    _id: recordingId,
                    userId: req.userId,
                    name: name.slice(0, 200),
                    sentence,
                    sizeBytes: mp4Size,
                    durationMs,
                    mimeType: 'video/mp4',
                });
            } catch (dbErr) {
                fsp.unlink(mp4Path).catch(() => {});
                throw dbErr;
            }

            await writeLog({
                actor: req.user?.email || String(req.userId),
                actorId: req.userId,
                type: 'User Action',
                severity: 'INFO',
                action: 'recording.created',
                description: `User created recording "${name}" (${Math.round(durationMs / 1000)}s)`,
                metadata: { recordingId: String(recordingId), name, durationMs, sizeBytes: mp4Size },
                ip: req.ip,
            });

            return res.status(201).json({ success: true, recording: serializeRecording(recording) });
        } catch (error) {
            console.error('[recordings] POST failed:', error);
            return res.status(500).json({ success: false, message: error.message || 'Server error' });
        }
    },
);

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const recordings = await Recording.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, recordings: recordings.map(serializeRecording) });
    } catch (error) {
        console.error('[recordings] GET list failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.get('/feed', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const skip = (page - 1) * limit;

        const recordings = await Recording.find({ isPublic: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Recording.countDocuments({ isPublic: true });

        const userIds = [...new Set(recordings.map(r => String(r.userId)))];
        const users = await UsersModel.find({ _id: { $in: userIds } }).select('username avatar picture email').lean();
        const userMap = {};
        users.forEach(u => { userMap[String(u._id)] = u; });

        const serialized = recordings.map(r => {
            const uploader = userMap[String(r.userId)] || {};
            return {
                ...serializeRecording(r),
                userId: String(r.userId),
                uploader: {
                    id: String(r.userId),
                    username: uploader.username || uploader.email?.split('@')[0] || 'Unknown',
                    avatar: uploader.avatar || uploader.picture || null,
                },
            };
        });

        return res.json({ success: true, recordings: serialized, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('[recordings] GET feed failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.get('/:id/video', (req, res, next) => {
    if (req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
}, isAuthenticated, async (req, res) => {
    try {
        const recording = await Recording.findById(req.params.id);
        if (!recording) return res.status(404).json({ success: false, message: 'Not found' });

        const isOwner = String(recording.userId) === String(req.userId);
        if (!isOwner && !recording.isPublic) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const filePath = recordingFilePath(recording.userId, recording._id);
        let stat;
        try {
            stat = await fsp.stat(filePath);
        } catch {
            return res.status(404).json({ success: false, message: 'Recording file is missing on disk' });
        }

        const fileSize = stat.size;
        const isDownload = req.query.download === 'true';
        const mimeType = 'video/mp4';
        const filename = `${recording.name.replace(/[^a-z0-9_\-\s]/gi, '_')}.mp4`;

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=3600');

        if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }

        const range = req.headers.range;
        if (range) {
            const match = /bytes=(\d+)-(\d+)?/.exec(range);
            if (!match) {
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.status(416).end();
            }
            const start = parseInt(match[1], 10);
            const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
            if (start >= fileSize || end >= fileSize || start > end) {
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.status(416).end();
            }
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', String(end - start + 1));
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.setHeader('Content-Length', String(fileSize));
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('[recordings] GET video failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        const recording = await Recording.findById(req.params.id).lean();
        if (!recording) return res.status(404).json({ success: false, message: 'Not found' });

        const isOwner = String(recording.userId) === String(req.userId);
        if (!isOwner && !recording.isPublic) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const uploader = await UsersModel.findById(recording.userId).select('username avatar picture email').lean();

        return res.json({
            success: true,
            recording: {
                ...serializeRecording(recording),
                userId: String(recording.userId),
                uploader: {
                    id: String(recording.userId),
                    username: uploader?.username || uploader?.email?.split('@')[0] || 'Unknown',
                    avatar: uploader?.avatar || uploader?.picture || null,
                },
            },
        });
    } catch (error) {
        console.error('[recordings] GET single failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.post('/:id/publish', isAuthenticated, async (req, res) => {
    try {
        const recording = await findOwned(req.params.id, req.userId);
        if (!recording) return res.status(404).json({ success: false, message: 'Not found' });

        const description = (req.body.description || '').slice(0, 2000);
        const tags = (req.body.tags || []).slice(0, 10).map(t => String(t).slice(0, 50));

        recording.isPublic = true;
        recording.description = description;
        recording.tags = tags;
        await recording.save();

        await writeLog({
            actor: req.user?.email || String(req.userId),
            actorId: req.userId,
            type: 'User Action',
            severity: 'INFO',
            action: 'recording.published',
            description: `User published recording "${recording.name}"`,
            ip: req.ip,
        });

        return res.json({ success: true, recording: serializeRecording(recording) });
    } catch (error) {
        console.error('[recordings] publish failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.post('/:id/unpublish', isAuthenticated, async (req, res) => {
    try {
        const recording = await findOwned(req.params.id, req.userId);
        if (!recording) return res.status(404).json({ success: false, message: 'Not found' });

        recording.isPublic = false;
        await recording.save();

        return res.json({ success: true, recording: serializeRecording(recording) });
    } catch (error) {
        console.error('[recordings] unpublish failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.post('/:id/like', isAuthenticated, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        const recording = await Recording.findById(req.params.id);
        if (!recording || !recording.isPublic) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const userId = req.userId;
        const alreadyLiked = recording.likes.some(id => String(id) === String(userId));

        if (alreadyLiked) {
            recording.likes = recording.likes.filter(id => String(id) !== String(userId));
        } else {
            recording.likes.push(userId);
        }
        await recording.save();

        return res.json({ success: true, likes: recording.likes.length, liked: !alreadyLiked });
    } catch (error) {
        console.error('[recordings] like failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.post('/:id/view', isAuthenticated, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        await Recording.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.get('/:id/comments', isAuthenticated, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const comments = await Comment.find({ recordingId: req.params.id })
            .sort({ createdAt: -1 })
            .lean();

        const userIds = [...new Set(comments.map(c => String(c.userId)))];
        const users = await UsersModel.find({ _id: { $in: userIds } }).select('username avatar picture email').lean();
        const userMap = {};
        users.forEach(u => { userMap[String(u._id)] = u; });

        const serialized = comments.map(c => {
            const user = userMap[String(c.userId)] || {};
            return {
                id: String(c._id),
                text: c.text,
                likes: (c.likes || []).map(String),
                createdAt: c.createdAt,
                user: {
                    id: String(c.userId),
                    username: user.username || user.email?.split('@')[0] || 'Unknown',
                    avatar: user.avatar || user.picture || null,
                },
            };
        });

        return res.json({ success: true, comments: serialized });
    } catch (error) {
        console.error('[recordings] GET comments failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.post('/:id/comments', isAuthenticated, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        const text = (req.body.text || '').trim();
        if (!text) return res.status(400).json({ success: false, message: 'Comment text is required' });
        if (text.length > 1000) return res.status(400).json({ success: false, message: 'Comment too long' });

        const recording = await Recording.findById(req.params.id);
        if (!recording || !recording.isPublic) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const comment = await Comment.create({
            recordingId: req.params.id,
            userId: req.userId,
            text,
        });

        const user = await UsersModel.findById(req.userId).select('username avatar picture email').lean();

        return res.status(201).json({
            success: true,
            comment: {
                id: String(comment._id),
                text: comment.text,
                likes: [],
                createdAt: comment.createdAt,
                user: {
                    id: String(req.userId),
                    username: user?.username || user?.email?.split('@')[0] || 'Unknown',
                    avatar: user?.avatar || user?.picture || null,
                },
            },
        });
    } catch (error) {
        console.error('[recordings] POST comment failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.post('/:id/comments/:commentId/like', isAuthenticated, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const comment = await Comment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Not found' });

        const userId = req.userId;
        const alreadyLiked = comment.likes.some(id => String(id) === String(userId));

        if (alreadyLiked) {
            comment.likes = comment.likes.filter(id => String(id) !== String(userId));
        } else {
            comment.likes.push(userId);
        }
        await comment.save();

        return res.json({ success: true, likes: comment.likes.length, liked: !alreadyLiked });
    } catch (error) {
        console.error('[recordings] comment like failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.patch('/:id', isAuthenticated, async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ success: false, message: "Missing or empty 'name'" });
        }
        const recording = await findOwned(req.params.id, req.userId);
        if (!recording) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        recording.name = name.slice(0, 200);
        await recording.save();
        return res.json({ success: true, recording: serializeRecording(recording) });
    } catch (error) {
        console.error('[recordings] PATCH failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const recording = await findOwned(req.params.id, req.userId);
        if (!recording) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const filePath = recordingFilePath(recording.userId, recording._id);
        const recordingName = recording.name;

        await Comment.deleteMany({ recordingId: recording._id });
        await Recording.deleteOne({ _id: recording._id });

        fsp.unlink(filePath).catch((err) => {
            if (err.code !== 'ENOENT') {
                console.warn(`[recordings] failed to unlink ${filePath}:`, err);
            }
        });

        await writeLog({
            actor: req.user?.email || String(req.userId),
            actorId: req.userId,
            type: 'User Action',
            severity: 'INFO',
            action: 'recording.deleted',
            description: `User deleted recording "${recordingName}"`,
            metadata: { recordingId: req.params.id, name: recordingName },
            ip: req.ip,
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('[recordings] DELETE failed:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

module.exports = router;