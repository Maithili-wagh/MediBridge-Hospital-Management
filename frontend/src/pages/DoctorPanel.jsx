import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import { PanelTitle, ProfileCard } from "../components/PanelShared.jsx";
import { API } from "../utils/api.js";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaultAvailability = days.map((day) => ({ day, startTime: "09:00 AM", endTime: "01:00 PM", off: day === "Sunday" }));

export default function DoctorPanel({ user, authHeaders, requireLogin }) {
  const [appointments, setAppointments] = useState([]);
  const [opdId, setOpdId] = useState("");
  const [selected, setSelected] = useState(null);
  const [prescription, setPrescription] = useState("");
  const [medicines, setMedicines] = useState("");
  const [labTests, setLabTests] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [selectedTest, setSelectedTest] = useState("");
  const [availability, setAvailability] = useState(defaultAvailability);
  const [queueFilter, setQueueFilter] = useState("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadQueue = () => {
      fetch(`${API}/doctors/me/appointments`, { headers: authHeaders })
        .then(async (response) => {
          if (response.status === 401 || response.status === 403) {
            requireLogin("doctor", "doctor");
            return null;
          }
          const data = await response.json();
          if (!response.ok) {
            setMessage(data.message || "Unable to load doctor appointments.");
            return null;
          }
          return data;
        })
        .then((data) => Array.isArray(data) && setAppointments(data))
        .catch(() => setMessage("Backend is not connected. Start backend server first."));
    };
    loadQueue();
    fetch(`${API}/lab/tests`, { headers: authHeaders })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLabTests(data);
          setSelectedTest("");
        }
      })
      .catch(() => {});
    fetch(`${API}/lab/requests`, { headers: authHeaders })
      .then((response) => response.json())
      .then((data) => Array.isArray(data) && setLabRequests(data))
      .catch(() => {});
    fetch(`${API}/doctors/me/availability`, { headers: authHeaders })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setAvailability(defaultAvailability.map((item) => data.find((row) => row.day === item.day) || item));
        }
      })
      .catch(() => {});
    const timer = setInterval(loadQueue, 5000);
    return () => clearInterval(timer);
  }, []);

  const findByOpd = async () => {
    setMessage("");
    setSelected(null);
    const cleanOpd = opdId.trim().toUpperCase();
    if (!cleanOpd) return setMessage("Enter patient OPD ID first.");

    const response = await fetch(`${API}/doctors/opd/${cleanOpd}`, { headers: authHeaders });
    const data = await response.json();
    if (response.status === 401 || response.status === 403) return requireLogin("doctor", "doctor");
    if (!response.ok) return setMessage(data.message || "Patient not found for this doctor.");

    setSelected(data);
    setPrescription(data.prescription || "");
    setMedicines(Array.isArray(data.medicines) ? data.medicines.join(", ") : "");
  };

  const savePrescription = async (id = opdId) => {
    const cleanOpd = id.trim().toUpperCase();
    if (!cleanOpd) return setMessage("Enter OPD ID before saving.");
    const response = await fetch(`${API}/doctors/opd/${cleanOpd}/prescription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ prescription, medicines })
    });
    const data = await response.json();
    if (response.status === 401 || response.status === 403) return requireLogin("doctor", "doctor");
    if (!response.ok) return setMessage(data.message || "Unable to save prescription.");

    setMessage(`Prescription saved for ${data.patientName}. Pharmacy can now search ${data.opdId}.`);
    setSelected(data);
    setAppointments((current) => current.map((item) => (item._id === data._id ? data : item)));
  };

  const prescribeLabTest = async () => {
    if (!selected?._id) return setMessage("Open a patient appointment before prescribing a lab test.");
    if (!selectedTest) return setMessage("No lab test selected.");
    const response = await fetch(`${API}/lab/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ appointmentId: selected._id, testId: selectedTest, remarks: "Prescribed after consultation." })
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to prescribe lab test.");
    setLabRequests((current) => [data, ...current]);
    setMessage(`${data.testName} prescribed for ${data.patientName}. Patient can now book the lab test.`);
  };

  const updateStatus = async (row, status) => {
    const response = await fetch(`${API}/doctors/appointments/${row._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to update appointment status.");
    setAppointments((current) => current.map((item) => (item._id === data._id ? data : item)));
    if (selected?._id === data._id) setSelected(data);
    setMessage(`Appointment moved to ${status.replace("_", " ")}.`);
  };

  const saveAvailability = async () => {
    const response = await fetch(`${API}/doctors/me/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ availability })
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to save availability.");
    setAvailability(defaultAvailability.map((item) => data.find((row) => row.day === item.day) || item));
    setMessage("Availability updated.");
  };

  const reviewReport = async (row) => {
    const response = await fetch(`${API}/lab/requests/${row._id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ remarks: "Report reviewed by doctor." })
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to review report.");
    setLabRequests((current) => current.map((item) => (item._id === data._id ? data : item)));
    setMessage(`Lab report reviewed for ${data.patientName}.`);
  };

  const filteredAppointments = appointments.filter((item) => {
    if (queueFilter === "completed") return item.status === "completed";
    if (queueFilter === "pending") return !["completed", "cancelled"].includes(item.status);
    return true;
  });

  return (
    <section className="dashboard doctor-theme">
      <PanelTitle title="Doctor Desk" text="Search OPD ID, add prescription and send medicines to pharmacy." />
      <ProfileCard user={user} />
      <div className="two-col">
        <div className="panel prescription-panel">
          <h2>Prescription by OPD ID</h2>
          <div className="inline">
            <input placeholder="Enter OPD ID" value={opdId} onChange={(event) => setOpdId(event.target.value.toUpperCase())} />
            <button className="secondary" type="button" onClick={findByOpd}>
              <Search size={16} />
              Find
            </button>
          </div>
          {selected && <p className="patient-summary">{selected.patientName} - {selected.date} - {selected.time} - {selected.status}</p>}
          <label>
            Prescription
            <textarea value={prescription} onChange={(event) => setPrescription(event.target.value)} placeholder="Diagnosis, advice, dosage notes" />
          </label>
          <label>
            Medicines
            <textarea value={medicines} onChange={(event) => setMedicines(event.target.value)} placeholder="Comma separated medicines, e.g. Paracetamol 500mg, Vitamin C" />
          </label>
          <label>
            Prescribe Lab Test
            <select value={selectedTest} onChange={(event) => setSelectedTest(event.target.value)}>
              <option value="">None</option>
              {labTests.map((test) => (
                <option value={test._id} key={test._id}>{test.category} - {test.testName} (Rs {test.price})</option>
              ))}
            </select>
          </label>
          {message && <p className="notice">{message}</p>}
          <div className="actions">
            <button className="primary" type="button" onClick={() => savePrescription(opdId)}>Save Prescription</button>
            <button className="secondary" type="button" onClick={prescribeLabTest} disabled={!selectedTest}>Prescribe Lab Test</button>
          </div>
        </div>
        <div>
          <div className="filters compact-filters">
            <select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value)}>
              <option value="all">All Appointments</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <DataTable
            title="My Patient Queue"
            rows={filteredAppointments}
            columns={["opdId", "patientName", "date", "time", "reason", "status"]}
            action={(row) => (
              <>
                <button onClick={() => {
                    setOpdId(row.opdId);
                    setSelected(row);
                    setPrescription(row.prescription || "");
                    setMedicines(Array.isArray(row.medicines) ? row.medicines.join(", ") : "");
                  }}>Open</button>
                {row.status === "booked" && <button onClick={() => updateStatus(row, "confirmed")}>Confirm</button>}
                {row.status === "confirmed" && <button onClick={() => updateStatus(row, "in_consultation")}>Start</button>}
                {row.status !== "completed" && row.status !== "cancelled" && <button onClick={() => updateStatus(row, "cancelled")}>Cancel</button>}
              </>
            )}
          />
          <DataTable
            title="Lab Reports For Review"
            rows={labRequests.filter((row) => ["reported", "reviewed"].includes(row.status))}
            columns={["opdId", "patientName", "testName", "status", "reportFileName"]}
            action={(row) => <button onClick={() => reviewReport(row)}>Review</button>}
          />
        </div>
      </div>
      <div className="panel">
        <h2>Availability Management</h2>
        <div className="availability-grid">
          {availability.map((row, index) => (
            <div key={row.day} className="availability-row">
              <strong>{row.day}</strong>
              <input value={row.startTime} onChange={(event) => setAvailability((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item))} disabled={row.off} />
              <input value={row.endTime} onChange={(event) => setAvailability((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item))} disabled={row.off} />
              <label className="checkline"><input type="checkbox" checked={row.off} onChange={(event) => setAvailability((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, off: event.target.checked } : item))} /> Off</label>
            </div>
          ))}
        </div>
        <button className="primary" type="button" onClick={saveAvailability}>Save Availability</button>
      </div>
    </section>
  );
}
