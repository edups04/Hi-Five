// backend/routes/recordings.js
//
// REST endpoints for recordings. All require a valid JWT via the existing
// `isAuthenticated` middleware (req.userId is populated after auth).
//
// Endpoints:
//   POST   /api/recordings          upload a WebM with metadata
//   GET    /api/recordings          list current user's recordings
//   GET    /api/recordings/:id/video    stream the video file
//   PATCH  /api/recordings/:id      rename
//   DELETE /api/recordings/:id      delete (DB row + file)
//
// File layout on disk:
//   <UPLOAD_ROOT>/<userId>/<recordingId>.webm
//
// The DB document _id is the canonical identifier — the on-disk filename
// uses that same _id so DB rows and files stay in 1:1 correspondence.

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');

const Recording = require('../models/recording');
const { isAuthenticated } = require('../middleware/isAuthenticated');

const router = express.Router();

// ----- Storage config ------------------------------------------------------
// UPLOAD_ROOT is configurable via env so production deployments can mount
// a persistent volume. Defaults to <project-root>/uploads.
const UPLOAD_ROOT = process.env.UPLOAD_ROOT
    || path.join(__dirname, '..', 'uploads');

// Limits. 100MB is plenty for ~5 minutes of 720p WebM at our settings.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// Allowed MIME types we'll accept from clients. WebM is what the browser
// records; we list a couple of variants because some browsers report
// the codec specifier and others don't.
const ALLOWED_MIME = new Set([
    'video/webm',
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
]);

function isAllowedMime(mimeType) {
    if (!mimeType) return false;
    // Some clients send mime with extra params like "; charset=..." — just
    // compare on the base type to be permissive.
    const base = mimeType.split(';')[0].trim().toLowerCase();
    if (base === 'video/webm') return true;
    return ALLOWED_MIME.has(mimeType.toLowerCase());
}

// Some browsers (Chromium quirks) send `text/plain` for the multipart part
// when the source Blob has an empty `.type`. Accept on filename extension
// as a fallback so users don't lose recordings to a misreported MIME.
function isLikelyVideoUpload(file) {
    if (isAllowedMime(file.mimetype)) return true;
    const name = (file.originalname || '').toLowerCase();
    return name.endsWith('.webm') || name.endsWith('.mp4');
}

// We use multer's memoryStorage rather than diskStorage because we need the
// final on-disk filename to be the new document's _id, and we can't know
// that until *after* multer has saved the file (chicken-and-egg). Memory
// storage lets us mint the _id, write the buffer, and create the doc atomically.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (_req, file, cb) => {
        if (isLikelyVideoUpload(file)) {
            return cb(null, true);
        }
        cb(new Error(`Unsupported file: ${file.mimetype} (${file.originalname})`));
    },
});

async function ensureUserDir(userId) {
    const dir = path.join(UPLOAD_ROOT, String(userId));
    await fsp.mkdir(dir, { recursive: true });
    return dir;
}

function recordingFilePath(userId, recordingId) {
    return path.join(UPLOAD_ROOT, String(userId), `${String(recordingId)}.webm`);
}

