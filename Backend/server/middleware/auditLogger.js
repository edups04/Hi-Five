const AuditLog = require('../models/AuditLog');

async function writeLog({ actor, actorId, type, severity, action, description, metadata, ip }) {
    try {
        await AuditLog.create({
            actor: actor || 'system',
            actorId: actorId || null,
            type,
            severity,
            action,
            description,
            metadata: metadata || {},
            ip: ip || null,
        });
    } catch (err) {
        console.error('[audit] Failed to write log:', err.message);
    }
}

module.exports = { writeLog };
