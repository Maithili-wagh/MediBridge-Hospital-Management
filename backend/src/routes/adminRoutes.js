import express from "express";
import {
  createDepartment,
  getDashboard,
  getUsers,
  updateDepartment,
  updateDoctorApproval,
  updateLabTechnicianApproval,
  updatePharmacistApproval,
  updateUserStatus
} from "../controllers/adminController.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();
const adminOnly = [protect, allowRoles("admin")];

router.get("/dashboard", ...adminOnly, getDashboard);
router.get("/users", ...adminOnly, getUsers);
router.patch("/users/:userId/status", ...adminOnly, updateUserStatus);
router.post("/departments", ...adminOnly, createDepartment);
router.patch("/departments/:id", ...adminOnly, updateDepartment);
router.patch("/doctors/:userId/approval", ...adminOnly, updateDoctorApproval);
router.patch("/pharmacists/:userId/approval", ...adminOnly, updatePharmacistApproval);
router.patch("/lab-technicians/:userId/approval", ...adminOnly, updateLabTechnicianApproval);

export default router;
