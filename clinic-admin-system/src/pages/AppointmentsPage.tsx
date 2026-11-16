
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Search,
  ArrowLeft,
  CalendarDays,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  ClipboardList,
  X,
  AlertCircle,
  Stethoscope,
  User,
  FileText,
  Filter,
  Check,
  Plus,
  UserPlus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import "./AppointmentsPage.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type AppointmentStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Completed";

interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  schedule_id?: number | null;

  appointment_date: string;
  appointment_time: string;
  reason?: string | null;
  status: AppointmentStatus;
  admin_remarks?: string | null;
  created_at?: string;

  patient_name?: string;
  patient_first_name?: string;
  patient_middle_name?: string | null;
  patient_last_name?: string;
  patient_email?: string;
  patient_contact?: string;

  doctor_name?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  doctor_email?: string;

  service_name?: string;
}

interface AppointmentResponse {
  success: boolean;
  total?: number;
  appointments?: Appointment[];
  appointment?: Appointment;
  message?: string;
}

interface PatientOption {
  patient_id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  contact_number?: string | null;
}

interface DoctorOption {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization?: string;
  status: string;
}

interface ServiceOption {
  service_id: number;
  service_name: string;
}

interface AppointmentFormOptions {
  success: boolean;
  patients: PatientOption[];
  doctors: DoctorOption[];
  services: ServiceOption[];
  message?: string;
}

const statusOptions = [
  "All",
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
  "Completed",
];

