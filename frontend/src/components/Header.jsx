import { Lock, LogOut, Menu, User } from "lucide-react";
import Logo from "./Logo.jsx";

export default function Header({ active, setActive, user, logout, requireLogin, mobileOpen, setMobileOpen }) {
  const nav = [
    ["home", "Home", () => setActive("home")],
    ["doctors", "Doctors", () => setActive("doctors")],
    ["patient", "Book Appointment", () => requireLogin("patient", "patient")],
    ["pharmacist", "Pharmacy", () => requireLogin("pharmacist", "pharmacist")],
    ["lab_technician", "Lab", () => requireLogin("lab_technician", "lab_technician")],
    ["doctor", "Doctor Desk", () => requireLogin("doctor", "doctor")],
    ["admin", "Admin Panel", () => requireLogin("admin", "admin")]
  ];

  return (
    <header className="site-header">
      <Logo />
      <button className="icon-btn menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
        <Menu size={20} />
      </button>
      <nav className={mobileOpen ? "open" : ""}>
        {nav.map(([key, label, onClick]) => (
          <button
            key={key}
            className={active === key ? "active" : ""}
            onClick={() => {
              onClick();
              setMobileOpen(false);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="account">
        {user ? (
          <>
            <User size={15} />
            <span>{user.name}</span>
            <small>{user.role}</small>
            <button onClick={logout}>
              <LogOut size={15} />
              Logout
            </button>
          </>
        ) : (
          <button onClick={() => requireLogin("patient", "patient")}>
            <Lock size={15} />
            Login
          </button>
        )}
      </div>
    </header>
  );
}
