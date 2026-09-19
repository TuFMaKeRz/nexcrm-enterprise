const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  organizationId,
  userId = null,
  userName = 'System',
  userEmail = '',
  action,
  entity,
  entityId = '',
  details = {},
  req = null
}) => {
  try {
    let ipAddress = '';
    let userAgent = '';

    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
      userAgent = req.headers['user-agent'] || '';
      if (!userId && req.user) {
        userId = req.user._id;
        userName = req.user.fullName || `${req.user.firstName} ${req.user.lastName}`;
        userEmail = req.user.email;
      }
      if (!organizationId && req.organizationId) {
        organizationId = req.organizationId;
      }
    }

    if (!organizationId) {
      return null;
    }

    return await AuditLog.create({
      organizationId,
      userId,
      userName,
      userEmail,
      action,
      entity,
      entityId: String(entityId),
      details,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('⚠️ Failed to write audit log:', error.message);
    return null;
  }
};

module.exports = {
  logAudit
};
