import express from "express";
import {
  createInventoryItem,
  createMedicineOrder,
  getInventory,
  getMedicineOrders,
  getPatientPrescriptions,
  updateInventoryItem
} from "../controllers/pharmacyController.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();
const pharmacyOrAdmin = [protect, allowRoles("pharmacist", "admin")];

router.get("/patient/:opdId", ...pharmacyOrAdmin, getPatientPrescriptions);
router.post("/orders", protect, allowRoles("pharmacist"), createMedicineOrder);
router.get("/orders", ...pharmacyOrAdmin, getMedicineOrders);
router.get("/inventory", ...pharmacyOrAdmin, getInventory);
router.post("/inventory", ...pharmacyOrAdmin, createInventoryItem);
router.patch("/inventory/:id", ...pharmacyOrAdmin, updateInventoryItem);

export default router;
