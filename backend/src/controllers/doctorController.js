import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import DoctorAvailability from "../models/DoctorAvailability.js";
import { createAudit, notifyUsers } from "../utils/activity.js";

async function getDoctorIdForUser(user) {
  if (user.doctorId) return user.doctorId;

  const doctor = await Doctor.findOne({ email: user.email });
  if (!doctor) return null;

  user.doctorId = doctor._id;
  await user.save();
  return doctor._id;
}

export async function getDoctors(req, res) {
  const { specialty, q, city } = req.query;
  const filter = {};
  if (specialty) filter.specialty = specialty;
  if (city) filter.city = city;
  if (q) filter.name = new RegExp(q, "i");
  const doctors = await Doctor.find(filter).sort({ specialty: 1, name: 1 });
  res.json(doctors);
}

export async function getDoctorAvailability(req, res) {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: "Doctor not found." });
  res.json(await DoctorAvailability.find({ doctor: doctor._id }).sort({ day: 1 }));
}

export async function getMyAppointments(req, res) {
  const doctorId = await getDoctorIdForUser(req.user);
  if (!doctorId) {
    return res.status(400).json({ message: "Your doctor account is not linked to a doctor profile." });
  }

  const appointments = await Appointment.find({ doctor: doctorId })
    .populate("doctor")
    .sort({ date: -1, time: 1 });
  res.json(appointments);
}

export async function getMyAvailability(req, res) {
  const doctorId = await getDoctorIdForUser(req.user);
  if (!doctorId) return res.status(400).json({ message: "Your doctor account is not linked to a doctor profile." });
  res.json(await DoctorAvailability.find({ doctor: doctorId }).sort({ day: 1 }));
}

export async function updateMyAvailability(req, res) {
  const doctorId = await getDoctorIdForUser(req.user);
  if (!doctorId) return res.status(400).json({ message: "Your doctor account is not linked to a doctor profile." });
  const rows = Array.isArray(req.body.availability) ? req.body.availability : [];
  await Promise.all(rows.map((row) => DoctorAvailability.findOneAndUpdate(
    { doctor: doctorId, day: row.day },
    { doctor: doctorId, day: row.day, startTime: row.startTime, endTime: row.endTime, off: Boolean(row.off) },
    { upsert: true, new: true }
  )));
  await createAudit(req.user, "Doctor updated availability", "doctor_availability", doctorId);
  res.json(await DoctorAvailability.find({ doctor: doctorId }).sort({ day: 1 }));
}

export async function getPatientByOpd(req, res) {
  const doctorId = await getDoctorIdForUser(req.user);
  if (!doctorId) {
    return res.status(400).json({ message: "Your doctor account is not linked to a doctor profile." });
  }

  const appointment = await Appointment.findOne({
    opdId: req.params.opdId.toUpperCase(),
    doctor: doctorId
  })
    .populate("doctor")
    .sort({ createdAt: -1 });

  if (!appointment) {
    return res.status(404).json({ message: "No patient appointment found for this OPD ID under your account." });
  }

  res.json(appointment);
}

export async function updatePrescriptionByOpd(req, res) {
  const doctorId = await getDoctorIdForUser(req.user);
  if (!doctorId) {
    return res.status(400).json({ message: "Your doctor account is not linked to a doctor profile." });
  }

  const medicines = Array.isArray(req.body.medicines)
    ? req.body.medicines
    : String(req.body.medicines || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  if (!req.body.prescription?.trim() || medicines.length === 0) {
    return res.status(400).json({ message: "Prescription and at least one medicine are required." });
  }

  const appointment = await Appointment.findOneAndUpdate(
    {
      opdId: req.params.opdId.toUpperCase(),
      doctor: doctorId
    },
    {
      status: "completed",
      prescription: req.body.prescription.trim(),
      medicines
    },
    { new: true, sort: { createdAt: -1 } }
  ).populate("doctor");

  if (!appointment) {
    return res.status(404).json({ message: "No patient appointment found for this OPD ID under your account." });
  }

  await Promise.all([
    notifyUsers({ email: appointment.patientEmail }, {
      title: "Prescription ready",
      message: `Prescription ready for ${appointment.opdId}.`,
      module: "prescriptions",
      refId: appointment._id
    }),
    notifyUsers({ role: "pharmacist", approvalStatus: "approved" }, {
      title: "New prescription received",
      message: `New prescription received for ${appointment.opdId}.`,
      module: "pharmacy",
      refId: appointment._id
    }),
    createAudit(req.user, "Doctor created prescription", "prescriptions", appointment._id, appointment.opdId)
  ]);

  res.json(appointment);
}

export async function updateAppointmentStatus(req, res) {
  const doctorId = await getDoctorIdForUser(req.user);
  const allowed = ["booked", "confirmed", "in_consultation", "completed", "cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid appointment status." });

  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, doctor: doctorId },
    { status: req.body.status },
    { new: true }
  ).populate("doctor");
  if (!appointment) return res.status(404).json({ message: "Appointment not found for this doctor." });

  await Promise.all([
    notifyUsers({ email: appointment.patientEmail }, {
      title: `Appointment ${req.body.status.replace("_", " ")}`,
      message: `Your appointment ${appointment.opdId} is ${req.body.status.replace("_", " ")}.`,
      module: "appointments",
      refId: appointment._id
    }),
    createAudit(req.user, "Doctor updated appointment status", "appointments", appointment._id, req.body.status)
  ]);
  res.json(appointment);
}

export async function completeAppointment(req, res) {
  const doctorId = await getDoctorIdForUser(req.user);
  if (!doctorId) {
    return res.status(400).json({ message: "Your doctor account is not linked to a doctor profile." });
  }

  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, doctor: doctorId },
    {
      status: "completed",
      prescription: req.body.prescription,
      medicines: req.body.medicines || []
    },
    { new: true }
  ).populate("doctor");
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found for this doctor." });
  }

  await Promise.all([
    notifyUsers({ email: appointment.patientEmail }, {
      title: "Prescription ready",
      message: `Prescription ready for ${appointment.opdId}.`,
      module: "prescriptions",
      refId: appointment._id
    }),
    notifyUsers({ role: "pharmacist", approvalStatus: "approved" }, {
      title: "New prescription received",
      message: `New prescription received for ${appointment.opdId}.`,
      module: "pharmacy",
      refId: appointment._id
    }),
    createAudit(req.user, "Doctor created prescription", "prescriptions", appointment._id, appointment.opdId)
  ]);

  res.json(appointment);
}
