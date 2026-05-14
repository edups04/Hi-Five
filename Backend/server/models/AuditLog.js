const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: String,
            required: true,
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        type: {
            type: String,
            enum: ['Security', 'API', 'User Action', 'System'],
            required: true,
        },
        severity: {
            type: String,
            enum: ['CRITICAL', 'WARNING', 'INFO'],
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ip: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ type: 1 });
auditLogSchema.index({ severity: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
