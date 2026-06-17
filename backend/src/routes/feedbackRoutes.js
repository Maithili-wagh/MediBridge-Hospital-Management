import express from "express";
import { submitFeedback } from "../controllers/feedbackController.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, allowRoles("patient"), submitFeedback);

export default router;
