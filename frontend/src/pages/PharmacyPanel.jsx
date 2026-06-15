import { useEffect, useState } from "react";
import { PackagePlus, Search } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import { PanelTitle, ProfileCard } from "../components/PanelShared.jsx";
import { API } from "../utils/api.js";

export default function PharmacyPanel({ user, authHeaders, requireLogin }) {
  const [opdId, setOpdId] = useState("");
  const [records, setRecords] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("verify");
  const [medicineForm, setMedicineForm] = useState({ name: "", category: "General", batchNo: "", quantity: "", unitPrice: "", expiryDate: "", supplier: "" });
  const [message, setMessage] = useState("");

  const loadPharmacyData = () => {
    fetch(`${API}/pharmacy/inventory`, { headers: authHeaders })
      .then((response) => response.json())
      .then((data) => Array.isArray(data) && setInventory(data))
      .catch(() => {});
    fetch(`${API}/pharmacy/orders`, { headers: authHeaders })
      .then((response) => response.json())
      .then((data) => Array.isArray(data) && setOrders(data))
      .catch(() => {});
  };

  useEffect(() => {
    loadPharmacyData();
  }, []);

  const search = async () => {
    setMessage("");
    const cleanOpd = opdId.trim().toUpperCase();
    if (!cleanOpd) return setMessage("Enter OPD ID to check prescription.");
    const response = await fetch(`${API}/pharmacy/patient/${cleanOpd}`, { headers: authHeaders });
    if (response.status === 401 || response.status === 403) return requireLogin("pharmacist", "pharmacist");
    const data = await response.json();
    setRecords(data);
    if (!data.length) setMessage("No prescription found for this OPD ID yet.");
  };

  const dispense = async (row) => {
    if (row.status === "given" || row.medicineStatus === "given") {
      setMessage("Medicine has already been given for this prescription.");
      return;
    }
    const billAmount = prompt("Enter medicine bill amount", "0");
    if (billAmount === null) return;
    const amount = Number(billAmount || 0);
    const response = await fetch(`${API}/pharmacy/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ appointmentId: row._id, opdId: row.opdId, patientName: row.patientName, medicines: row.medicines || [], amount })
    });
    const data = await response.json();
    if (response.status === 401 || response.status === 403) return requireLogin("pharmacist", "pharmacist");
    if (!response.ok) return setMessage(data.message || "Unable to update medicine status.");

    setRecords((current) => current.map((item) => (item._id === row._id ? data.appointment || { ...item, status: "given", medicineStatus: "given" } : item)));
    setOrders((current) => [data.order, ...current]);
    setMessage(`Medicine given for ${row.patientName}.`);
  };

  const saveMedicine = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API}/pharmacy/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(medicineForm)
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Unable to add medicine.");
    setInventory((current) => [data, ...current]);
    setMedicineForm({ name: "", category: "General", batchNo: "", quantity: "", unitPrice: "", expiryDate: "", supplier: "" });
    setMessage(`${data.name} added to inventory.`);
  };

  return (
    <section className="dashboard pharmacy-theme">
      <PanelTitle title="Pharmacy Panel" text="Search OPD ID, verify prescription and give medicine." />
      <ProfileCard user={user} />
      <div className="admin-tabs">
        {["verify", "inventory", "dispensing"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      {message && <p className="notice">{message}</p>}
      {tab === "verify" && (
        <>
          <div className="panel search-panel">
            <h2>Prescription Verification</h2>
            <div className="inline">
              <input placeholder="OPD10245" value={opdId} onChange={(event) => setOpdId(event.target.value.toUpperCase())} />
              <button className="primary" onClick={search}>
                <Search size={16} />
                Search
              </button>
            </div>
          </div>
          <DataTable
            title="Prescription Records"
            rows={records}
            columns={["opdId", "patientName", "prescription", "medicines", "status"]}
            action={(row) => (row.status === "given" || row.medicineStatus === "given") ? <span>Given</span> : <button onClick={() => dispense(row)}>Give Medicine</button>}
          />
        </>
      )}
      {tab === "inventory" && (
        <div className="two-col">
          <form className="panel" onSubmit={saveMedicine}>
            <h2>Medicine Inventory</h2>
            <label>Medicine Name<input required value={medicineForm.name} onChange={(event) => setMedicineForm({ ...medicineForm, name: event.target.value })} /></label>
            <label>Category<input value={medicineForm.category} onChange={(event) => setMedicineForm({ ...medicineForm, category: event.target.value })} /></label>
            <label>Batch No<input value={medicineForm.batchNo} onChange={(event) => setMedicineForm({ ...medicineForm, batchNo: event.target.value })} /></label>
            <label>Quantity<input type="number" min="0" value={medicineForm.quantity} onChange={(event) => setMedicineForm({ ...medicineForm, quantity: event.target.value })} /></label>
            <label>Unit Price<input type="number" min="0" value={medicineForm.unitPrice} onChange={(event) => setMedicineForm({ ...medicineForm, unitPrice: event.target.value })} /></label>
            <label>Expiry Date<input type="date" value={medicineForm.expiryDate} onChange={(event) => setMedicineForm({ ...medicineForm, expiryDate: event.target.value })} /></label>
            <label>Supplier<input value={medicineForm.supplier} onChange={(event) => setMedicineForm({ ...medicineForm, supplier: event.target.value })} /></label>
            <button className="primary"><PackagePlus size={16} />Add Medicine</button>
          </form>
          <div>
            {inventory.filter((item) => item.quantity <= 10).map((item) => (
              <p className="notice alert" key={item._id}>{item.name} stock below 10 units.</p>
            ))}
            <DataTable title="Current Stock" rows={inventory} columns={["name", "category", "batchNo", "quantity", "unitPrice", "expiryDate", "supplier", "status"]} />
          </div>
        </div>
      )}
      {tab === "dispensing" && <DataTable title="Medicine Dispensing History" rows={orders} columns={["opdId", "patientName", "medicines", "amount", "status", "createdAt"]} />}
    </section>
  );
}
