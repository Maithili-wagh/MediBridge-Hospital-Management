import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorRole: String,
    action: { type: String, required: true },
    module: String,
    refId: String,
    details: String
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
