export default function DoctorCard({ doc, compact, requireLogin }) {
  return (
    <article className={`doctor-card ${compact ? "compact" : ""}`}>
      <div className="avatar">{doc.name.split(" ").slice(-2).map((name) => name[0]).join("")}</div>
      <div className="doctor-info">
        <h3>{doc.name}</h3>
        <p>
          {doc.specialty} - {doc.degree}
        </p>
        <small>
          {doc.hospital}, {doc.city} - {doc.experience} yrs - Rs {doc.fee}
        </small>
        <span className="available">Available</span>
      </div>
      <div className="rating">{`${Math.round((doc.rating || 4) * 10) / 10}/5`}</div>
      <button className="primary" onClick={() => requireLogin("patient", "patient")}>
        Book
      </button>
    </article>
  );
}
