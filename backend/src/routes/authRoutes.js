import express from "express";
import { login, register, requestOtp } from "../controllers/authController.js";

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/register", register);
router.post("/login", login);

export default router;
