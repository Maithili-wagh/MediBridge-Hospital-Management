import { useState } from "react";
import { Search } from "lucide-react";
import DoctorCard from "../components/DoctorCard.jsx";

export default function Doctors({ doctors, doctorError, requireLogin }) {
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const specialties = [...new Set(doctors.map((doctor) => doctor.specialty))];
  const cities = [...new Set(doctors.map((doctor) => doctor.city).filter(Boolean))];
  const filtered = doctors.filter((doctor) => (
    !q || doctor.name.toLowerCase().includes(q.toLowerCase())
  ) && (!specialty || doctor.specialty === specialty) && (!city || doctor.city === city));
  const grouped = specialties.map((name) => [name, filtered.filter((doctor) => doctor.specialty === name)]).filter(([, list]) => list.length);

  return (
    <section className="page">
      <div className="band">
        <h1>Find a Doctor</h1>
        <p>Choose a specialist and book a visit after login.</p>
      </div>
      {doctorError && <p className="notice">{doctorError}</p>}
      <div className="filters filters-3">
        <div>
          <Search size={16} />
          <input placeholder="Search doctors..." value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
          <option value="">All Specialties</option>
          {specialties.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <select value={city} onChange={(event) => setCity(event.target.value)}>
          <option value="">All Cities</option>
          {cities.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>
      {!doctorError && filtered.length === 0 && <p className="notice">No doctors available from MongoDB right now.</p>}
      {grouped.map(([name, list]) => (
        <div key={name} className="doctor-group">
          <span className="chip">
            {name} ({list.length} doctors)
          </span>
          {list.map((doc) => (
            <DoctorCard key={doc._id} doc={doc} requireLogin={requireLogin} />
          ))}
        </div>
      ))}
    </section>
  );
}
