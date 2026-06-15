import { useEffect, useMemo, useState } from "react";
import { Activity, BadgeIndianRupee, Building2, Calendar, FlaskConical, Package, Users } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import { PanelTitle, ProfileCard } from "../components/PanelShared.jsx";
import { API } from "../utils/api.js";

function BarList({ title, rows = [] }) {
  const max = Math.max(...rows.map((row) => Number(row.value || 0)), 1);
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
      {rows.length ? rows.map((row) => (
        <div className="bar-row" key={row.name}>
          <span>{row.name}</span>
          <div><i style={{ width: `${Math.max(8, (Number(row.value || 0) / max) * 100)}%` }} /></div>
          <strong>{row.value}</strong>
        </div>
      )) : <p>No analytics yet.</p>}
    </div>
  );
}

export default function AdminPanel({ user, authHeaders, requireLogin }) {
  const [data, setData] = useState({ stats: {}, analytics: {}, appointments: [], doctors: [], patients: [], pharmacists: [], labTechnicians: [], orders: [], inventory: [], departments: [], labTests: [], labRequests: [], auditLogs: [], feedbacks: [] });
  const [adminTab, setAdminTab] = useState("analytics");
  const [departmentForm, setDepartmentForm] = useState({ name: "", type: "clinical", head: "", phone: "" });
  const [labForm, setLabForm] = useState({ category: "Blood Tests", testName: "", price: "", sampleType: "Blood", normalRange: "Normal" });
  const [message, setMessage] = useState("");

  const loadDashboard = () => {
    fetch(`${API}/admin/dashboard`, { headers: authHeaders })
      .then((response) => (response.status === 401 || response.status === 403 ? requireLogin("admin", "admin") : response.json()))
      .then((dashboard) => dashboard?.stats && setData(dashboard))
      .catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 5000);
    return () => clearInterval(timer);
  }, []);

  const allUsers = useMemo(() => [
    ...(data.doctorUsers || []).map((item) => ({ ...item, module: "Doctor" })),
    ...(data.pharmacists || []).map((item) => ({ ...item, module: "Pharmacy" })),
    ...(data.labTechnicians || []).map((item) => ({ ...item, module: "Lab" })),
    ...(data.patients || []).map((item) => ({ ...item, module: "Patient" })),
    ...(data.admins || []).map((item) => ({ ...item, module: "Admin" }))
  ], [data]);

  const stats = [
    [Calendar, data.stats.appointmentsToday || 0, "Today's Appointments"],
    [BadgeIndianRupee, `Rs ${data.stats.totalRevenue || 0}`, "Total Revenue"],
    [Activity, data.stats.pendingApprovals || 0, "Pending Approvals"],
    [Users, data.stats.doctors || 0, "Registered Doctors"],
    [FlaskConical, `Rs ${data.stats.labRevenue || 0}`, "Lab Revenue"],
    [Package, `Rs ${data.stats.pharmacyRevenue || 0}`, "Pharmacy Revenue"]
  ];

  const approve = async (kind, row, status) => {
    const endpoint = kind === "doctor" ? `doctors/${row.userId}` : kind === "pharmacist" ? `pharmacists/${row._id}` : `lab-technicians/${row._id}`;
    const response = await fetch(`${API}/admin/${endpoint}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ status })
    });
    if (response.status === 401 || response.status === 403) return requireLogin("admin", "admin");
    if (!response.ok) return setMessage("Unable to update approval.");
    setMessage(`${kind} ${status}.`);
    loadDashboard();
  };

  const setUserStatus = async (row, approvalStatus) => {
    const response = await fetch(`${API}/admin/users/${row._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ approvalStatus })
    });
    if (!response.ok) return setMessage("Unable to update user access.");
    setMessage(`${row.name} access set to ${approvalStatus}.`);
    loadDashboard();
  };

  const addDepartment = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API}/admin/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(departmentForm)
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to add department.");
    setDepartmentForm({ name: "", type: "clinical", head: "", phone: "" });
    setMessage(`${data.name} department added.`);
    loadDashboard();
  };

  const addLabTest = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API}/lab/tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(labForm)
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to add lab test.");
    setLabForm({ category: "Blood Tests", testName: "", price: "", sampleType: "Blood", normalRange: "Normal" });
    setMessage(`${data.testName} added to lab catalog.`);
    loadDashboard();
  };

  const tabs = ["analytics", "users", "departments", "billing", "lab", "pharmacy", "doctors", "patients", "audit"];

  const views = {
    analytics: (
      <>
        <div className="stats">
          {stats.map(([Icon, value, label]) => (
            <article key={label}><Icon /><strong>{value}</strong><span>{label}</span></article>
          ))}
        </div>
        <div className="two-col">
          <BarList title="Appointments Per Month" rows={data.analytics.appointmentsPerMonth} />
          <BarList title="Revenue Per Month" rows={data.analytics.revenuePerMonth} />
          <BarList title="Department Wise Patients" rows={data.analytics.departmentWisePatients} />
          <BarList title="Medicine Sales" rows={data.analytics.medicineSales} />
          <BarList title="Lab Test Statistics" rows={data.analytics.labTestStatistics} />
          <BarList title="Top Doctors" rows={data.analytics.topDoctors} />
          <BarList title="Most Common Diseases" rows={data.analytics.mostCommonDiseases} />
          <BarList title="Most Prescribed Medicines" rows={data.analytics.mostPrescribedMedicines} />
        </div>
      </>
    ),
    users: (
      <DataTable
        title="User Management"
        rows={allUsers}
        columns={["name", "email", "phone", "role", "module", "approvalStatus", "createdAt"]}
        action={(row) => row.role !== "admin" && (
          <>
            <button onClick={() => setUserStatus(row, "approved")}>Allow</button>
            <button onClick={() => setUserStatus(row, "rejected")}>Remove Access</button>
          </>
        )}
      />
    ),
    departments: (
      <div className="two-col">
        <form className="panel" onSubmit={addDepartment}>
          <h2>Department Management</h2>
          <label>Name<input required value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} /></label>
          <label>Type<select value={departmentForm.type} onChange={(event) => setDepartmentForm({ ...departmentForm, type: event.target.value })}>{["clinical", "pharmacy", "lab", "billing", "admin"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Head<input value={departmentForm.head} onChange={(event) => setDepartmentForm({ ...departmentForm, head: event.target.value })} /></label>
          <label>Phone<input value={departmentForm.phone} onChange={(event) => setDepartmentForm({ ...departmentForm, phone: event.target.value })} /></label>
          <button className="primary"><Building2 size={16} />Add Department</button>
        </form>
        <DataTable title="Departments" rows={data.departments} columns={["name", "type", "head", "phone", "status"]} />
      </div>
    ),
    billing: (
      <div className="two-col">
        <DataTable title="Consultation Billing" rows={data.appointments} columns={["opdId", "patientName", "date", "fee", "status"]} />
        <DataTable title="Lab Billing" rows={data.labRequests} columns={["opdId", "patientName", "testName", "price", "status"]} />
        <DataTable title="Pharmacy Billing" rows={data.orders} columns={["opdId", "patientName", "amount", "status", "createdAt"]} />
      </div>
    ),
    lab: (
      <div className="two-col">
        <form className="panel" onSubmit={addLabTest}>
          <h2>Lab Test Management</h2>
          <label>Category<select value={labForm.category} onChange={(event) => setLabForm({ ...labForm, category: event.target.value })}>{["Blood Tests", "Radiology", "Cardiology", "Pathology"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Test Name<input required placeholder="CBC, X-Ray, ECG..." value={labForm.testName} onChange={(event) => setLabForm({ ...labForm, testName: event.target.value })} /></label>
          <label>Price<input type="number" min="0" value={labForm.price} onChange={(event) => setLabForm({ ...labForm, price: event.target.value })} /></label>
          <label>Sample Type<input value={labForm.sampleType} onChange={(event) => setLabForm({ ...labForm, sampleType: event.target.value })} /></label>
          <label>Normal Range<input value={labForm.normalRange} onChange={(event) => setLabForm({ ...labForm, normalRange: event.target.value })} /></label>
          <button className="primary"><FlaskConical size={16} />Add Lab Test</button>
        </form>
        <div>
          <DataTable title="Test Categories" rows={data.labTests} columns={["category", "testName", "price", "sampleType", "normalRange", "status"]} />
          <DataTable title="Manage Technicians" rows={data.labTechnicians} columns={["name", "email", "phone", "approvalStatus", "createdAt"]} action={(row) => row.approvalStatus === "pending" && <><button onClick={() => approve("lab_technician", row, "approved")}>Approve</button><button onClick={() => approve("lab_technician", row, "rejected")}>Reject</button></>} />
          <DataTable title="View Reports" rows={data.labRequests} columns={["opdId", "patientName", "testName", "reportFileName", "status", "createdAt"]} />
        </div>
      </div>
    ),
    pharmacy: (
      <div className="two-col">
        <DataTable title="Medicine Inventory" rows={data.inventory} columns={["name", "category", "batchNo", "quantity", "unitPrice", "expiryDate", "supplier", "status"]} />
        <DataTable title="Pharmacist Access" rows={data.pharmacists} columns={["name", "email", "phone", "approvalStatus", "createdAt"]} action={(row) => row.approvalStatus === "pending" && <><button onClick={() => approve("pharmacist", row, "approved")}>Approve</button><button onClick={() => approve("pharmacist", row, "rejected")}>Reject</button></>} />
      </div>
    ),
    doctors: <DataTable title="Doctors History" rows={data.doctors} columns={["name", "specialty", "hospital", "city", "fee", "approvalStatus", "status"]} action={(row) => row.approvalStatus === "pending" && <><button onClick={() => approve("doctor", row, "approved")}>Approve</button><button onClick={() => approve("doctor", row, "rejected")}>Reject</button></>} />,
    patients: <DataTable title="Patients History" rows={data.patients} columns={["name", "email", "phone", "opdId", "createdAt"]} />,
    audit: (
      <div className="two-col">
        <DataTable title="Audit Logs" rows={data.auditLogs} columns={["actorName", "actorRole", "action", "module", "details", "createdAt"]} />
        <DataTable title="Patient Feedback" rows={data.feedbacks} columns={["opdId", "doctor", "rating", "comments", "createdAt"]} />
      </div>
    )
  };

  return (
    <section className="dashboard admin-theme">
      <PanelTitle title="Super Admin Dashboard" text="Manage users, departments, billing, lab, pharmacy and analytics." />
      <ProfileCard user={user} />
      <div className="admin-tabs">
        {tabs.map((tab) => <button key={tab} className={adminTab === tab ? "active" : ""} onClick={() => setAdminTab(tab)}>{tab}</button>)}
      </div>
      {message && <p className="notice">{message}</p>}
      {views[adminTab]}
    </section>
  );
}
