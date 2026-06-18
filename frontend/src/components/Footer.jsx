import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-section">
          <Logo />
          <p>
            MediBridge is a Multi Specialty Hospital Management System
            connecting patients, doctors, pharmacy, laboratory and
            administration through one digital platform.
          </p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="#">Home</a></li>
            <li><a href="#doctors">Doctors</a></li>
            <li><a href="#appointments">Appointments</a></li>
            <li><a href="#pharmacy">Pharmacy</a></li>
            <li><a href="#lab">Lab</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Services</h3>
          <ul>
            <li>Doctor Consultation</li>
            <li>Lab Testing</li>
            <li>Medicine Orders</li>
            <li>Patient Records</li>
            <li>Admin Dashboard</li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Contact</h3>
          <p>📞 +91 108</p>
          <p>📧 support@medibridge.in</p>
          <p>📍 Amravati, Maharashtra</p>
        </div>

      </div>

      <div className="footer-bottom">
        © 2026 MediBridge. All Rights Reserved.
      </div>
    </footer>
  );
}