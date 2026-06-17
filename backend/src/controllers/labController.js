import Appointment from "../models/Appointment.js";
import LabRequest from "../models/LabRequest.js";
import LabTestCategory from "../models/LabTestCategory.js";
import { createAudit, notifyUsers } from "../utils/activity.js";

const defaultTests = [
  ["Blood Tests", "CBC", 450, "Blood", "Normal"],
  ["Blood Tests", "Sugar", 180, "Blood", "70-140 mg/dL"],
  ["Blood Tests", "Lipid Profile", 900, "Blood", "Normal"],
  ["Radiology", "X-Ray", 700, "Imaging", "Normal"],
  ["Radiology", "MRI", 4500, "Imaging", "Normal"],
  ["Radiology", "CT Scan", 3500, "Imaging", "Normal"],
  ["Cardiology", "ECG", 500, "Cardiac", "Normal"],
  ["Cardiology", "Echo", 1800, "Cardiac", "Normal"],
  ["Pathology", "Urine Test", 250, "Urine", "Normal"],
  ["Pathology", "Stool Test", 300, "Stool", "Normal"]
];

async function ensureDefaultTests() {
  const count = await LabTestCategory.countDocuments();
  if (count) return;

  await LabTestCategory.insertMany(
    defaultTests.map(([category, testName, price, sampleType, normalRange]) => ({
      category,
      testName,
      price,
      sampleType,
      normalRange
    }))
  );
}

function labReportHtml(request) {
  const rows = (request.results || []).map((item) => `
    <tr><td>${item.parameter || "-"}</td><td>${item.value || "-"}</td><td>${item.unit || "-"}</td><td>${item.status || "-"}</td></tr>
  `).join("");

  return `<!doctype html>
    <html>
      <head>
        <title>${request.opdId} ${request.testName} Report</title>
        <style>
          body{font-family:Arial,sans-serif;color:#10243f;margin:32px}
          header{border-bottom:2px solid #1768c9;margin-bottom:20px;padding-bottom:12px}
          h1{margin:0;color:#1768c9} table{width:100%;border-collapse:collapse;margin-top:18px}
          td,th{border:1px solid #d7e0ec;padding:10px;text-align:left} th{background:#eef6ff}
          .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:16px}
          @media print{button{display:none} body{margin:18px}}
        </style>
      </head>
      <body>
        <button onclick="window.print()">Download PDF</button>
        <header><h1>MediBridge Lab Report</h1><p>${request.testName} - ${request.category || ""}</p></header>
        <section class="meta">
          <strong>OPD ID: ${request.opdId}</strong><strong>Patient: ${request.patientName}</strong>
          <span>Doctor: ${request.doctor?.name || "-"}</span><span>Status: ${request.status}</span>
          <span>Booked: ${request.bookingDate || "-"}</span><span>Reported: ${request.processedAt ? request.processedAt.toISOString().slice(0, 10) : "-"}</span>
        </section>
        <table><thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No result parameters entered.</td></tr>"}</tbody></table>
        <p><strong>Remarks:</strong> ${request.remarks || "-"}</p>
      </body>
    </html>`;
}

export async function getLabTests(_req, res) {
  await ensureDefaultTests();
  res.json(await LabTestCategory.find().sort({ category: 1, testName: 1 }));
}

export async function createLabTest(req, res) {
  const test = await LabTestCategory.create(req.body);
  res.status(201).json(test);
}

export async function updateLabTest(req, res) {
  const test = await LabTestCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!test) return res.status(404).json({ message: "Lab test not found." });
  res.json(test);
}

export async function createLabRequest(req, res) {
  const { appointmentId, testId, remarks } = req.body;
  const [appointment, test] = await Promise.all([
    Appointment.findById(appointmentId).populate("doctor"),
    LabTestCategory.findById(testId)
  ]);

  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (!test) return res.status(404).json({ message: "Lab test not found." });

  const request = await LabRequest.create({
    opdId: appointment.opdId,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    patientPhone: appointment.patientPhone,
    doctor: appointment.doctor?._id || appointment.doctor,
    appointment: appointment._id,
    test: test._id,
    testName: test.testName,
    category: test.category,
    price: test.price,
    remarks
  });

  await Promise.all([
    notifyUsers({ role: "lab_technician", approvalStatus: "approved" }, {
      title: "New test assigned",
      message: `${test.testName} assigned for ${appointment.opdId}.`,
      module: "lab",
      refId: request._id
    }),
    notifyUsers({ email: appointment.patientEmail }, {
      title: "Lab test prescribed",
      message: `${test.testName} prescribed for ${appointment.opdId}.`,
      module: "lab",
      refId: request._id
    }),
    createAudit(req.user, "Doctor prescribed lab test", "lab", request._id, `${test.testName} ${appointment.opdId}`)
  ]);

  res.status(201).json(await request.populate(["doctor", "test", "appointment"]));
}

