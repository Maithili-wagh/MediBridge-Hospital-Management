import express from "express";
import RegistrationOtp from "../models/RegistrationOtp.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET || "dev_secret",
    {
      expiresIn: "7d"
    }
  );
}

function userPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    opdId: user.opdId,
    approvalStatus: user.approvalStatus,

    doctorProfile:
      user.doctorId &&
      typeof user.doctorId === "object"
        ? {
            id: user.doctorId._id,
            specialty:
              user.doctorId.specialty,

            degree:
              user.doctorId.degree,

            hospital:
              user.doctorId.hospital,

            city:
              user.doctorId.city,

            experience:
              user.doctorId.experience,

            fee:
              user.doctorId.fee,

            status:
              user.doctorId.status
          }
        : undefined
  };
}

function registrationCodeFor(role) {

  return null;
}

function randomOtp() {

  return Math.floor(
    100000 +
    Math.random() * 900000
  ).toString();
}

function smtpReady() {

  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

async function sendRegistrationOtp(
  email,
  otp
) {

  if (!smtpReady()) {

    console.log(
      `Registration OTP for ${email}: ${otp}`
    );

    return false;
  }

 const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 10000,

  tls: {
    rejectUnauthorized: false,
  },
});
transporter.verify((error, success) => {

  if (error) {

    console.log(
      "SMTP ERROR:",
      error
    );

  } else {

    console.log(
      "SMTP READY"
    );
  }
});

  await transporter.sendMail({

    from:
      process.env.SMTP_FROM
      || process.env.SMTP_USER,

    to: email,

    subject:
      "MediBridge Registration OTP",

    text:
      `Your MediBridge OTP is ${otp}. Valid for 10 minutes.`
  });

  return true;
}

router.post(
  "/request-otp",
  async (req, res) => {

    try {

      const email =
        req.body.email
          ?.trim()
          .toLowerCase();

      const {
        role,
        registrationCode
      } = req.body;

      if (!role) {

        return res.status(400).json({
          message:
            "Role is required."
        });
      }

      if (role === "admin") {

        return res.status(403).json({
          message:
            "Admin accounts are created only by an existing admin."
        });
      }

      if (!email) {

        return res.status(400).json({
          message:
            "Email is required."
        });
      }

      const requiredCode =
        registrationCodeFor(role);

      if (
        requiredCode &&
        registrationCode !== requiredCode
      ) {

        return res.status(403).json({
          message:
            `${role} registration code is invalid.`
        });
      }

      const existing =
        await User.findOne({
          email,
          role
        });

      if (existing) {

        return res.status(409).json({
          message:
            "Email already registered."
        });
      }

      const otp = randomOtp();

      const otpHash =
        await bcrypt.hash(otp, 10);

      await RegistrationOtp
        .findOneAndUpdate(

          {
            email,
            role,
            used: false
          },

          {
            otpHash,

            expiresAt:
              new Date(
                Date.now() +
                10 * 60 * 1000
              ),

            used: false
          },

          {
            upsert: true,
            new: true
          }
        );

      const sent =
        await sendRegistrationOtp(
          email,
          otp
        );

      res.json({

        message: sent
          ? "OTP sent to email."
          : "OTP generated. Check backend terminal."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Failed to send OTP."
      });
    }
  }
);

