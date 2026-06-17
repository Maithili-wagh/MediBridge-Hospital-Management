import Notification from "../models/Notification.js";

export async function getNotifications(req, res) {
  const notifications = await Notification.find({
    $or: [{ user: req.user._id }, { role: req.user.role, user: { $exists: false } }]
  }).sort({ createdAt: -1 }).limit(30);
  res.json(notifications);
}

export async function markNotificationRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ user: req.user._id }, { role: req.user.role }] },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found." });
  res.json(notification);
}