export async function getLabRequests(req, res) {
  const filter = req.user.role === "doctor" && req.user.doctorId ? { doctor: req.user.doctorId } : {};
  res.json(await LabRequest.find(filter).populate(["doctor", "test", "appointment", "technician"]).sort({ createdAt: -1 }));
}

export async function getMyLabRequests(req, res) {
  res.json(await LabRequest.find({ patientEmail: req.user.email }).populate(["doctor", "test"]).sort({ createdAt: -1 }));
}

export async function getDoctorLabRequests(_req, res) {
  res.json(await LabRequest.find({ patientEmail: { $exists: true } }).populate(["doctor", "test", "appointment"]).sort({ createdAt: -1 }));
}

export async function bookLabRequest(req, res) {
  const filter = req.user.role === "patient" ? { _id: req.params.id, patientEmail: req.user.email } : { _id: req.params.id };
  const request = await LabRequest.findOneAndUpdate(filter, { bookingDate: req.body.bookingDate, status: "booked" }, { new: true }).populate(["doctor", "test"]);
  if (!request) return res.status(404).json({ message: "Lab request not found." });
  res.json(request);
}

export async function collectLabSample(req, res) {
  const request = await LabRequest.findByIdAndUpdate(
    req.params.id,
    { sampleCollectedAt: new Date(), status: "sample_collected", technician: req.user._id },
    { new: true }
  ).populate(["doctor", "test", "technician"]);
  if (!request) return res.status(404).json({ message: "Lab request not found." });
  await createAudit(req.user, "Lab collected sample", "lab", request._id, request.opdId);
  res.json(request);
}

export async function updateLabResults(req, res) {
  const request = await LabRequest.findByIdAndUpdate(
    req.params.id,
    {
      results: req.body.results || [],
      remarks: req.body.remarks,
      reportUrl: req.body.reportUrl,
      reportFileName: req.body.reportFileName,
      reportMimeType: req.body.reportMimeType,
      reportData: req.body.reportData,
      processedAt: new Date(),
      status: "reported",
      technician: req.user._id
    },
    { new: true }
  ).populate(["doctor", "test", "technician"]);
  if (!request) return res.status(404).json({ message: "Lab request not found." });
  await Promise.all([
    notifyUsers({ email: request.patientEmail }, {
      title: "Lab report uploaded",
      message: `${request.testName} report uploaded for ${request.opdId}.`,
      module: "lab",
      refId: request._id
    }),
    createAudit(req.user, "Lab uploaded report", "lab", request._id, `${request.testName} ${request.opdId}`)
  ]);
  res.json(request);
}

export async function reviewLabRequest(req, res) {
  const request = await LabRequest.findByIdAndUpdate(
    req.params.id,
    { reviewedAt: new Date(), status: "reviewed", remarks: req.body.remarks },
    { new: true }
  ).populate(["doctor", "test", "technician"]);
  if (!request) return res.status(404).json({ message: "Lab request not found." });
  await createAudit(req.user, "Doctor reviewed lab report", "lab", request._id, request.opdId);
  res.json(request);
}

export async function getLabReport(req, res) {
  const filter = req.user.role === "patient"
    ? { _id: req.params.id, patientEmail: req.user.email }
    : { _id: req.params.id };
  const request = await LabRequest.findOne(filter).populate(["doctor", "test", "technician"]);
  if (!request) return res.status(404).send("Lab report not found.");

  res.type("html").send(labReportHtml(request));
}

export async function getLabReportFile(req, res) {
  const filter = req.user.role === "patient"
    ? { _id: req.params.id, patientEmail: req.user.email }
    : { _id: req.params.id };
  const request = await LabRequest.findOne(filter);
  if (!request) return res.status(404).send("Lab report not found.");
  if (!request.reportData) return res.type("html").send(labReportHtml(request));

  const buffer = Buffer.from(request.reportData, "base64");
  res.setHeader("Content-Type", request.reportMimeType || "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${request.reportFileName || `${request.testName}-report.pdf`}"`);
  res.send(buffer);
}
