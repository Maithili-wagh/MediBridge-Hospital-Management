import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import MedicineOrder from "../models/MedicineOrder.js";
import MedicineInventory from "../models/MedicineInventory.js";
import Department from "../models/Department.js";
import LabTestCategory from "../models/LabTestCategory.js";
import LabRequest from "../models/LabRequest.js";
import AuditLog from "../models/AuditLog.js";
import Feedback from "../models/Feedback.js";
import { createAudit, notifyOne } from "../utils/activity.js";

const defaultLabTests = [
  ["Blood Tests", "CBC", 450, "Blood", "Normal"],
  ["Blood Tests", "Sugar", 180, "Blood", "70-140 mg/dL"],
  ["Blood Tests", "Lipid Profile", 900, "Blood", "Normal"],
  ["Radiology", "X-Ray", 700, "Imaging", "Normal"],
  ["Radiology", "MRI", 4500, "Imaging", "Normal"],
  ["Radiology", "CT Scan", 3500, "Imaging", "Normal"],
  ["Cardiology", "ECG", 500, "Cardiac", "Normal"],
  ["Cardiology", "Echo", 1800, "Cardiac", "Normal"],
  ["Pathology", "Urine Test", 250, "Urine", "Normal"],
  ["Pathology", "Stool Test", 300, "Stool", "Normal"]
];

async function ensureDefaultLabTests() {
  const count = await LabTestCategory.countDocuments();
  if (count) return;
  await LabTestCategory.insertMany(defaultLabTests.map(([category, testName, price, sampleType, normalRange]) => ({
    category,
    testName,
    price,
    sampleType,
    normalRange
  })));
}

