import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import doctorRoutes from "./src/routes/doctorRoutes.js";
import appointmentRoutes from "./src/routes/appointmentRoutes.js";
import pharmacyRoutes from "./src/routes/pharmacyRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import labRoutes from "./src/routes/labRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import feedbackRoutes from "./src/routes/feedbackRoutes.js";

dotenv.config();


const app = express();
const basePort = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "MediBridge API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`MediBridge API running on ${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is busy. Stop the existing backend process and run npm run dev again.`);
      process.exit(1);
      return;
    }

    console.error("Server failed to start:", error);
    process.exit(1);
  });
};

connectDB()
  .then(() => startServer(basePort))
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  });