router.post(
  "/register",
  async (req, res) => {

    try {

      const {
        name,
        phone,
        password,
        role,
        otp
      } = req.body;

      const email =
        req.body.email
          ?.trim()
          .toLowerCase();

      if (
        !name?.trim() ||
        !email ||
        !password ||
        !role
      ) {

        return res.status(400).json({
          message:
            "Name, email, password and role are required."
        });
      }

      if (password.length < 6) {

        return res.status(400).json({
          message:
            "Password must be at least 6 characters."
        });
      }

      if (role === "admin") {

        return res.status(403).json({
          message:
            "Admin accounts are created only by an existing admin."
        });
      }

      const requiredCode =
        registrationCodeFor(role);

      if (
        requiredCode &&
        req.body.registrationCode !== requiredCode
      ) {

        return res.status(403).json({
          message:
            `${role} registration code is invalid.`
        });
      }

      const otpRecord =
        await RegistrationOtp.findOne({

          email,
          role,
          used: false

        }).sort({
          createdAt: -1
        });

      if (
        !otpRecord ||
        otpRecord.expiresAt < new Date()
      ) {

        return res.status(400).json({
          message:
            "OTP expired. Request new OTP."
        });
      }

      const otpOk =
        await bcrypt.compare(
          String(otp || ""),
          otpRecord.otpHash
        );

      if (!otpOk) {

        return res.status(400).json({
          message:
            "Invalid OTP."
        });
      }

      const existing =
        await User.findOne({ email });

      if (existing) {

        return res.status(409).json({
          message:
            "Email already registered."
        });
      }

      const hash =
        await bcrypt.hash(password, 10);

      let doctorId;

      if (role === "doctor") {

        const doctor =
          await Doctor.create({

            name: name.trim(),

            email,

            specialty:
              req.body.specialty
              || "General Physician",

            degree:
              req.body.degree
              || "MBBS",

            hospital:
              req.body.hospital
              || "MediBridge Clinic",

            city:
              req.body.city
              || "Pune",

            experience:
              Number(
                req.body.experience || 1
              ),

            fee:
              Number(
                req.body.fee || 500
              ),

            rating: 4.5,

            status: "pending",

            bio:
              req.body.bio
              || "Doctor profile created from registration."
          });

        doctorId = doctor._id;
      }

      let user =
        await User.create({

          name:
            name.trim(),

          email,

          phone,

          password: hash,

          role,

          doctorId,

          opdId:
            role === "patient"
              ? `OPD${Date.now()
                  .toString()
                  .slice(-6)}`
              : undefined,

          approvalStatus:
            ["doctor", "pharmacist", "lab_technician"].includes(role)
              ? "pending"
              : "approved",

          approvedAt:
            ["doctor", "pharmacist", "lab_technician"].includes(role)
              ? undefined
              : new Date(),

          isVerified: true
        });

      otpRecord.used = true;

      await otpRecord.save();

      user =
        await User.findById(
          user._id
        ).populate("doctorId");

      if (["doctor", "pharmacist", "lab_technician"].includes(role)) {

        return res.status(201).json({

          message:
            `${role === "doctor" ? "Doctor" : role === "pharmacist" ? "Pharmacist" : "Lab technician"} registration submitted. Admin approval required.`,

          user:
            userPayload(user)
        });
      }

      res.status(201).json({

        token:
          createToken(user),

        user:
          userPayload(user)
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Registration failed."
      });
    }
  }
);

router.post(
  "/login",
  async (req, res) => {

    try {

      const email =
        req.body.email
          ?.trim()
          .toLowerCase();

      const {
        password,
        role
      } = req.body;

      if (
        !email ||
        !password ||
        !role
      ) {

        return res.status(400).json({
          message:
            "Email, password and role are required."
        });
      }

      const user =
        await User.findOne({
          email,
          role
        }).populate("doctorId");

      if (!user) {

        return res.status(401).json({
          message:
            "Invalid email or role."
        });
      }

      const ok =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!ok) {

        return res.status(401).json({
          message:
            "Invalid password."
        });
      }

      if (
        ["doctor", "pharmacist", "lab_technician"].includes(user.role) &&
        user.approvalStatus !== "approved"
      ) {

        return res.status(403).json({
          message:
            `${user.role === "doctor" ? "Doctor" : user.role === "pharmacist" ? "Pharmacist" : "Lab technician"} account waiting for admin approval.`
        });
      }

      res.json({

        token:
          createToken(user),

        user:
          userPayload(user)
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Login failed."
      });
    }
  }
);

export default router;
