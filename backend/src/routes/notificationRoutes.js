import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  const notifications = await Notification.find({
    $or: [{ user: req.user._id }, { role: req.user.role, user: { $exists: false } }]
  }).sort({ createdAt: -1 }).limit(30);
  res.json(notifications);
});

router.patch("/:id/read", protect, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ user: req.user._id }, { role: req.user.role }] },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found." });
  res.json(notification);
});

export default router;
