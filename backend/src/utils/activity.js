import AuditLog from "../models/AuditLog.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export async function createAudit(user, action, module, refId, details = "") {
  return AuditLog.create({
    actor: user?._id,
    actorName: user?.name,
    actorRole: user?.role,
    action,
    module,
    refId: refId ? String(refId) : undefined,
    details
  });
}

export async function notifyUsers(filter, payload) {
  const users = await User.find(filter).select("_id role");
  if (!users.length) return [];
  return Notification.insertMany(users.map((user) => ({
    user: user._id,
    role: user.role,
    ...payload
  })));
}

export async function notifyOne(userId, payload) {
  if (!userId) return null;
  return Notification.create({ user: userId, ...payload });
}
