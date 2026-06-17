import express from "express";
import {
  completeAppointment,
  getDoctorAvailability,
  getDoctors,
  getMyAppointments,
  getMyAvailability,
  getPatientByOpd,
  updateAppointmentStatus,
  updateMyAvailability,
  updatePrescriptionByOpd
} from "../controllers/doctorController.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();
const doctorOnly = [protect, allowRoles("doctor")];

router.get("/", getDoctors);
router.get("/:id([0-9a-fA-F]{24})/availability", getDoctorAvailability);
router.get("/me/appointments", ...doctorOnly, getMyAppointments);
router.get("/me/availability", ...doctorOnly, getMyAvailability);
router.put("/me/availability", ...doctorOnly, updateMyAvailability);
router.get("/opd/:opdId", ...doctorOnly, getPatientByOpd);
router.patch("/opd/:opdId/prescription", ...doctorOnly, updatePrescriptionByOpd);
router.patch("/appointments/:id/status", ...doctorOnly, updateAppointmentStatus);
router.patch("/appointments/:id/complete", ...doctorOnly, completeAppointment);

export default router;