export async function getDashboard(_req, res) {
  await ensureDefaultLabTests();
  const [appointments, doctors, patients, pharmacists, labTechnicians, admins, orders, inventory, departments, labTests, labRequests, doctorUsers, auditLogs, feedbacks] = await Promise.all([
    Appointment.find().populate("doctor").sort({ date: -1 }),
    Doctor.find().sort({ createdAt: -1 }),
    User.find({ role: "patient" }).select("-password"),
    User.find({ role: "pharmacist" }).select("-password"),
    User.find({ role: "lab_technician" }).select("-password"),
    User.find({ role: "admin" }).select("-password"),
    MedicineOrder.find().sort({ createdAt: -1 }),
    MedicineInventory.find().sort({ name: 1 }),
    Department.find().sort({ name: 1 }),
    LabTestCategory.find().sort({ category: 1, testName: 1 }),
    LabRequest.find().populate(["doctor", "test", "technician"]).sort({ createdAt: -1 }),
    User.find({ role: "doctor" }).select("-password").populate("doctorId"),
    AuditLog.find().sort({ createdAt: -1 }).limit(80),
    Feedback.find().populate("doctor").sort({ createdAt: -1 })
  ]);

  const completed = appointments.filter((item) => item.status === "completed");
  const consultationRevenue = completed.reduce((sum, item) => sum + (item.fee || 0), 0);
  const pharmacyRevenue = orders.reduce((sum, item) => sum + (item.amount || 0), 0);
  const labRevenue = labRequests.reduce((sum, item) => sum + (item.price || 0), 0);
  const monthKey = (date) => String(date || "").slice(0, 7) || "Unknown";
  const groupCount = (items, getKey) => items.reduce((acc, item) => {
    const key = getKey(item) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const groupSum = (items, getKey, getValue) => items.reduce((acc, item) => {
    const key = getKey(item) || "Unknown";
    acc[key] = (acc[key] || 0) + Number(getValue(item) || 0);
    return acc;
  }, {});
  const doctorCounts = groupCount(appointments, (item) => item.doctor?.name);
  const departmentCounts = groupCount(appointments, (item) => item.doctor?.specialty);
  const diseaseCounts = groupCount(completed, (item) => (item.reason || item.prescription || "General").split(/[,.]/)[0]);
  const medicineCounts = {};
  appointments.forEach((item) => (item.medicines || []).forEach((medicine) => {
    medicineCounts[medicine] = (medicineCounts[medicine] || 0) + 1;
  }));
  const topList = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const revenueByMonth = groupSum([
    ...completed.map((item) => ({ date: item.date, amount: item.fee || 0 })),
    ...orders.map((item) => ({ date: item.createdAt?.toISOString().slice(0, 10), amount: item.amount || 0 })),
    ...labRequests.map((item) => ({ date: item.createdAt?.toISOString().slice(0, 10), amount: item.price || 0 }))
  ], (item) => monthKey(item.date), (item) => item.amount);

  res.json({
    stats: {
      appointmentsToday: appointments.filter((item) => item.date === new Date().toISOString().slice(0, 10)).length,
      expectedFees: appointments.reduce((sum, item) => sum + (item.fee || 0), 0),
      collectedFees: consultationRevenue,
      doctors: doctors.length,
      pharmacyRevenue,
      labRevenue,
      totalRevenue: consultationRevenue + pharmacyRevenue + labRevenue,
      pendingApprovals:
        doctorUsers.filter((user) => user.approvalStatus === "pending").length +
        pharmacists.filter((user) => user.approvalStatus === "pending").length +
        labTechnicians.filter((user) => user.approvalStatus === "pending").length
    },
    analytics: {
      appointmentsPerMonth: topList(groupCount(appointments, (item) => monthKey(item.date))),
      revenuePerMonth: topList(revenueByMonth),
      departmentWisePatients: topList(departmentCounts),
      medicineSales: topList(groupSum(orders, (item) => (item.medicines || ["Medicines"]).join(", "), (item) => item.amount || 0)),
      labTestStatistics: topList(groupCount(labRequests, (item) => item.testName)),
      topDoctors: topList(doctorCounts),
      topDepartments: topList(departmentCounts),
      revenueTrends: topList(revenueByMonth),
      mostCommonDiseases: topList(diseaseCounts),
      mostPrescribedMedicines: topList(medicineCounts)
    },
    appointments,
    doctors: doctors.map((doctor) => {
      const doctorUser = doctorUsers.find((user) => user.doctorId?._id?.toString() === doctor._id.toString());
      return {
        ...doctor.toObject(),
        userId: doctorUser?._id,
        approvalStatus: doctorUser?.approvalStatus || "approved",
        phone: doctorUser?.phone,
        registeredEmail: doctorUser?.email
      };
    }),
    doctorUsers,
    pendingDoctors: doctorUsers.filter((user) => user.approvalStatus === "pending"),
    patients,
    pharmacists,
    labTechnicians,
    admins,
    orders,
    inventory,
    departments,
    labTests,
    labRequests,
    auditLogs,
    feedbacks
  });
}

export async function getUsers(_req, res) {
  res.json(await User.find().select("-password").sort({ role: 1, name: 1 }));
}

export async function updateUserStatus(req, res) {
  const { approvalStatus } = req.body;
  if (!["approved", "pending", "rejected"].includes(approvalStatus)) {
    return res.status(400).json({ message: "Invalid user status." });
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { approvalStatus, approvedAt: approvalStatus === "approved" ? new Date() : undefined },
    { new: true }
  ).select("-password");
  if (!user) return res.status(404).json({ message: "User not found." });
  await createAudit(req.user, "Admin updated user access", "users", user._id, `${user.email} ${approvalStatus}`);
  res.json(user);
}

export async function createDepartment(req, res) {
  const department = await Department.create(req.body);
  res.status(201).json(department);
}

export async function updateDepartment(req, res) {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!department) return res.status(404).json({ message: "Department not found." });
  res.json(department);
}

export async function updateDoctorApproval(req, res) {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Approval status must be approved or rejected." });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.userId, role: "doctor" },
    { approvalStatus: status, approvedAt: status === "approved" ? new Date() : undefined },
    { new: true }
  ).select("-password").populate("doctorId");

  if (!user) return res.status(404).json({ message: "Doctor user not found." });

  if (user.doctorId) {
    user.doctorId.status = status === "approved" ? "available" : "rejected";
    await user.doctorId.save();
  }

  await Promise.all([
    notifyOne(user._id, {
      title: `Doctor ${status}`,
      message: `Your doctor account has been ${status}.`,
      module: "admin",
      refId: user._id
    }),
    createAudit(req.user, "Admin approved doctor", "users", user._id, `${user.name} ${status}`)
  ]);

  res.json(user);
}

export async function updatePharmacistApproval(req, res) {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Approval status must be approved or rejected." });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.userId, role: "pharmacist" },
    { approvalStatus: status, approvedAt: status === "approved" ? new Date() : undefined },
    { new: true }
  ).select("-password");

  if (!user) return res.status(404).json({ message: "Pharmacist user not found." });
  await createAudit(req.user, "Admin updated pharmacist approval", "users", user._id, `${user.name} ${status}`);

  res.json(user);
}

export async function updateLabTechnicianApproval(req, res) {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Approval status must be approved or rejected." });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.userId, role: "lab_technician" },
    { approvalStatus: status, approvedAt: status === "approved" ? new Date() : undefined },
    { new: true }
  ).select("-password");

  if (!user) return res.status(404).json({ message: "Lab technician user not found." });
  await createAudit(req.user, "Admin updated lab technician approval", "users", user._id, `${user.name} ${status}`);

  res.json(user);
}
