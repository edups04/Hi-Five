const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,    
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        sentence: {
            type: String,
            default: '',
            maxlength: 1000,
        },

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
        timestamps: true,   
    },
);

recordingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Recording', recordingSchema);
