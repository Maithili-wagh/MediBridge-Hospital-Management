import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import AuthModal from "./components/AuthModal.jsx";
import Home from "./pages/Home.jsx";
import Doctors from "./pages/Doctors.jsx";
import PatientPanel from "./pages/PatientPanel.jsx";
import DoctorPanel from "./pages/DoctorPanel.jsx";
import PharmacyPanel from "./pages/PharmacyPanel.jsx";
import LabTechnicianPanel from "./pages/LabTechnicianPanel.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import { API } from "./utils/api.js";

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("mb_user") || "null");
  } catch {
    localStorage.removeItem("mb_user");
    localStorage.removeItem("mb_token");
    return null;
  }
}

export default function App() {
  const [active, setActive] = useState("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("patient");
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("mb_token"));
  const [user, setUser] = useState(getSavedUser);
  const [doctors, setDoctors] = useState([]);
  const [doctorError, setDoctorError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadDoctors = () => {
    fetch(`${API}/doctors`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load doctors");
        return response.json();
      })
      .then((data) => {
        setDoctors(Array.isArray(data) ? data : []);
        setDoctorError("");
      })
      .catch(() => {
        setDoctors([]);
        setDoctorError("Backend is not connected. Start backend to fetch MongoDB data.");
      });
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const requireLogin = (role, next) => {
    if (!user || (role && user.role !== role)) {
      setSelectedRole(role || "patient");
      setMode("login");
      setAuthOpen(true);
      return;
    }
    setActive(next);
  };

  const handleAuth = (auth) => {
    setToken(auth.token);
    setUser(auth.user);
    localStorage.setItem("mb_token", auth.token);
    localStorage.setItem("mb_user", JSON.stringify(auth.user));
    setAuthOpen(false);
    loadDoctors();
    setActive(auth.user.role === "admin" ? "admin" : auth.user.role);
  };

  const logout = () => {
    localStorage.removeItem("mb_token");
    localStorage.removeItem("mb_user");
    setToken(null);
    setUser(null);
    setActive("home");
  };

  return (
    <>
      <Header active={active} setActive={setActive} user={user} logout={logout} requireLogin={requireLogin} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main>
        {active === "home" && <Home doctors={doctors} doctorError={doctorError} requireLogin={requireLogin} setActive={setActive} />}
        {active === "doctors" && <Doctors doctors={doctors} doctorError={doctorError} requireLogin={requireLogin} />}
        {active === "patient" && <PatientPanel user={user} doctors={doctors} token={token} authHeaders={authHeaders} requireLogin={requireLogin} />}
        {active === "doctor" && <DoctorPanel user={user} authHeaders={authHeaders} requireLogin={requireLogin} />}
        {active === "pharmacist" && <PharmacyPanel user={user} authHeaders={authHeaders} requireLogin={requireLogin} />}
        {active === "lab_technician" && <LabTechnicianPanel user={user} authHeaders={authHeaders} requireLogin={requireLogin} />}
        {active === "admin" && <AdminPanel user={user} authHeaders={authHeaders} requireLogin={requireLogin} />}
      </main>
      <Footer />
      {authOpen && <AuthModal role={selectedRole} setRole={setSelectedRole} mode={mode} setMode={setMode} onClose={() => setAuthOpen(false)} onAuth={handleAuth} />}
    </>
  );
}
