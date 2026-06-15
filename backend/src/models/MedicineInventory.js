import mongoose from "mongoose";

const medicineInventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "General" },
    batchNo: String,
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    expiryDate: String,
    supplier: String,
    status: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock"
    }
  },
  { timestamps: true }
);

export default mongoose.model("MedicineInventory", medicineInventorySchema);
