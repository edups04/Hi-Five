const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { execFile } = require('child_process');
const { promisify } = require('util');
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');

const Recording = require('../models/recording');
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

router.get('/:id/video', (req, res, next) => {
    if (req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
}, isAuthenticated, async (req, res) => {
    try {
        const recording = await findOwned(req.params.id, req.userId);
        if (!recording) {
            return res.status(404).json({ success: false, message: 'Not found' });
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

async function findOwned(id, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const recording = await Recording.findById(id);
    if (!recording) return null;
    if (String(recording.userId) !== String(userId)) return null;
    return recording;
}

function serializeRecording(r) {
    return {
        id: String(r._id),
        name: r.name,
        sentence: r.sentence || '',
        sizeBytes: r.sizeBytes,
        durationMs: r.durationMs,
        mimeType: r.mimeType,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}

module.exports = router;