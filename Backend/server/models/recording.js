// backend/models/recording.js
//
// Schema for an ASL recording. The actual video file lives on disk at
// uploads/{userId}/{_id}.webm — this collection only stores metadata.
//
// Why we don't store the binary in MongoDB itself: Mongo has GridFS for
// blobs but it's slower than the filesystem for small files (<16MB) and
// makes streaming awkward. Filesystem + metadata is the standard pattern
// and easier to debug ("just look at the folder").

const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
    {
        // The owner of this recording. We never serve a recording to a user
        // whose JWT doesn't match this field.
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,    // makes "list my recordings" fast
        },

        // User-chosen name. Sanitized client-side before upload, but trust
        // nothing — we still cap length here.
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        // The raw recognized sentence at the moment Stop was pressed.
        // Stored separately so the Library can show "recording: HELLO WORLD"
        // even if the user named the file something else.
        sentence: {
            type: String,
            default: '',
            maxlength: 1000,
        },

        // File metadata. Helpful for the Library list and for debugging.
        sizeBytes: {
            type: Number,
            required: true,
            min: 0,
        },
        durationMs: {
            type: Number,
            default: 0,
            min: 0,
        },
        mimeType: {
            type: String,
            default: 'video/webm',
        },
    },
    {
        timestamps: true,   // adds createdAt and updatedAt automatically
    },
);

// Compound index so listing the current user's recordings, newest first, is fast.
recordingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Recording', recordingSchema);
