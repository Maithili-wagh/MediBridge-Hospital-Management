import Appointment from "../models/Appointment.js";
import MedicineOrder from "../models/MedicineOrder.js";
import MedicineInventory from "../models/MedicineInventory.js";
import { createAudit, notifyUsers } from "../utils/activity.js";

function stockStatus(quantity) {
  return quantity <= 0 ? "out_of_stock" : quantity <= 10 ? "low_stock" : "in_stock";
}

async function sendLowStockAlert(medicine) {
  if (medicine.status === "low_stock" || medicine.status === "out_of_stock") {
    await notifyUsers({ role: "pharmacist", approvalStatus: "approved" }, {
      title: "Low stock alert",
      message: `${medicine.name} stock below 10 units.`,
      module: "pharmacy",
      refId: medicine._id
    });
  }
}

export async function getPatientPrescriptions(req, res) {
  const appointments = await Appointment.find({ opdId: req.params.opdId, medicines: { $exists: true, $ne: [] } })
    .populate("doctor")
    .sort({ createdAt: -1 });
  res.json(appointments.map((appointment) => ({
    ...appointment.toObject(),
    status: appointment.medicineStatus || "pending"
  })));
}

export async function createMedicineOrder(req, res) {
  const target = await Appointment.findOne({ _id: req.body.appointmentId, opdId: req.body.opdId });
  if (!target) return res.status(404).json({ message: "Prescription appointment not found." });
  if (target.medicineStatus === "given") {
    return res.status(409).json({ message: "Medicine has already been given for this prescription." });
  }

  const order = await MedicineOrder.create({ ...req.body, status: "given" });
  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.body.appointmentId, opdId: req.body.opdId },
    { medicineStatus: "given" },
    { new: true }
  ).populate("doctor");

  await Promise.all([
    notifyUsers({ email: target.patientEmail }, {
      title: "Medicine dispensed",
      message: `Medicines dispensed for ${target.opdId}.`,
      module: "pharmacy",
      refId: order._id
    }),
    createAudit(req.user, "Pharmacy dispensed medicine", "pharmacy", order._id, target.opdId)
  ]);

  res.status(201).json({
    order,
    appointment: appointment ? { ...appointment.toObject(), status: appointment.medicineStatus } : null
  });
}

export async function getMedicineOrders(_req, res) {
  res.json(await MedicineOrder.find().sort({ createdAt: -1 }));
}

export async function getInventory(_req, res) {
  res.json(await MedicineInventory.find().sort({ name: 1 }));
}

export async function createInventoryItem(req, res) {
  const quantity = Number(req.body.quantity || 0);
  const medicine = await MedicineInventory.create({
    ...req.body,
    quantity,
    unitPrice: Number(req.body.unitPrice || 0),
    status: stockStatus(quantity)
  });
  await sendLowStockAlert(medicine);
  res.status(201).json(medicine);
}

export async function updateInventoryItem(req, res) {
  const quantity = Number(req.body.quantity || 0);
  const medicine = await MedicineInventory.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      quantity,
      unitPrice: Number(req.body.unitPrice || 0),
      status: stockStatus(quantity)
    },
    { new: true }
  );
  if (!medicine) return res.status(404).json({ message: "Medicine not found." });
  await sendLowStockAlert(medicine);
  res.json(medicine);
}
