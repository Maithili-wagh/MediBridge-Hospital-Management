import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "./src/config/db.js";
import User from "./src/models/User.js";
import Doctor from "./src/models/Doctor.js";
import Appointment from "./src/models/Appointment.js";
import MedicineOrder from "./src/models/MedicineOrder.js";

dotenv.config();
await connectDB();
console.log(mongoose.connection.name);

await User.deleteMany({});
await Doctor.deleteMany({});
await Appointment.deleteMany({});
await MedicineOrder.deleteMany({});

const doctors = await Doctor.insertMany([
  { name: "Dr. Neha Sharma", email: "neha@medibridge.in", specialty: "Cardiologist", degree: "MBBS, MD", hospital: "Heart Care Hospital", city: "Delhi", experience: 8, fee: 700, rating: 4.8, bio: "Heart rhythm and hypertension specialist." },
  { name: "Dr. Sarah Lee", email: "sarah@medibridge.in", specialty: "Cardiologist", degree: "MBBS, MD, FACC", hospital: "Apollo Hospital", city: "Delhi", experience: 15, fee: 800, rating: 4.9, bio: "Cardiac care and preventive cardiology expert." },
  { name: "Dr. John Smith", email: "john@medibridge.in", specialty: "Dermatologist", degree: "MBBS, MD", hospital: "City Medical Center", city: "Mumbai", experience: 10, fee: 600, rating: 4.6, bio: "Skin, hair, acne and allergy treatments." },
  { name: "Dr. Rajesh Gupta", email: "rajesh@medibridge.in", specialty: "General Physician", degree: "MBBS, MD", hospital: "MediBridge Clinic", city: "Pune", experience: 20, fee: 400, rating: 4.7, bio: "Family medicine and chronic disease care." },
  { name: "Dr. Lisa Chen", email: "lisa@medibridge.in", specialty: "Neurologist", degree: "MBBS, DM", hospital: "NeuroHealth Center", city: "Hyderabad", experience: 14, fee: 1000, rating: 4.8, bio: "Migraine, seizure and nerve disorder care." },
  { name: "Dr. Vikram Singh", email: "vikram@medibridge.in", specialty: "Neurologist", degree: "MBBS, MD, DM", hospital: "Brain & Spine Center", city: "Kolkata", experience: 16, fee: 950, rating: 4.7, bio: "Brain and spine treatment specialist." }
]);

const hash = await bcrypt.hash("password123", 10);
await User.insertMany([
  { name: "Rahul Sharma", email: "patient@medibridge.in", phone: "9876543210", password: hash, role: "patient", opdId: "OPD10245", approvalStatus: "approved", approvedAt: new Date() },
  { name: "Dr. Sarah Lee", email: "doctor@medibridge.in", phone: "9876500011", password: hash, role: "doctor", doctorId: doctors[1]._id, approvalStatus: "approved", approvedAt: new Date() },
  { name: "Akash Pharmacy", email: "pharmacy@medibridge.in", phone: "9876500022", password: hash, role: "pharmacist", approvalStatus: "approved", approvedAt: new Date() },
  { name: "John Admin", email: "admin@medibridge.in", phone: "9876500033", password: hash, role: "admin", approvalStatus: "approved", approvedAt: new Date() }
]);

await Appointment.insertMany([
  { opdId: "OPD10245", patientName: "Rahul Sharma", patientEmail: "patient@medibridge.in", patientPhone: "9876543210", doctor: doctors[1]._id, date: "2026-06-05", time: "09:00 AM", fee: 800, status: "booked", reason: "Chest discomfort" },
  { opdId: "OPD10380", patientName: "Anita Verma", doctor: doctors[1]._id, date: "2026-06-02", time: "10:00 AM", fee: 800, status: "completed", prescription: "Take rest and monitor BP", medicines: ["Atenolol 25mg", "Aspirin 75mg"] },
  { opdId: "OPD10480", patientName: "Vikash Jain", doctor: doctors[3]._id, date: "2026-06-02", time: "02:00 PM", fee: 400, status: "booked", reason: "Fever and cough" },
  { opdId: "OPD10350", patientName: "Pooja Gupta", doctor: doctors[4]._id, date: "2026-06-02", time: "09:30 AM", fee: 1000, status: "booked", reason: "Migraine" },
  { opdId: "OPD10410", patientName: "Meera Reddy", doctor: doctors[0]._id, date: "2026-06-01", time: "10:00 AM", fee: 700, status: "completed", prescription: "Follow up after ECG", medicines: ["Rosuvastatin 10mg"] }
]);

await MedicineOrder.create({
  opdId: "OPD10380",
  patientName: "Anita Verma",
  medicines: ["Atenolol 25mg", "Aspirin 75mg"],
  amount: 420,
  status: "packed"
});

console.log("MediBridge database seeded.");
process.exit(0);
