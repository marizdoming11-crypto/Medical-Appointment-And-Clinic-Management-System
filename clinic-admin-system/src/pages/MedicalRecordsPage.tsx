
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ClipboardList,
  FilePlus2,
  Users,
  Stethoscope,
  Eye,
  X,
  CalendarDays,
  UserRound,
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Save,
  ClipboardCheck
} from "lucide-react";
import "./MedicalRecordsPage.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface MedicalRecord {
  record_id: number;
  patient_id: number;
  doctor_id: number;
  appointment_id: number | null;
  diagnosis: string | null;
  prescription: string | null;
  treatment: string | null;
  remarks: string | null;
  consultation_date: string;
  created_at: string;
  patient_name: string;
  patient_contact: string | null;
  patient_sex: string | null;
  patient_age: number | null;
  doctor_name: string;
  doctor_specialization: string;
  service_name: string | null;
}

interface EligibleAppointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  patient_name: string;
  birth_date: string | null;
  patient_age: number | null;
  sex: string | null;
  contact_number: string | null;
  address: string | null;
  doctor_name: string;
  doctor_specialization: string;
  service_name: string;
}

interface MedicalRecordForm {
  appointment_id: string;
  diagnosis: string;
  prescription: string;
  treatment: string;
  remarks: string;
}

const initialForm: MedicalRecordForm = {
  appointment_id: "",
  diagnosis: "",
  prescription: "",
  treatment: "",
  remarks: ""
};

