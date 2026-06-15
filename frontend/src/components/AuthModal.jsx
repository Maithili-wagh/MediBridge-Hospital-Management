import { useEffect, useMemo, useState } from "react";
import { Activity, FlaskConical, Lock, Mail, Pill, ShieldPlus, Stethoscope, User, UserRound, X } from "lucide-react";
import Logo from "./Logo.jsx";
import { API } from "../utils/api.js";

const roles = [
  { key: "doctor", label: "Doctor", icon: Stethoscope, color: "#1d6ad6" },
  { key: "patient", label: "Patient", icon: UserRound, color: "#2fb275" },
  { key: "pharmacist", label: "Pharmacist", icon: Pill, color: "#8a96a8" },
  { key: "lab_technician", label: "Lab Technician", icon: FlaskConical, color: "#0f766e" },
  { key: "admin", label: "Super Admin", icon: ShieldPlus, color: "#ef4444" }
];

export default function AuthModal({ role, setRole, mode, setMode, onClose, onAuth }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    otp: "",
    specialty: "",
    degree: "",
    hospital: "",
    city: "",
    experience: "",
    fee: ""
  });
  const [error, setError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const activeRole = useMemo(() => roles.find((item) => item.key === role), [role]);
  const isAdminRegister = mode === "register" && role === "admin";
  const approvalRole = mode === "register" && ["doctor", "pharmacist", "lab_technician"].includes(role);

  useEffect(() => {
    setOtpSent(false);
    setError("");
    setOtpMessage("");
  }, [role, mode, form.email, form.phone]);

  const requestOtp = async () => {
    if (role === "admin") {
      setError("Admin accounts are created only by an existing admin.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, role })
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpMessage("");
        setError(data.message || "Unable to send OTP.");
        return;
      }
      setOtpSent(true);
      setOtpMessage(data.message || "OTP sent. Please check your email.");
    } catch {
      setError("Backend is not running. Start backend server first.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isAdminRegister) {
      setError("Admin accounts are created only by an existing admin.");
      return;
    }
    if (mode === "register" && !otpSent) {
      await requestOtp();
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Request failed. Please check details.");
        return;
      }
      if (!data.token) {
        setError(data.message || "Registration submitted. Wait for admin approval.");
        return;
      }
      onAuth(data);
    } catch {
      setError("Backend is not running. Start backend server first.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="auth-modal" onSubmit={submit}>
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <Logo />
        <h2>Welcome to MediBridge</h2>
        <p>Select your role:</p>
        <div className="role-grid">
          {roles.map((item) => {
            const Icon = item.icon;
            return (
              <button type="button" key={item.key} className={role === item.key ? "selected" : ""} onClick={() => setRole(item.key)} style={{ "--role": item.color }}>
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Register
          </button>
        </div>
        {isAdminRegister && <p className="notice">Admin self-registration is not available. Admin accounts are created only by an existing admin.</p>}
        {mode === "register" && !isAdminRegister && (
          <>
            <label>
              <User size={15} />
              <input required placeholder="Full Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              <UserRound size={15} />
              <input required={role === "patient"} type="tel" placeholder={role === "patient" ? "Mobile Number" : "Phone Number"} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
          </>
        )}
        {!isAdminRegister && (
          <>
            <label>
              <Mail size={15} />
              <input required type="email" placeholder="Email Address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              <Lock size={15} />
              <input required minLength="6" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
          </>
        )}
        {mode === "register" && otpSent && (
          <label>
            <Lock size={15} />
            <input required placeholder="Enter OTP" value={form.otp} onChange={(event) => setForm({ ...form, otp: event.target.value })} />
          </label>
        )}
        {mode === "register" && otpMessage && <p className="otp-note">{otpMessage}</p>}
        {approvalRole && <p className="otp-note"><Activity size={15} /> Registration is submitted for admin approval after OTP verification.</p>}
        {mode === "register" && role === "doctor" && (
          <div className="doctor-register">
            <input placeholder="Specialty" value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} />
            <input placeholder="Degree" value={form.degree} onChange={(event) => setForm({ ...form, degree: event.target.value })} />
            <input placeholder="Hospital" value={form.hospital} onChange={(event) => setForm({ ...form, hospital: event.target.value })} />
            <input placeholder="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            <input type="number" min="0" placeholder="Experience" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
            <input type="number" min="0" placeholder="Fee" value={form.fee} onChange={(event) => setForm({ ...form, fee: event.target.value })} />
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="primary" disabled={busy || isAdminRegister}>
          {busy ? "Please wait..." : mode === "register" && !otpSent ? "Send Email OTP" : `${mode === "login" ? "Login" : "Register"} as ${activeRole.label}`}
        </button>
      </form>
    </div>
  );
}
