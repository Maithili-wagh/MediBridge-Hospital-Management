import mongoose from "mongoose";

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true
    },
    startTime: String,
    endTime: String,
    off: { type: Boolean, default: false }
  },
  { timestamps: true }
);

doctorAvailabilitySchema.index({ doctor: 1, day: 1 }, { unique: true });

export default mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
