import { Activity, Calendar, CheckCircle2, Pill, Search, ShieldPlus, Stethoscope } from "lucide-react";
import DoctorCard from "../components/DoctorCard.jsx";

export default function Home({ doctors, doctorError, requireLogin, setActive }) {
  const serviceActions = [
    [Stethoscope, "Find a Doctor", "Search specialists near you", () => setActive("doctors")],
    [Calendar, "Book Appointments", "Schedule visits online", () => requireLogin("patient", "patient")],
    [CheckCircle2, "Access Records", "Prescriptions and history", () => requireLogin("patient", "patient")],
    [Pill, "Medicine Orders", "Pharmacy can verify OPD prescriptions", () => requireLogin("pharmacist", "pharmacist")],
    [Activity, "Doctor Desk", "Appointments and patient history", () => requireLogin("doctor", "doctor")],
    [ShieldPlus, "Admin Control", "Operational dashboard and reports", () => requireLogin("admin", "admin")]
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Smart care for every role</span>
          <h1>Connecting Patients & Doctors Easily</h1>
          <p>MediBridge brings appointment booking, doctor workflows, pharmacy dispensing and admin monitoring into one clean healthcare platform.</p>
          <div className="actions">
            <button className="primary" onClick={() => setActive("doctors")}>
              <Search size={17} />
              Find a Doctor
            </button>
            <button className="secondary" onClick={() => requireLogin("patient", "patient")}>
              <Calendar size={17} />
              Get Started
            </button>
          </div>
        </div>
        <div className="doctor-visual">
          <div className="pulse-card">
            <Activity /> Live OPD <strong>24/7</strong>
          </div>
          <div className="portrait">Dr</div>
        </div>
      </section>
      <section className="services">
        <h2>Our Services</h2>
        <div className="service-grid">
          {serviceActions.map(([Icon, title, text, action]) => (
            <button className="service-card" key={title} onClick={action}>
              <Icon />
              <h3>{title}</h3>
              <p>{text}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="featured">
        <h2>Available Specialists</h2>
        {doctorError && <p className="notice">{doctorError}</p>}
        {!doctorError && doctors.length === 0 && <p className="notice">No doctors found in MongoDB yet. Register a doctor or run the seed script.</p>}
        <div className="doctor-strip">
          {doctors.slice(0, 3).map((doc) => (
            <DoctorCard key={doc._id} doc={doc} compact requireLogin={requireLogin} />
          ))}
        </div>
      </section>
    </>
  );
}