function AppointmentsPage() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [newStatus, setNewStatus] =
    useState<AppointmentStatus>("Approved");

  const [adminRemarks, setAdminRemarks] = useState("");
  const [updating, setUpdating] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formOptionsLoading, setFormOptionsLoading] = useState(false);
  const [formOptions, setFormOptions] = useState<AppointmentFormOptions>({
    success: true,
    patients: [],
    doctors: [],
    services: [],
  });
  const [patientType, setPatientType] = useState<"existing" | "walkin">("existing");
  const [createForm, setCreateForm] = useState({
    patient_id: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    birth_date: "",
    sex: "",
    contact_number: "",
    address: "",
    doctor_id: "",
    service_id: "",
    appointment_date: "",
    appointment_time: "",
    reason: "",
  });

  const token = sessionStorage.getItem("authToken");

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  // ==========================================
  // FETCH APPOINTMENTS
  // ==========================================

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (statusFilter !== "All") {
        params.append("status", statusFilter);
      }

      if (dateFilter) {
        params.append("date", dateFilter);
      }

      const response = await fetch(
        `${API_URL}/appointments?${params.toString()}`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      const data: AppointmentResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load appointments."
        );
      }

      setAppointments(data.appointments || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading appointments."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, token]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ==========================================
  // CREATE APPOINTMENT
  // ==========================================

  const openCreateModal = async () => {
    setError("");
    setFormOptionsLoading(true);

    try {
      const response = await fetch(`${API_URL}/appointments/form-options`, {
        method: "GET",
        headers: getHeaders(),
      });

      const data: AppointmentFormOptions = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load appointment form options.");
      }

      setFormOptions(data);
      setCreateForm({
        patient_id: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        birth_date: "",
        sex: "",
        contact_number: "",
        address: "",
        doctor_id: "",
        service_id: "",
        appointment_date: "",
        appointment_time: "",
        reason: "",
      });
      setPatientType("existing");
      setShowCreateModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open appointment form.");
    } finally {
      setFormOptionsLoading(false);
    }
  };

  const handleCreateAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createForm.doctor_id || !createForm.service_id ||
        !createForm.appointment_date || !createForm.appointment_time) {
      setError("Please complete the doctor, service, date, and time fields.");
      return;
    }

    if (patientType === "existing" && !createForm.patient_id) {
      setError("Please select an existing patient.");
      return;
    }

    if (patientType === "walkin") {
      if (!createForm.first_name.trim() || !createForm.last_name.trim()) {
        setError("Walk-in patient's first name and last name are required.");
        return;
      }
      if (!/^09\d{9}$/.test(createForm.contact_number.trim())) {
        setError("Contact number must contain 11 digits and start with 09.");
        return;
      }
    }

    try {
      setCreating(true);
      setError("");

      const payload = {
        patient_type: patientType,
        ...(patientType === "existing"
          ? { patient_id: Number(createForm.patient_id) }
          : {
              patient: {
                first_name: createForm.first_name.trim(),
                middle_name: createForm.middle_name.trim() || null,
                last_name: createForm.last_name.trim(),
                birth_date: createForm.birth_date || null,
                sex: createForm.sex || null,
                contact_number: createForm.contact_number.trim(),
                address: createForm.address.trim() || null,
              },
            }),
        doctor_id: Number(createForm.doctor_id),
        service_id: Number(createForm.service_id),
        appointment_date: createForm.appointment_date,
        appointment_time: createForm.appointment_time,
        reason: createForm.reason.trim() || null,
      };

      const response = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to create appointment.");
      }

      setShowCreateModal(false);
      await fetchAppointments();
      setError("");
      window.alert(data.message || "Appointment created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create appointment.");
    } finally {
      setCreating(false);
    }
  };

  // ==========================================
  // FETCH APPOINTMENT DETAILS
  // ==========================================

  const handleViewAppointment = async (id: number) => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/appointments/${id}`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      const data: AppointmentResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to retrieve appointment details."
        );
      }

      setSelectedAppointment(
        data.appointment ||
          appointments.find(
            (appointment) => appointment.appointment_id === id
          ) ||
          null
      );

      setShowViewModal(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to retrieve appointment details."
      );
    }
  };

  // ==========================================
  // OPEN STATUS UPDATE MODAL
  // ==========================================

  const openStatusModal = (
    appointment: Appointment,
    status: AppointmentStatus
  ) => {
    setSelectedAppointment(appointment);
    setNewStatus(status);
    setAdminRemarks(appointment.admin_remarks || "");
    setShowStatusModal(true);
  };

  // ==========================================
  // UPDATE APPOINTMENT STATUS
  // ==========================================

  const handleUpdateStatus = async () => {
    if (!selectedAppointment) return;

    try {
      setUpdating(true);
      setError("");

      const response = await fetch(
        `${API_URL}/appointments/${selectedAppointment.appointment_id}/status`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            status: newStatus,
            admin_remarks: adminRemarks.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update appointment status."
        );
      }

      setShowStatusModal(false);
      setSelectedAppointment(null);
      setAdminRemarks("");

      await fetchAppointments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update appointment."
      );
    } finally {
      setUpdating(false);
    }
  };

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const getPatientName = (appointment: Appointment) => {
    if (appointment.patient_name) {
      return appointment.patient_name;
    }

    return [
      appointment.patient_first_name,
      appointment.patient_middle_name,
      appointment.patient_last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Unknown Patient";
  };

  const getDoctorName = (appointment: Appointment) => {
    if (appointment.doctor_name) {
      return appointment.doctor_name;
    }

    return [
      appointment.doctor_first_name,
      appointment.doctor_last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Unknown Doctor";
  };

  const formatDate = (date: string) => {
    if (!date) return "N/A";

    const normalizedDate = date.includes("T")
      ? date
      : `${date}T00:00:00`;

    return new Date(normalizedDate).toLocaleDateString(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  const formatTime = (time: string) => {
    if (!time) return "N/A";

    const [hours, minutes] = time.split(":");
    const date = new Date();

    date.setHours(Number(hours), Number(minutes), 0);

    return date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "pending";

      case "Approved":
        return "approved";

      case "Rejected":
        return "rejected";

      case "Cancelled":
        return "cancelled";

      case "Completed":
        return "completed";

      default:
        return "";
    }
  };

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalAppointments = appointments.length;

  const pendingAppointments = appointments.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedAppointments = appointments.filter(
    (item) => item.status === "Approved"
  ).length;

  const completedAppointments = appointments.filter(
    (item) => item.status === "Completed"
  ).length;

  // ==========================================
  // ACTION BUTTONS
  // ==========================================

  const renderActions = (appointment: Appointment) => {
    return (
      <div className="appointment-actions">
        <button
          type="button"
          className="appointment-action-btn view"
          title="View Appointment"
          onClick={() =>
            handleViewAppointment(appointment.appointment_id)
          }
        >
          <Eye size={16} />
        </button>

        {appointment.status === "Pending" && (
          <>
            <button
              type="button"
              className="appointment-action-btn approve"
              title="Approve Appointment"
              onClick={() =>
                openStatusModal(appointment, "Approved")
              }
            >
              <CheckCircle size={16} />
            </button>

            <button
              type="button"
              className="appointment-action-btn reject"
              title="Reject Appointment"
              onClick={() =>
                openStatusModal(appointment, "Rejected")
              }
            >
              <XCircle size={16} />
            </button>
          </>
        )}

        {appointment.status === "Approved" && (
          <>
            <button
              type="button"
              className="appointment-action-btn complete"
              title="Mark as Completed"
              onClick={() =>
                openStatusModal(appointment, "Completed")
              }
            >
              <Check size={16} />
            </button>

            <button
              type="button"
              className="appointment-action-btn cancel"
              title="Cancel Appointment"
              onClick={() =>
                openStatusModal(appointment, "Cancelled")
              }
            >
              <XCircle size={16} />
            </button>
          </>
        )}
      </div>
    );
  };

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="appointments-page">
      {/* HEADER */}
      <div className="appointments-header">
        <div>
          <h1>Appointments Management</h1>
          <p>
            Manage patient booking requests and appointment schedules.
          </p>
        </div>

        <div className="appointments-header-actions">
          <button
            type="button"
            className="appointments-create-btn"
            onClick={openCreateModal}
            disabled={formOptionsLoading}
          >
            <Plus size={17} />
            {formOptionsLoading ? "Loading..." : "Create Appointment"}
          </button>

          <button
            type="button"
            className="appointments-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <button
            type="button"
            className="appointments-refresh"
            onClick={fetchAppointments}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="appointments-error">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="appointments-stats">
        <div className="appointments-stat-card">
          <div className="appointments-stat-icon blue">
            <ClipboardList size={22} />
          </div>

          <div>
            <p>Total Appointments</p>
            <h2>{totalAppointments}</h2>
          </div>
        </div>

        <div className="appointments-stat-card">
          <div className="appointments-stat-icon orange">
            <Clock size={22} />
          </div>

          <div>
            <p>Pending Requests</p>
            <h2>{pendingAppointments}</h2>
          </div>
        </div>

        <div className="appointments-stat-card">
          <div className="appointments-stat-icon green">
            <CheckCircle size={22} />
          </div>

          <div>
            <p>Approved</p>
            <h2>{approvedAppointments}</h2>
          </div>
        </div>

        <div className="appointments-stat-card">
          <div className="appointments-stat-icon purple">
            <Users size={22} />
          </div>

          <div>
            <p>Completed</p>
            <h2>{completedAppointments}</h2>
          </div>
        </div>
      </div>

      {/* APPOINTMENTS TABLE SECTION */}
      <div className="appointments-panel">
        <div className="appointments-panel-header">
          <div>
            <h2>Appointment Records</h2>
            <p>
              Review and manage all patient appointments.
            </p>
          </div>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="appointments-controls">
          <div className="appointments-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search patient, doctor, service or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="appointments-filter">
            <Filter size={17} />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "All"
                    ? "All Statuses"
                    : status}
                </option>
              ))}
            </select>
          </div>

          <div className="appointments-date">
            <CalendarDays size={17} />

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="appointments-table-wrapper">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="appointments-empty">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="appointments-empty">
                    <CalendarDays size={32} />

                    <p>No appointments found.</p>
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr key={appointment.appointment_id}>
                    <td>
                      <strong className="appointment-id">
                        #{appointment.appointment_id}
                      </strong>
                    </td>

                    <td>
                      <div className="appointment-person">
                        <strong>
                          {getPatientName(appointment)}
                        </strong>

                        <small>
                          {appointment.patient_email || "No email"}
                        </small>
                      </div>
                    </td>

                    <td>
                      {getDoctorName(appointment)}
                    </td>

                    <td>
                      {appointment.service_name || "N/A"}
                    </td>

                    <td>
                      {formatDate(appointment.appointment_date)}
                    </td>

                    <td>
                      {formatTime(appointment.appointment_time)}
                    </td>

                    <td>
                      <span
                        className={`appointment-status-badge ${getStatusClass(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </td>

                    <td>
                      {renderActions(appointment)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="appointments-table-footer">
          Showing {appointments.length} appointment
          {appointments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ======================================
          CREATE APPOINTMENT MODAL
      ====================================== */}

      {showCreateModal && (
        <div className="appointments-modal-overlay">
          <div className="appointments-modal create-appointment-modal">
            <div className="appointments-modal-header">
              <div>
                <h2>Create Appointment</h2>
                <p>Register a booking for an existing or walk-in patient.</p>
              </div>
              <button
                type="button"
                className="appointments-modal-close"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment}>
              <div className="appointments-modal-body">
                <div className="appointments-form-group">
                  <label>Patient Type</label>
                  <div className="appointment-patient-type">
                    <button
                      type="button"
                      className={patientType === "existing" ? "selected" : ""}
                      onClick={() => setPatientType("existing")}
                      disabled={creating}
                    >
                      <Users size={16} /> Existing Patient
                    </button>
                    <button
                      type="button"
                      className={patientType === "walkin" ? "selected" : ""}
                      onClick={() => setPatientType("walkin")}
                      disabled={creating}
                    >
                      <UserPlus size={16} /> Walk-in Patient
                    </button>
                  </div>
                </div>

                {patientType === "existing" ? (
                  <div className="appointments-form-group">
                    <label htmlFor="appointment-patient">Select Patient *</label>
                    <select
                      id="appointment-patient"
                      value={createForm.patient_id}
                      onChange={(e) => setCreateForm({ ...createForm, patient_id: e.target.value })}
                      required
                      disabled={creating}
                    >
                      <option value="">Choose a patient</option>
                      {formOptions.patients.map((patient) => (
                        <option key={patient.patient_id} value={patient.patient_id}>
                          {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ""}
                          {patient.last_name} — #{patient.patient_id}
                        </option>
                      ))}
                    </select>
                    {formOptions.patients.length === 0 && (
                      <small className="appointment-form-hint">No patient records found.</small>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="appointment-form-section-title">
                      <UserPlus size={17} /> Walk-in Patient Information
                    </div>
                    <div className="appointment-form-grid">
                      <div className="appointments-form-group">
                        <label>First Name *</label>
                        <input value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} required />
                      </div>
                      <div className="appointments-form-group">
                        <label>Middle Name</label>
                        <input value={createForm.middle_name} onChange={(e) => setCreateForm({ ...createForm, middle_name: e.target.value })} />
                      </div>
                      <div className="appointments-form-group">
                        <label>Last Name *</label>
                        <input value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} required />
                      </div>
                      <div className="appointments-form-group">
                        <label>Contact Number *</label>
                        <input
                          value={createForm.contact_number}
                         onChange={(e) =>
  setCreateForm({
    ...createForm,
    contact_number: e.target.value.replace(/\D/g, "").slice(0, 11)
  })
}
                          inputMode="numeric"
                          maxLength={11}
                          required
                        />
                      </div>
                      <div className="appointments-form-group">
                        <label>Birth Date</label>
                        <input type="date" value={createForm.birth_date} onChange={(e) => setCreateForm({ ...createForm, birth_date: e.target.value })} />
                      </div>
                      <div className="appointments-form-group">
                        <label>Sex</label>
                        <select value={createForm.sex} onChange={(e) => setCreateForm({ ...createForm, sex: e.target.value })}>
                          <option value="">Select sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="appointments-form-group">
                      <label>Address</label>
                      <textarea rows={2} value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} />
                    </div>
                  </>
                )}

                <div className="appointment-form-section-title">
                  <CalendarDays size={17} /> Appointment Information
                </div>
                <div className="appointment-form-grid">
                  <div className="appointments-form-group">
                    <label>Doctor *</label>
                    <select value={createForm.doctor_id} onChange={(e) => setCreateForm({ ...createForm, doctor_id: e.target.value })} required>
                      <option value="">Select available doctor</option>
                      {formOptions.doctors.filter((doctor) => doctor.status === "Available").map((doctor) => (
                        <option key={doctor.doctor_id} value={doctor.doctor_id}>
                          Dr. {doctor.first_name} {doctor.last_name}{doctor.specialization ? ` — ${doctor.specialization}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="appointments-form-group">
                    <label>Service *</label>
                    <select value={createForm.service_id} onChange={(e) => setCreateForm({ ...createForm, service_id: e.target.value })} required>
                      <option value="">Select service</option>
                      {formOptions.services.map((service) => (
                        <option key={service.service_id} value={service.service_id}>{service.service_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="appointments-form-group">
                    <label>Appointment Date *</label>
                    <input
                      type="date"
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
                      value={createForm.appointment_date}
                      onChange={(e) => setCreateForm({ ...createForm, appointment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="appointments-form-group">
                    <label>Appointment Time *</label>
                    <input type="time" value={createForm.appointment_time} onChange={(e) => setCreateForm({ ...createForm, appointment_time: e.target.value })} required />
                  </div>
                </div>

                <div className="appointments-form-group">
                  <label>Reason for Appointment</label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for consultation..."
                    value={createForm.reason}
                    onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  />
                </div>

                <p className="appointment-form-hint">
                  Appointments created by the administrator are automatically marked as Approved.
                </p>
              </div>

              <div className="appointments-modal-footer">
                <button type="button" className="appointments-btn secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="appointments-btn primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================
          VIEW APPOINTMENT MODAL
      ====================================== */}

      {showViewModal && selectedAppointment && (
        <div className="appointments-modal-overlay">
          <div className="appointments-modal">
            <div className="appointments-modal-header">
              <div>
                <h2>Appointment Details</h2>
                <p>
                  Appointment #{selectedAppointment.appointment_id}
                </p>
              </div>

              <button
                type="button"
                className="appointments-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="appointments-modal-body">
              <div className="appointments-detail-section">
                <h3>
                  <User size={17} />
                  Patient Information
                </h3>

                <div className="appointments-detail-grid">
                  <div>
                    <label>Patient Name</label>
                    <p>{getPatientName(selectedAppointment)}</p>
                  </div>

                  <div>
                    <label>Patient ID</label>
                    <p>{selectedAppointment.patient_id}</p>
                  </div>

                  <div>
                    <label>Email Address</label>
                    <p>
                      {selectedAppointment.patient_email || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label>Contact Number</label>
                    <p>
                      {selectedAppointment.patient_contact || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="appointments-detail-section">
                <h3>
                  <Stethoscope size={17} />
                  Appointment Information
                </h3>

                <div className="appointments-detail-grid">
                  <div>
                    <label>Doctor</label>
                    <p>{getDoctorName(selectedAppointment)}</p>
                  </div>

                  <div>
                    <label>Service</label>
                    <p>
                      {selectedAppointment.service_name || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label>Appointment Date</label>
                    <p>
                      {formatDate(
                        selectedAppointment.appointment_date
                      )}
                    </p>
                  </div>

                  <div>
                    <label>Appointment Time</label>
                    <p>
                      {formatTime(
                        selectedAppointment.appointment_time
                      )}
                    </p>
                  </div>

                  <div>
                    <label>Schedule ID</label>
                    <p>
                      {selectedAppointment.schedule_id || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label>Status</label>

                    <span
                      className={`appointment-status-badge ${getStatusClass(
                        selectedAppointment.status
                      )}`}
                    >
                      {selectedAppointment.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="appointments-detail-section">
                <h3>
                  <FileText size={17} />
                  Additional Information
                </h3>

                <div className="appointments-detail-grid">
                  <div>
                    <label>Reason for Appointment</label>
                    <p>
                      {selectedAppointment.reason || "No reason provided."}
                    </p>
                  </div>

                  <div>
                    <label>Admin Remarks</label>
                    <p>
                      {selectedAppointment.admin_remarks ||
                        "No remarks available."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="appointments-modal-footer">
              <button
                type="button"
                className="appointments-btn secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          UPDATE STATUS MODAL
      ====================================== */}

      {showStatusModal && selectedAppointment && (
        <div className="appointments-modal-overlay">
          <div className="appointments-modal small">
            <div className="appointments-modal-header">
              <div>
                <h2>Update Appointment</h2>
                <p>
                  Appointment #{selectedAppointment.appointment_id}
                </p>
              </div>

              <button
                type="button"
                className="appointments-modal-close"
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
              >
                <X size={20} />
              </button>
            </div>

            <div className="appointments-modal-body">
              <div className="status-update-info">
                <strong>
                  {getPatientName(selectedAppointment)}
                </strong>

                <span>
                  {formatDate(selectedAppointment.appointment_date)}
                  {" at "}
                  {formatTime(selectedAppointment.appointment_time)}
                </span>
              </div>

              <div className="appointments-form-group">
                <label>New Appointment Status</label>

                <input
                  type="text"
                  value={newStatus}
                  readOnly
                />
              </div>

              <div className="appointments-form-group">
                <label>Admin Remarks (Optional)</label>

                <textarea
                  rows={4}
                  placeholder="Enter remarks or additional information..."
                  value={adminRemarks}
                  onChange={(e) =>
                    setAdminRemarks(e.target.value)
                  }
                  disabled={updating}
                />
              </div>

              <p className="status-warning">
                <AlertCircle size={16} />

                Please verify the appointment details before
                confirming this status update.
              </p>
            </div>

            <div className="appointments-modal-footer">
              <button
                type="button"
                className="appointments-btn secondary"
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="appointments-btn primary"
                onClick={handleUpdateStatus}
                disabled={updating}
              >
                {updating ? "Updating..." : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentsPage;
