import { useEffect, useState } from "react";
import DataTable from "../components/DataTable.jsx";
import { PanelTitle, ProfileCard } from "../components/PanelShared.jsx";
import { API, localDateString } from "../utils/api.js";

function minutesFromTime(value = "") {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function timeFromMinutes(total) {
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

function dayName(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function slotsForAvailability(availability, date) {
  const row = availability.find((item) => item.day === dayName(date));
  if (row?.off) return [];
  const start = minutesFromTime(row?.startTime || "09:00 AM");
  const end = minutesFromTime(row?.endTime || "05:00 PM");
  if (start === null || end === null || end < start) return [];
  const slots = [];
  for (let minutes = start; minutes <= end; minutes += 60) {
    slots.push(timeFromMinutes(minutes));
  }
  return slots;
}

export default function PatientPanel({ user, doctors, token, authHeaders, requireLogin }) {
  const today = localDateString();
  const [form, setForm] = useState({ doctorId: "", date: today, time: "09:00 AM", reason: "" });
  const [appointments, setAppointments] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [emr, setEmr] = useState({ timeline: [] });
  const [availability, setAvailability] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [labFilter, setLabFilter] = useState("all");
  const [feedback, setFeedback] = useState({ appointmentId: "", rating: 5, comments: "" });
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [lastBookedKey, setLastBookedKey] = useState("");
  const bookingKey = `${form.doctorId}|${form.date}|${form.time}`;
  const alreadyBookedThisDoctorToday = appointments.some((item) => {
    const doctorId = item.doctor?._id || item.doctor;
    return doctorId === form.doctorId && item.date === form.date && item.status !== "cancelled";
  });
  const alreadyBookedThisSlot = lastBookedKey === bookingKey;
  const availableSlots = slotsForAvailability(availability, form.date);

  useEffect(() => {
    if (!form.doctorId && doctors[0]?._id) {
      setForm((current) => ({ ...current, doctorId: doctors[0]._id }));
    }
  }, [doctors, form.doctorId]);

  useEffect(() => {
    if (!form.doctorId) return;
    fetch(`${API}/doctors/${form.doctorId}/availability`)
      .then((response) => response.json())
      .then((data) => setAvailability(Array.isArray(data) ? data : []))
      .catch(() => setAvailability([]));
  }, [form.doctorId]);

  useEffect(() => {
    if (!availableSlots.length) return;
    if (!availableSlots.includes(form.time)) {
      setForm((current) => ({ ...current, time: availableSlots[0] }));
    }
  }, [availableSlots.join("|"), form.time]);

  useEffect(() => {
    if (!token) return requireLogin("patient", "patient");
    const loadMine = () => {
      fetch(`${API}/appointments/mine`, { headers: authHeaders })
        .then((response) => response.json())
        .then((data) => Array.isArray(data) && setAppointments(data))
        .catch(() => {});
      fetch(`${API}/lab/requests/mine`, { headers: authHeaders })
        .then((response) => response.json())
        .then((data) => Array.isArray(data) && setLabRequests(data))
        .catch(() => {});
      fetch(`${API}/notifications`, { headers: authHeaders })
        .then((response) => response.json())
        .then((data) => Array.isArray(data) && setNotifications(data))
        .catch(() => {});
      fetch(`${API}/appointments/emr`, { headers: authHeaders })
        .then((response) => response.json())
        .then((data) => data?.timeline && setEmr(data))
        .catch(() => {});
    };
    loadMine();
    const timer = setInterval(loadMine, 5000);
    return () => clearInterval(timer);
  }, [token]);

  const book = async (event) => {
    event.preventDefault();
    if (booking) return;
    setMessage("");
    if (form.date < today) {
      setForm((current) => ({ ...current, date: today }));
      setMessage("Please select today or a future date.");
      return;
    }
    const selectedDate = new Date(form.date);
const currentDate = new Date();

const isToday =
  selectedDate.toDateString() === currentDate.toDateString();

if (isToday) {

  const selectedMinutes = minutesFromTime(form.time);

  const currentMinutes =
    currentDate.getHours() * 60 + currentDate.getMinutes();

  if (selectedMinutes <= currentMinutes) {
    setMessage("Cannot book past time slots.");
    return;
  }
}
    if (alreadyBookedThisDoctorToday || alreadyBookedThisSlot) {
      setMessage("You already have an appointment with this doctor on the selected date.");
      return;
    }
    if (!form.doctorId) {
      alert("No doctor available. Register a doctor or seed MongoDB first.");
      return;
    }
    if (!availableSlots.length) {
      setMessage("Doctor is not available on the selected day.");
      return;
    }
    setBooking(true);
    try {
      const response = await fetch(`${API}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(form)
      });
      if (response.status === 401) return requireLogin("patient", "patient");
      const data = await response.json();
      if (!response.ok) return setMessage(data.message || "Unable to book appointment.");
      setAppointments((current) => [data, ...current.filter((item) => item._id !== data._id)]);
      setLastBookedKey(bookingKey);
      setMessage("Appointment booked successfully.");
    } catch {
      setMessage("Backend is not connected. Start backend server first.");
    } finally {
      setBooking(false);
    }
  };

  const bookLab = async (row) => {
    const response = await fetch(`${API}/lab/requests/${row._id}/book`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ bookingDate: today })
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to book lab test.");
    setLabRequests((current) => current.map((item) => (item._id === data._id ? data : item)));
    setMessage(`${data.testName} lab test booked for ${data.bookingDate}.`);
  };

  const reportUrl = (row) => `${API}/lab/requests/${row._id}/report-file`;

  const openReport = async (row, mode = "view") => {
    setMessage("");
    try {
      const response = await fetch(reportUrl(row), { headers: authHeaders });
      if (response.status === 401 || response.status === 403) return requireLogin("patient", "patient");
      if (!response.ok) return setMessage("Unable to open PDF report.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = row.reportFileName || `${row.testName || "lab"}-report.pdf`;
        link.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setMessage("Unable to open PDF report.");
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!feedback.appointmentId) return setMessage("Select a completed appointment first.");
    const response = await fetch(`${API}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(feedback)
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to submit feedback.");
    setFeedback({ appointmentId: "", rating: 5, comments: "" });
    setMessage("Feedback submitted. Doctor rating updated.");
  };

  const filteredAppointments = appointments.filter((item) => {
    if (appointmentFilter === "today") return item.date === today;
    if (appointmentFilter === "week") {
      const start = new Date(today);
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      const date = new Date(`${item.date}T00:00:00`);
      return date >= start && date <= end;
    }
    if (appointmentFilter === "completed") return item.status === "completed";
    if (appointmentFilter === "pending") return !["completed", "cancelled"].includes(item.status);
    return true;
  });
  const filteredLabs = labRequests.filter((item) => {
    if (labFilter === "pending") return !["reported", "reviewed"].includes(item.status);
    if (labFilter === "completed") return ["reported", "reviewed"].includes(item.status);
    return true;
  });
  const kpis = [
    ["Appointments", appointments.length],
    ["Reports", labRequests.filter((item) => ["reported", "reviewed"].includes(item.status)).length],
    ["Prescriptions", appointments.filter((item) => item.prescription).length],
    ["Pending Tests", labRequests.filter((item) => !["reported", "reviewed"].includes(item.status)).length]
  ];

  return (
    <section className="dashboard patient-theme">
      <PanelTitle title="Patient Portal" text="Book appointments and view your OPD history." />
      <ProfileCard user={user} />
      <div className="stats compact-stats">
        {kpis.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
      </div>
      <div className="panel notification-panel">
        <h2>Notifications</h2>
        {(notifications.slice(0, 5)).map((item) => (
          <p key={item._id} className={item.read ? "" : "unread"}>{item.title}: {item.message}</p>
        ))}
        {!notifications.length && <p>No notifications yet.</p>}
      </div>
      <div className="two-col">
        <form className="panel" onSubmit={book}>
          <h2>Schedule Your Visit</h2>
          <label>
            Select Doctor
            <select value={form.doctorId} onChange={(event) => { setMessage(""); setForm({ ...form, doctorId: event.target.value }); }}>
              {doctors.map((doctor) => (
                <option value={doctor._id} key={doctor._id}>
                  {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" min={today} value={form.date} onChange={(event) => { setMessage(""); setForm({ ...form, date: event.target.value || today }); }} />
          </label>
          <label>
            Time
            <select value={form.time} onChange={(event) => { setMessage(""); setForm({ ...form, time: event.target.value }); }}>
              {availableSlots.map((time) => (
                <option key={time}>{time}</option>
              ))}
            </select>
          </label>
          {!availableSlots.length && <p className="notice">No slots available for this doctor on {dayName(form.date)}.</p>}
          <label>
            Reason
            <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Symptoms or visit reason" />
          </label>
          {message && <p className="notice">{message}</p>}
          <button className="primary" disabled={booking || alreadyBookedThisDoctorToday || alreadyBookedThisSlot || !availableSlots.length}>
            {booking ? "Booking..." : alreadyBookedThisDoctorToday || alreadyBookedThisSlot ? "Already Booked" : "Confirm Appointment"}
          </button>
        </form>
        <div>
          <div className="filters compact-filters">
            <select value={appointmentFilter} onChange={(event) => setAppointmentFilter(event.target.value)}>
              <option value="all">All Appointments</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
            <select value={labFilter} onChange={(event) => setLabFilter(event.target.value)}>
              <option value="all">All Lab Tests</option>
              <option value="pending">Pending Reports</option>
              <option value="completed">Completed Reports</option>
            </select>
          </div>
          <DataTable title="My Appointments" rows={filteredAppointments} columns={["opdId", "patientName", "date", "time", "status"]} />
          <DataTable
            title="My Lab Tests"
            rows={filteredLabs}
            columns={["opdId", "testName", "category", "price", "bookingDate", "status"]}
            action={(row) => ["reported", "reviewed"].includes(row.status) ? (
              <>
                <button type="button" onClick={() => openReport(row, "view")}>View PDF</button>
                <button type="button" onClick={() => openReport(row, "download")}>Download PDF</button>
              </>
            ) : (
              <button onClick={() => bookLab(row)}>Book Test</button>
            )}
          />
        </div>
      </div>
      <div className="two-col">
        <div className="panel">
          <h2>Complete Patient Timeline</h2>
          <div className="timeline">
            {emr.timeline?.map((item, index) => (
              <p key={`${item.date}-${item.title}-${index}`}><strong>{item.date}</strong> - {item.title} - {item.type}</p>
            ))}
            {!emr.timeline?.length && <p>No EMR timeline yet.</p>}
          </div>
        </div>
        <form className="panel" onSubmit={submitFeedback}>
          <h2>Doctor Feedback</h2>
          <label>Completed Appointment
            <select value={feedback.appointmentId} onChange={(event) => setFeedback({ ...feedback, appointmentId: event.target.value })}>
              <option value="">Select appointment</option>
              {appointments.filter((item) => item.status === "completed").map((item) => (
                <option key={item._id} value={item._id}>{item.date} - {item.doctor?.name || "Doctor"}</option>
              ))}
            </select>
          </label>
          <label>Doctor Rating
            <select value={feedback.rating} onChange={(event) => setFeedback({ ...feedback, rating: Number(event.target.value) })}>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Stars</option>)}
            </select>
          </label>
          <label>Comments<textarea value={feedback.comments} onChange={(event) => setFeedback({ ...feedback, comments: event.target.value })} /></label>
          <button className="primary">Submit Feedback</button>
        </form>
      </div>
    </section>
  );
}
