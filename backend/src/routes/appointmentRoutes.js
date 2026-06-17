import express from "express";
import { bookAppointment, getMyAppointments, getMyEmr } from "../controllers/appointmentController.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();
const patientOnly = [protect, allowRoles("patient")];

router.post("/", ...patientOnly, bookAppointment);
router.get("/mine", ...patientOnly, getMyAppointments);
router.get("/emr", ...patientOnly, getMyEmr);

export default router;