const formatDate = (date?: string | null) => {
  if (!date) return "N/A";

  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const formatTime = (time?: string | null) => {
  if (!time) return "N/A";

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
};

const getErrorMessage = (data: any, fallback: string) => {
  return typeof data?.message === "string" ? data.message : fallback;
};

export default function MedicalRecordsPage() {
  const navigate = useNavigate();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [eligibleAppointments, setEligibleAppointments] = useState<
    EligibleAppointment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedRecord, setSelectedRecord] =
    useState<MedicalRecord | null>(null);

  const [form, setForm] = useState<MedicalRecordForm>(initialForm);

  const [selectedAppointment, setSelectedAppointment] =
    useState<EligibleAppointment | null>(null);

  const token = sessionStorage.getItem("authToken");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`
    }),
    [token]
  );

  // ========================================
  // LOAD ALL MEDICAL RECORDS
  // ========================================

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/medical-records?search=${encodeURIComponent(search)}`,
        {
          headers: authHeaders
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to load medical records.")
        );
      }

      setRecords(data.records || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load medical records."
      );
    } finally {
      setLoading(false);
    }
  }, [authHeaders, search]);

  useEffect(() => {
    const delay = window.setTimeout(() => {
      fetchRecords();
    }, 300);

    return () => window.clearTimeout(delay);
  }, [fetchRecords]);

  // ========================================
  // LOAD ELIGIBLE APPOINTMENTS
  // ========================================

  const fetchEligibleAppointments = async () => {
    try {
      setLoadingOptions(true);
      setError("");

      const response = await fetch(
        `${API_URL}/medical-records/eligible-appointments`,
        {
          headers: authHeaders
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to load completed appointments."
          )
        );
      }

      setEligibleAppointments(data.appointments || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load completed appointments."
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  // ========================================
  // OPEN CREATE MODAL
  // ========================================

  const openCreateModal = async () => {
    setForm(initialForm);
    setSelectedAppointment(null);
    setShowCreateModal(true);
    setSuccessMessage("");

    await fetchEligibleAppointments();
  };

  // ========================================
  // SELECT APPOINTMENT
  // ========================================

  const handleAppointmentChange = (value: string) => {
    setForm((previous) => ({
      ...previous,
      appointment_id: value
    }));

    const appointment =
      eligibleAppointments.find(
        (item) => String(item.appointment_id) === value
      ) || null;

    setSelectedAppointment(appointment);
  };

  // ========================================
  // CREATE MEDICAL RECORD
  // ========================================

  const handleCreateRecord = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.appointment_id) {
      setError("Please select a completed appointment.");
      return;
    }

    if (!form.diagnosis.trim()) {
      setError("Diagnosis is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`${API_URL}/medical-records`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          appointment_id: Number(form.appointment_id),
          diagnosis: form.diagnosis.trim(),
          prescription: form.prescription.trim(),
          treatment: form.treatment.trim(),
          remarks: form.remarks.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to create medical record.")
        );
      }

      setShowCreateModal(false);
      setForm(initialForm);
      setSelectedAppointment(null);
      setSuccessMessage("Medical record created successfully.");

      await fetchRecords();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create medical record."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // VIEW MEDICAL RECORD
  // ========================================

  const handleViewRecord = async (recordId: number) => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/medical-records/${recordId}`,
        {
          headers: authHeaders
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to load medical record.")
        );
      }

      const record = data.record;

      setSelectedRecord({
        ...record,
        patient_name: [
          record.patient_first_name,
          record.patient_last_name
        ]
          .filter(Boolean)
          .join(" "),
        patient_contact: record.contact_number,
        patient_sex: record.sex,
        patient_age: record.patient_age
      });

      setShowViewModal(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load medical record."
      );
    }
  };

  // ========================================
  // SUMMARY STATISTICS
  // ========================================

  const totalRecords = records.length;

  const uniquePatients = new Set(
    records.map((record) => record.patient_id)
  ).size;

  const uniqueDoctors = new Set(
    records.map((record) => record.doctor_id)
  ).size;

  const latestRecord = records.length
    ? formatDate(records[0].consultation_date)
    : "No records yet";

  return (
    <div className="medical-records-page">

      {/* HEADER */}
      <header className="medical-records-header">
        <div>
          <h1>Medical Records Management</h1>
          <p>
            Manage and maintain patient consultation history and
            medical information.
          </p>
        </div>

        <div className="medical-records-header-actions">
          <button
            className="medical-records-create-btn"
            onClick={openCreateModal}
          >
            <FilePlus2 size={17} />
            Create Medical Record
          </button>

          <button
            className="medical-records-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <button
            className="medical-records-refresh-btn"
            onClick={fetchRecords}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "spinning" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="medical-records-success">
          <CheckCircle2 size={18} />
          {successMessage}
          <button onClick={() => setSuccessMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="medical-records-error">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <section className="medical-records-stats">

        <div className="medical-records-stat-card">
          <div className="medical-records-stat-icon blue">
            <ClipboardList size={24} />
          </div>
          <div className="medical-records-stat-info">
            <p>Total Medical Records</p>
            <h2>{totalRecords}</h2>
          </div>
        </div>

        <div className="medical-records-stat-card">
          <div className="medical-records-stat-icon green">
            <Users size={24} />
          </div>
          <div className="medical-records-stat-info">
            <p>Patients with Records</p>
            <h2>{uniquePatients}</h2>
          </div>
        </div>

        <div className="medical-records-stat-card">
          <div className="medical-records-stat-icon purple">
            <Stethoscope size={24} />
          </div>
          <div className="medical-records-stat-info">
            <p>Attending Doctors</p>
            <h2>{uniqueDoctors}</h2>
          </div>
        </div>

        <div className="medical-records-stat-card">
          <div className="medical-records-stat-icon orange">
            <CalendarDays size={24} />
          </div>
          <div className="medical-records-stat-info">
            <p>Latest Consultation</p>
            <h2 className="medical-records-latest">
              {latestRecord}
            </h2>
          </div>
        </div>

      </section>

      {/* RECORDS TABLE */}
      <section className="medical-records-panel">

        <div className="medical-records-panel-header">
          <div>
            <h2>Patient Medical History</h2>
            <p>
              Review and manage saved patient medical records.
            </p>
          </div>
        </div>

        <div className="medical-records-controls">
          <div className="medical-records-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by record ID, patient or doctor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="medical-records-table-wrapper">
          <table className="medical-records-table">
            <thead>
              <tr>
                <th>RECORD ID</th>
                <th>PATIENT</th>
                <th>DOCTOR</th>
                <th>SERVICE</th>
                <th>CONSULTATION DATE</th>
                <th>DIAGNOSIS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="medical-records-empty">
                    <LoaderCircle className="spinning" size={27} />
                    <p>Loading medical records...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="medical-records-empty">
                    <ClipboardList size={35} />
                    <h3>No medical records found.</h3>
                    <p>
                      Create a medical record from a completed appointment.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.record_id}>
                    <td>
                      <span className="medical-record-id">
                        MR-{String(record.record_id).padStart(4, "0")}
                      </span>
                    </td>

                    <td>
                      <div className="medical-record-person">
                        <strong>{record.patient_name}</strong>
                        <small>
                          {record.patient_contact || "No contact number"}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className="medical-record-person">
                        <strong>{record.doctor_name}</strong>
                        <small>
                          {record.doctor_specialization || "Doctor"}
                        </small>
                      </div>
                    </td>

                    <td>{record.service_name || "N/A"}</td>

                    <td>{formatDate(record.consultation_date)}</td>

                    <td>
                      <span className="medical-record-diagnosis">
                        {record.diagnosis || "Not specified"}
                      </span>
                    </td>

                    <td>
                      <button
                        className="medical-record-view-btn"
                        onClick={() => handleViewRecord(record.record_id)}
                        title="View medical record"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="medical-records-table-footer">
          Showing {records.length} medical record(s)
        </div>

      </section>

      {/* ========================================
          CREATE MEDICAL RECORD MODAL
      ======================================== */}

      {showCreateModal && (
        <div className="medical-records-modal-overlay">
          <div className="medical-records-modal">

            <div className="medical-records-modal-header">
              <div>
                <h2>Create Medical Record</h2>
                <p>
                  Encode the medical findings documented by the doctor.
                </p>
              </div>

              <button
                className="medical-records-modal-close"
                onClick={() => setShowCreateModal(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRecord}>
              <div className="medical-records-modal-body">

                <div className="medical-records-form-section">
                  <h3>
                    <CalendarDays size={17} />
                    Select Completed Appointment
                  </h3>

                  <div className="medical-records-form-group">
                    <label>
                      Completed Appointment <span>*</span>
                    </label>

                    <select
                      value={form.appointment_id}
                      onChange={(event) =>
                        handleAppointmentChange(event.target.value)
                      }
                      required
                      disabled={loadingOptions}
                    >
                      <option value="">
                        {loadingOptions
                          ? "Loading appointments..."
                          : "Select a completed appointment"}
                      </option>

                      {eligibleAppointments.map((appointment) => (
                        <option
                          key={appointment.appointment_id}
                          value={appointment.appointment_id}
                        >
                          Appointment #{appointment.appointment_id} —{" "}
                          {appointment.patient_name} —{" "}
                          {formatDate(appointment.appointment_date)}
                        </option>
                      ))}
                    </select>

                    {eligibleAppointments.length === 0 &&
                      !loadingOptions && (
                        <small className="medical-records-help">
                          No completed appointments are available for
                          medical record creation.
                        </small>
                      )}
                  </div>
                </div>

                {/* AUTOMATIC PATIENT AND DOCTOR INFORMATION */}
                {selectedAppointment && (
                  <div className="medical-records-selected-info">

                    <div className="medical-records-form-section">
                      <h3>
                        <UserRound size={17} />
                        Patient Information
                      </h3>

                      <div className="medical-records-info-grid">
                        <div>
                          <label>Patient Name</label>
                          <p>{selectedAppointment.patient_name}</p>
                        </div>

                        <div>
                          <label>Age</label>
                          <p>
                            {selectedAppointment.patient_age ?? "N/A"}
                          </p>
                        </div>

                        <div>
                          <label>Sex</label>
                          <p>{selectedAppointment.sex || "N/A"}</p>
                        </div>

                        <div>
                          <label>Contact Number</label>
                          <p>
                            {selectedAppointment.contact_number || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="medical-records-form-section">
                      <h3>
                        <Stethoscope size={17} />
                        Consultation Information
                      </h3>

                      <div className="medical-records-info-grid">
                        <div>
                          <label>Attending Doctor</label>
                          <p>{selectedAppointment.doctor_name}</p>
                        </div>

                        <div>
                          <label>Specialization</label>
                          <p>
                            {selectedAppointment.doctor_specialization}
                          </p>
                        </div>

                        <div>
                          <label>Service</label>
                          <p>{selectedAppointment.service_name}</p>
                        </div>

                        <div>
                          <label>Consultation Date</label>
                          <p>
                            {formatDate(selectedAppointment.appointment_date)}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* MEDICAL FINDINGS */}
                <div className="medical-records-form-section">
                  <h3>
                    <FileText size={17} />
                    Medical Findings
                  </h3>

                  <p className="medical-records-section-note">
                    Enter the findings based on the doctor's actual
                    assessment and documented instructions.
                  </p>

                  <div className="medical-records-form-group">
                    <label>
                      Diagnosis <span>*</span>
                    </label>

                    <textarea
                      rows={3}
                      placeholder="Enter the diagnosis provided by the doctor..."
                      value={form.diagnosis}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          diagnosis: event.target.value
                        })
                      }
                      required
                    />
                  </div>

                  <div className="medical-records-form-group">
                    <label>Prescription</label>

                    <textarea
                      rows={3}
                      placeholder="Enter the doctor's prescribed medication and instructions..."
                      value={form.prescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          prescription: event.target.value
                        })
                      }
                    />
                  </div>

                  <div className="medical-records-form-group">
                    <label>Treatment</label>

                    <textarea
                      rows={3}
                      placeholder="Enter the treatment or procedure recommended by the doctor..."
                      value={form.treatment}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          treatment: event.target.value
                        })
                      }
                    />
                  </div>

                  <div className="medical-records-form-group">
                    <label>Remarks</label>

                    <textarea
                      rows={3}
                      placeholder="Enter additional clinical notes or instructions..."
                      value={form.remarks}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          remarks: event.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <div className="medical-records-notice">
                  <AlertCircle size={17} />
                  <p>
                    The administrator must encode only the medical
                    findings provided or documented by the attending
                    doctor.
                  </p>
                </div>

                {error && (
                  <div className="medical-records-error">
                    <AlertCircle size={17} />
                    {error}
                  </div>
                )}

              </div>

              <div className="medical-records-modal-footer">
                <button
                  type="button"
                  className="medical-records-btn secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="medical-records-btn primary"
                  disabled={saving || loadingOptions}
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="spinning" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Medical Record
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================
          VIEW MEDICAL RECORD MODAL
      ======================================== */}

      {showViewModal && selectedRecord && (
        <div className="medical-records-modal-overlay">
          <div className="medical-records-modal view">

            <div className="medical-records-modal-header">
              <div>
                <h2>Medical Record Details</h2>
                <p>
                  MR-{String(selectedRecord.record_id).padStart(4, "0")}
                </p>
              </div>

              <button
                className="medical-records-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="medical-records-modal-body">

              <div className="medical-records-form-section">
                <h3>
                  <UserRound size={17} />
                  Patient Information
                </h3>

                <div className="medical-records-info-grid">
                  <div>
                    <label>Patient Name</label>
                    <p>
                      {selectedRecord.patient_name ||
                        [
                          (selectedRecord as any).patient_first_name,
                          (selectedRecord as any).patient_last_name
                        ]
                          .filter(Boolean)
                          .join(" ")}
                    </p>
                  </div>

                  <div>
                    <label>Age</label>
                    <p>{selectedRecord.patient_age ?? "N/A"}</p>
                  </div>

                  <div>
                    <label>Sex</label>
                    <p>{selectedRecord.patient_sex || "N/A"}</p>
                  </div>

                  <div>
                    <label>Contact Number</label>
                    <p>{selectedRecord.patient_contact || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="medical-records-form-section">
                <h3>
                  <Stethoscope size={17} />
                  Consultation Information
                </h3>

                <div className="medical-records-info-grid">
                  <div>
                    <label>Attending Doctor</label>
                    <p>{selectedRecord.doctor_name || "N/A"}</p>
                  </div>

                  <div>
                    <label>Specialization</label>
                    <p>
                      {selectedRecord.doctor_specialization || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label>Service</label>
                    <p>{selectedRecord.service_name || "N/A"}</p>
                  </div>

                  <div>
                    <label>Consultation Date</label>
                    <p>{formatDate(selectedRecord.consultation_date)}</p>
                  </div>
                </div>
              </div>

              <div className="medical-records-form-section">
                <h3>
                  <ClipboardCheck size={17} />
                  Medical Findings
                </h3>

                <div className="medical-records-view-field">
                  <label>Diagnosis</label>
                  <p>{selectedRecord.diagnosis || "Not provided"}</p>
                </div>

                <div className="medical-records-view-field">
                  <label>Prescription</label>
                  <p>{selectedRecord.prescription || "Not provided"}</p>
                </div>

                <div className="medical-records-view-field">
                  <label>Treatment</label>
                  <p>{selectedRecord.treatment || "Not provided"}</p>
                </div>

                <div className="medical-records-view-field">
                  <label>Remarks</label>
                  <p>{selectedRecord.remarks || "No additional remarks"}</p>
                </div>
              </div>

            </div>

            <div className="medical-records-modal-footer">
              <button
                className="medical-records-btn secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
