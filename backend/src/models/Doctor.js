import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    specialty: String,
    degree: String,
    hospital: String,
    city: String,
    experience: Number,
    fee: Number,
    rating: Number,
    status: { type: String, default: "available" },
    bio: String
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);
