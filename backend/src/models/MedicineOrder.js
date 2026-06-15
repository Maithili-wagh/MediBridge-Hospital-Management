import mongoose from "mongoose";

const medicineOrderSchema = new mongoose.Schema(
  {
    opdId: { type: String, required: true },
    patientName: String,
    medicines: [String],
    amount: Number,
    status: { type: String, enum: ["pending", "packed", "delivered", "given"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.model("MedicineOrder", medicineOrderSchema);
