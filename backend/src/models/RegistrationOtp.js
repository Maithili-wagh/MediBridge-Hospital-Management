import mongoose from "mongoose";

const registrationOtpSchema =
  new mongoose.Schema(
    {
      email: String,

      role: String,

      otpHash: String,

      expiresAt: Date,

      used: {
        type: Boolean,
        default: false
      }
    },

    { timestamps: true }
  );

export default mongoose.model(
  "RegistrationOtp",
  registrationOtpSchema
);