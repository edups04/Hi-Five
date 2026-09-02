const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        recordingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recording',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        likes: {
            type: [mongoose.Schema.Types.ObjectId],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);

commentSchema.index({ recordingId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
