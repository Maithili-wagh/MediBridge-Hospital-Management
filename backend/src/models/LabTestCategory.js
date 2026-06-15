import mongoose from "mongoose";

const labTestCategorySchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    testName: { type: String, required: true },
    price: { type: Number, default: 0 },
    sampleType: { type: String, default: "Blood" },
    normalRange: String,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

labTestCategorySchema.index({ category: 1, testName: 1 }, { unique: true });

export default mongoose.model("LabTestCategory", labTestCategorySchema);
