import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["clinical", "pharmacy", "lab", "billing", "admin"],
      default: "clinical"
    },
    head: String,
    phone: String,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
