import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    opdId: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    comments: String
  },
  { timestamps: true }
);

feedbackSchema.index({ appointment: 1, patient: 1 }, { unique: true });

export default mongoose.model("Feedback", feedbackSchema);
