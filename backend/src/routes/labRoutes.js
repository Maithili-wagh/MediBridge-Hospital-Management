import express from "express";
import {
  bookLabRequest,
  collectLabSample,
  createLabRequest,
  createLabTest,
  getDoctorLabRequests,
  getLabReport,
  getLabReportFile,
  getLabRequests,
  getLabTests,
  getMyLabRequests,
  reviewLabRequest,
  updateLabResults,
  updateLabTest
} from "../controllers/labController.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/tests", protect, allowRoles("patient", "doctor", "lab_technician", "admin"), getLabTests);
router.post("/tests", protect, allowRoles("admin"), createLabTest);
router.patch("/tests/:id", protect, allowRoles("admin"), updateLabTest);
router.post("/requests", protect, allowRoles("doctor", "admin"), createLabRequest);
router.get("/requests", protect, allowRoles("doctor", "lab_technician", "admin"), getLabRequests);
router.get("/requests/mine", protect, allowRoles("patient"), getMyLabRequests);
router.get("/requests/doctor", protect, allowRoles("doctor"), getDoctorLabRequests);
router.patch("/requests/:id/book", protect, allowRoles("patient", "admin"), bookLabRequest);
router.patch("/requests/:id/collect", protect, allowRoles("lab_technician", "admin"), collectLabSample);
router.patch("/requests/:id/results", protect, allowRoles("lab_technician", "admin"), updateLabResults);
router.patch("/requests/:id/review", protect, allowRoles("doctor", "admin"), reviewLabRequest);
router.get("/requests/:id/report", protect, allowRoles("patient", "doctor", "lab_technician", "admin"), getLabReport);
router.get("/requests/:id/report-file", protect, allowRoles("patient", "doctor", "lab_technician", "admin"), getLabReportFile);

export default router;
