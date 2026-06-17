import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Feedback from "../models/Feedback.js";
import { createAudit } from "../utils/activity.js";

export async function submitFeedback(req, res) {
  const appointment = await Appointment.findOne({
    _id: req.body.appointmentId,
    opdId: req.user.opdId,
    status: "completed"
  });
  if (!appointment) return res.status(404).json({ message: "Completed appointment not found." });

  const feedback = await Feedback.findOneAndUpdate(
    { appointment: appointment._id, patient: req.user._id },
    {
      appointment: appointment._id,
      doctor: appointment.doctor,
      patient: req.user._id,
      opdId: req.user.opdId,
      rating: Number(req.body.rating || 5),
      comments: req.body.comments || ""
    },
    { new: true, upsert: true, runValidators: true }
  );

  const ratings = await Feedback.find({ doctor: appointment.doctor });
  const average = ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length;
  await Doctor.findByIdAndUpdate(appointment.doctor, { rating: Math.round(average * 10) / 10 });
  await createAudit(req.user, "Patient submitted feedback", "feedback", feedback._id, `${feedback.rating}/5`);
  res.status(201).json(feedback);
}