// ----- POST /api/recordings -------------------------------------------------
// multipart/form-data fields:
//   video       (file, required)        — the WebM blob
//   name        (string, required)      — user-chosen name
//   sentence    (string, optional)      — recognized text from the session
//   durationMs  (string number, opt.)   — duration in ms (form fields are strings)
router.post(
    '/',
    isAuthenticated,
    (req, res, next) => {
        // Wrap multer so we can return JSON errors with a consistent shape
        // (multer's default Multer-error responses are plain text otherwise).
        upload.single('video')(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        success: false,
                        message: `File too large. Max ${MAX_UPLOAD_BYTES} bytes.`,
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: err.message || 'Upload failed',
                });
            }
            next();
        });
    },
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Missing 'video' file field",
                });
            }
            const name = (req.body.name || '').trim();
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Missing 'name' field",
                });
            }
            const sentence = (req.body.sentence || '').slice(0, 1000);
            const durationMs = Math.max(0, parseInt(req.body.durationMs, 10) || 0);

            // Mint the _id ourselves so we can name the file after it BEFORE
            // we save the DB row. If the file write fails, we never created
            // a DB row, so there's nothing to clean up.
            const recordingId = new mongoose.Types.ObjectId();
            const dir = await ensureUserDir(req.userId);
            const filePath = path.join(dir, `${String(recordingId)}.webm`);

            // Write file first.
            await fsp.writeFile(filePath, req.file.buffer);

            // Then create the DB row. If THIS fails, we DO have an orphan
            // file — clean it up.
            let recording;
            try {
                recording = await Recording.create({
                    _id: recordingId,
                    userId: req.userId,
                    name: name.slice(0, 200),
                    sentence,
                    sizeBytes: req.file.size,
                    durationMs,
                    mimeType: req.file.mimetype,
                });
            } catch (dbErr) {
                // Best-effort cleanup. If this also fails (e.g. disk error),
                // we just log — the original error is what matters.
                fsp.unlink(filePath).catch(() => {});
                throw dbErr;
            }

            return res.status(201).json({
                success: true,
                recording: serializeRecording(recording),
            });
        } catch (error) {
            console.error('[recordings] POST failed:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Server error',
            });
        }
    },
);

// ----- GET /api/recordings --------------------------------------------------
// Returns the current user's recordings, newest first.
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const recordings = await Recording.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .lean();
        return res.json({
            success: true,
            recordings: recordings.map(serializeRecording),
        });
    } catch (error) {
        console.error('[recordings] GET list failed:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
});

// ----- GET /api/recordings/:id/video ---------------------------------------
// Streams the video file. Supports HTTP Range requests so the browser can
// scrub through long recordings without downloading the whole thing first.
router.get('/:id/video', isAuthenticated, async (req, res) => {
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
            return res.status(404).json({
                success: false,
                message: 'Recording file is missing on disk',
            });
        }

        const fileSize = stat.size;
        const range = req.headers.range;

        // Common headers for both range and full responses.
        res.setHeader('Content-Type', recording.mimeType || 'video/webm');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=3600');

        if (range) {
            // Parse "bytes=START-END" range header. END is optional.
            const match = /bytes=(\d+)-(\d+)?/.exec(range);
            if (!match) {
                return res.status(416).json({
                    success: false,
                    message: 'Invalid Range header',
                });
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
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
});

// ----- PATCH /api/recordings/:id -------------------------------------------
// Rename. Only the `name` field is editable for now.
router.patch('/:id', isAuthenticated, async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Missing or empty 'name'",
            });
        }
        const recording = await findOwned(req.params.id, req.userId);
        if (!recording) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        recording.name = name.slice(0, 200);
        await recording.save();
        return res.json({
            success: true,
            recording: serializeRecording(recording),
        });
    } catch (error) {
        console.error('[recordings] PATCH failed:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
});

// ----- DELETE /api/recordings/:id ------------------------------------------
// Removes the DB row AND the file on disk. We delete the DB row first so
// even if the file unlink fails the user's list reflects the deletion;
// the orphan file can be cleaned up by a maintenance script later.
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const recording = await findOwned(req.params.id, req.userId);
        if (!recording) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const filePath = recordingFilePath(recording.userId, recording._id);
        await Recording.deleteOne({ _id: recording._id });
        // Best-effort file delete. Don't fail the request if the file is
        // already missing — the DB row is what the user sees.
        fsp.unlink(filePath).catch((err) => {
            if (err.code !== 'ENOENT') {
                console.warn(`[recordings] failed to unlink ${filePath}:`, err);
            }
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('[recordings] DELETE failed:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
});

// ----- Helpers --------------------------------------------------------------

// Find a recording AND verify it belongs to the requesting user. Returns
// null if the id is malformed, the document doesn't exist, or it belongs
// to someone else. The "belongs to someone else" case must NOT leak that
// information — we treat it the same as 404.
async function findOwned(id, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const recording = await Recording.findById(id);
    if (!recording) return null;
    if (String(recording.userId) !== String(userId)) return null;
    return recording;
}

// Shape the public response. We return `id` (not `_id`) and never include
// internal fields the client doesn't need.
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