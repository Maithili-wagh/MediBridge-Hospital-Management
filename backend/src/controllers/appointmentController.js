import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import LabRequest from "../models/LabRequest.js";
import MedicineOrder from "../models/MedicineOrder.js";
import DoctorAvailability from "../models/DoctorAvailability.js";
import { createAudit, notifyOne, notifyUsers } from "../utils/activity.js";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesFromTime(value = "") {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export async function bookAppointment(req, res) {
  if (!req.body.date || req.body.date < localDateString()) {
    return res.status(400).json({ message: "Please select today or a future date." });
  }

  if (!req.body.time) {
    return res.status(400).json({ message: "Please select appointment time." });
  }

  const doctor = await Doctor.findById(req.body.doctorId);
  if (!doctor) return res.status(404).json({ message: "Doctor not found." });

  const appointmentDate = new Date(`${req.body.date}T00:00:00`);
  const day = appointmentDate.toLocaleDateString("en-US", { weekday: "long" });
  const availability = await DoctorAvailability.findOne({ doctor: doctor._id, day });
  if (availability?.off) {
    return res.status(409).json({ message: `${doctor.name} is off on ${day}.` });
  }
  if (availability?.startTime && availability?.endTime) {
    const selectedMinutes = minutesFromTime(req.body.time);
    const startMinutes = minutesFromTime(availability.startTime);
    const endMinutes = minutesFromTime(availability.endTime);
    if (selectedMinutes !== null && startMinutes !== null && endMinutes !== null && (selectedMinutes < startMinutes || selectedMinutes > endMinutes)) {
      return res.status(409).json({ message: `${doctor.name} is available on ${day} from ${availability.startTime} to ${availability.endTime}.` });
    }
  }

  const existing = await Appointment.findOne({
    opdId: req.user.opdId,
    doctor: doctor._id,
    date: req.body.date,
    status: { $ne: "cancelled" }
  });

  if (existing) {
    return res.status(409).json({ message: "You already have an appointment with this doctor on the selected date." });
  }

  const appointment = await Appointment.create({
    opdId: req.user.opdId,
    patientName: req.user.name,
    patientEmail: req.user.email,
    patientPhone: req.user.phone,
    doctor: doctor._id,
    date: req.body.date,
    time: req.body.time,
    fee: doctor.fee,
    reason: req.body.reason
  });

  await Promise.all([
    notifyOne(req.user._id, {
      title: "Appointment booked",
      message: `Appointment booked with ${doctor.name} on ${req.body.date} at ${req.body.time}.`,
      module: "appointments",
      refId: appointment._id
    }),
    notifyUsers({ role: "doctor", doctorId: doctor._id }, {
      title: "New appointment",
      message: `New appointment for ${req.user.name} (${req.user.opdId}).`,
      module: "appointments",
      refId: appointment._id
    }),
    createAudit(req.user, "Patient booked appointment", "appointments", appointment._id, `${doctor.name} ${req.body.date}`)
  ]);

  res.status(201).json(await appointment.populate("doctor"));
}

export async function getMyAppointments(req, res) {
  const appointments = await Appointment.find({ opdId: req.user.opdId })
    .populate("doctor")
    .sort({ date: -1 });
  res.json(appointments);
}

export async function getMyEmr(req, res) {
  const [appointments, labReports, medicineHistory] = await Promise.all([
    Appointment.find({ opdId: req.user.opdId }).populate("doctor").sort({ date: -1, createdAt: -1 }),
    LabRequest.find({ patientEmail: req.user.email }).populate(["doctor", "test"]).sort({ createdAt: -1 }),
    MedicineOrder.find({ opdId: req.user.opdId }).sort({ createdAt: -1 })
  ]);

  const timeline = [
    ...appointments.map((item) => ({
      date: item.date || item.createdAt?.toISOString().slice(0, 10),
      type: item.prescription ? "Prescription Issued" : "Appointment",
      title: `${item.doctor?.specialty || "Doctor"} consultation`,
      status: item.status,
      diagnosis: item.prescription,
      medicines: item.medicines
    })),
    ...labReports.map((item) => ({
      date: item.bookingDate || item.createdAt?.toISOString().slice(0, 10),
      type: "Lab Test",
      title: item.testName,
      status: item.status,
      reportUrl: item.reportUrl,
      reportFileName: item.reportFileName
    })),
    ...medicineHistory.map((item) => ({
      date: item.createdAt?.toISOString().slice(0, 10),
      type: "Medicine",
      title: (item.medicines || []).join(", "),
      status: item.status,
      amount: item.amount
    }))
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  res.json({ appointments, labReports, medicineHistory, timeline });
}
