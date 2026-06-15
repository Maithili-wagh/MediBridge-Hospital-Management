import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    phone: String,

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        "patient",
        "doctor",
        "pharmacist",
        "lab_technician",
        "admin",
      ],
      required: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },

    opdId: String,

    approvalStatus: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
      default: "approved",
    },

    approvedAt: Date,

    // EMAIL OTP FIELDS
    otp: String,

    otpExpires: Date,

    otpAttempts: {
      type: Number,
      default: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },

  { timestamps: true }
);

export default mongoose.model(
  "User",
  userSchema
);
