import mongoose from "mongoose";

const labResultSchema = new mongoose.Schema(
  {
    parameter: String,
    value: String,
    unit: String,
    status: String
  },
  { _id: false }
);

const labRequestSchema = new mongoose.Schema(
  {
    opdId: { type: String, required: true },
    patientName: { type: String, required: true },
    patientEmail: String,
    patientPhone: String,
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    test: { type: mongoose.Schema.Types.ObjectId, ref: "LabTestCategory", required: true },
    testName: { type: String, required: true },
    category: String,
    price: { type: Number, default: 0 },
    bookingDate: String,
    sampleCollectedAt: Date,
    processedAt: Date,
    reviewedAt: Date,
    reportUrl: String,
    reportFileName: String,
    reportMimeType: String,
    reportData: String,
    remarks: String,
    results: [labResultSchema],
    status: {
      type: String,
      enum: ["requested", "booked", "sample_collected", "processing", "reported", "reviewed"],
      default: "requested"
    },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model("LabRequest", labRequestSchema);
