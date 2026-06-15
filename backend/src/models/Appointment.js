import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    opdId: { type: String, required: true },
    patientName: { type: String, required: true },
    patientEmail: String,
    patientPhone: String,
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    fee: Number,
    reason: String,
    status: {
      type: String,
      enum: ["booked", "confirmed", "in_consultation", "completed", "cancelled"],
      default: "booked"
    },
    prescription: String,
    medicines: [String],
    medicineStatus: {
      type: String,
      enum: ["pending", "given"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
