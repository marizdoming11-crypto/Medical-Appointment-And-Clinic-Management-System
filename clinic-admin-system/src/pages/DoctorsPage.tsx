
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  UserRound,
  Menu,
  ChevronDown,
  Phone,
  Mail,
  Activity,
  X,
} from "lucide-react";

import "./PatientsPage.css";
import "./DoctorsPage.css";

// ========================================
// TYPES
// ========================================

type Doctor = {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  contact_number: string | null;
  email: string | null;
  status: "Available" | "Unavailable";
  created_at: string;
};

type DoctorsResponse = {
  success: boolean;
  total?: number;
  doctors?: Doctor[];
  doctor?: Doctor;
  message?: string;
};

type DoctorForm = {
  first_name: string;
  last_name: string;
  specialization: string;
  contact_number: string;
  email: string;
  status: "Available" | "Unavailable";
};

const initialDoctorForm: DoctorForm = {
  first_name: "",
  last_name: "",
  specialization: "",
  contact_number: "",
  email: "",
  status: "Available",
};

// ========================================
// DOCTORS PAGE
// ========================================

function DoctorsPage() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected doctor
  const [selectedDoctor, setSelectedDoctor] =
    useState<Doctor | null>(null);

  // Form states
  const [doctorForm, setDoctorForm] =
    useState<DoctorForm>(initialDoctorForm);

  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  // Admin information
  const user = (() => {
    try {
      const savedUser = sessionStorage.getItem("authUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })();

  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // ========================================
  // AUTHENTICATION TOKEN
  // ========================================

  const getToken = () => {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
      navigate("/login", { replace: true });
      return null;
    }

    return token;
  };

  // ========================================
  // FETCH DOCTORS
  // ========================================

  useEffect(() => {
    const fetchDoctors = async () => {
      const token = getToken();

      if (!token) return;

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${apiUrl}/doctors?search=${encodeURIComponent(search)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data: DoctorsResponse = await response.json();

        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to retrieve doctors."
          );
        }

        setDoctors(data.doctors || []);
      } catch (error) {
        console.error("Doctors fetch error:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while retrieving doctors."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [search, navigate, refreshKey]);

  // ========================================
  // FORM INPUT HANDLING
  // ========================================

  const handleFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setDoctorForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ========================================
  // OPEN ADD MODAL
  // ========================================

  const handleOpenAddModal = () => {
    setFormMode("add");
    setDoctorForm(initialDoctorForm);
    setFormError("");
    setShowFormModal(true);
  };

  // ========================================
  // OPEN EDIT MODAL
  // ========================================

  const handleOpenEditModal = (doctor: Doctor) => {
    setFormMode("edit");
    setSelectedDoctor(doctor);

    setDoctorForm({
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      specialization: doctor.specialization,
      contact_number: doctor.contact_number || "",
      email: doctor.email || "",
      status: doctor.status,
    });

    setFormError("");
    setShowFormModal(true);
  };

  // ========================================
  // CLOSE FORM MODAL
  // ========================================

  const handleCloseFormModal = () => {
    if (saving) return;

    setShowFormModal(false);
    setDoctorForm(initialDoctorForm);
    setFormError("");
    setSelectedDoctor(null);
  };

  // ========================================
  // ADD / UPDATE DOCTOR
  // ========================================

  const handleSubmitDoctor = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError("");

    if (
      !doctorForm.first_name.trim() ||
      !doctorForm.last_name.trim() ||
      !doctorForm.specialization.trim()
    ) {
      setFormError(
        "First name, last name, and specialization are required."
      );
      return;
    }

    if (
      doctorForm.contact_number &&
      !/^09\d{9}$/.test(doctorForm.contact_number)
    ) {
      setFormError(
        "Contact number must contain 11 digits and start with 09."
      );
      return;
    }

    if (
      doctorForm.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doctorForm.email)
    ) {
      setFormError("Please enter a valid email address.");
      return;
    }

    const token = getToken();

    if (!token) return;

    const isEditing = formMode === "edit";

    if (isEditing && !selectedDoctor) {
      setFormError("No doctor selected for editing.");
      return;
    }

    try {
      setSaving(true);

      const endpoint = isEditing
        ? `${apiUrl}/doctors/${selectedDoctor!.doctor_id}`
        : `${apiUrl}/doctors`;

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: doctorForm.first_name.trim(),
          last_name: doctorForm.last_name.trim(),
          specialization: doctorForm.specialization.trim(),
          contact_number: doctorForm.contact_number.trim(),
          email: doctorForm.email.trim(),
          status: doctorForm.status,
        }),
      });

      const data: DoctorsResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Unable to ${isEditing ? "update" : "add"} doctor.`
        );
      }

      setShowFormModal(false);
      setDoctorForm(initialDoctorForm);
      setSelectedDoctor(null);
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      console.error("Save doctor error:", error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the doctor."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // VIEW DOCTOR
  // ========================================

  const handleViewDoctor = async (doctorId: number) => {
    const token = getToken();

    if (!token) return;

    try {
      setActionError("");

      const response = await fetch(
        `${apiUrl}/doctors/${doctorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: DoctorsResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success || !data.doctor) {
        throw new Error(
          data.message || "Unable to retrieve doctor information."
        );
      }

      setSelectedDoctor(data.doctor);
      setShowViewModal(true);
    } catch (error) {
      console.error("View doctor error:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to retrieve doctor information."
      );
    }
  };

  // ========================================
  // OPEN DELETE MODAL
  // ========================================

  const handleOpenDeleteModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setActionError("");
    setShowDeleteModal(true);
  };

  // ========================================
  // DELETE DOCTOR
  // ========================================

  const handleDeleteDoctor = async () => {
    if (!selectedDoctor) return;

    const token = getToken();

    if (!token) return;

    try {
      setSaving(true);
      setActionError("");

      const response = await fetch(
        `${apiUrl}/doctors/${selectedDoctor.doctor_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: DoctorsResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to delete doctor."
        );
      }

      setShowDeleteModal(false);
      setSelectedDoctor(null);
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      console.error("Delete doctor error:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to delete doctor."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // AVAILABILITY QUICK ACTION
  // ========================================

  const handleToggleAvailability = async (doctor: Doctor) => {
    const token = getToken();

    if (!token) return;

    const newStatus =
      doctor.status === "Available" ? "Unavailable" : "Available";

    try {
      setActionError("");

      const response = await fetch(
        `${apiUrl}/doctors/${doctor.doctor_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            specialization: doctor.specialization,
            contact_number: doctor.contact_number || "",
            email: doctor.email || "",
            status: newStatus,
          }),
        }
      );

      const data: DoctorsResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update doctor availability."
        );
      }

      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      console.error("Availability update error:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update doctor availability."
      );
    }
  };

  // ========================================
  // LOGOUT
  // ========================================

  const handleLogout = () => {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");

    navigate("/login", { replace: true });
  };

  // ========================================
  // SIDEBAR NAVIGATION
  // ========================================

  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Patients", icon: Users, path: "/patients" },
    { label: "Appointments", icon: CalendarDays },
    { label: "Doctors", icon: Stethoscope, path: "/doctors" },
    { label: "Medical Records", icon: ClipboardList },
    { label: "Notifications", icon: Bell },
    { label: "Settings", icon: Settings },
  ];

  // ========================================
  // FORMAT DATE
  // ========================================

  const formatDate = (dateValue: string) => {
    if (!dateValue) return "Not provided";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Not provided";
    }

    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const availableCount = doctors.filter(
    (doctor) => doctor.status === "Available"
  ).length;

  const unavailableCount = doctors.length - availableCount;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="dashboard-layout">

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`dashboard-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <HeartPulse size={27} />
          </div>

          <div>
            <h2>MediCare</h2>
            <span>Clinic Management</span>
          </div>
        </div>

        <div className="sidebar-section-label">
          MAIN MENU
        </div>

        <nav className="sidebar-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                className={`sidebar-link ${
                  item.label === "Doctors" ? "active" : ""
                }`}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                  } else {
                    alert(
                      `${item.label} module will be implemented next.`
                    );
                  }

                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <HeartPulse size={22} />
            <strong>Clinic System</strong>
            <p>
              Manage your clinic efficiently with MediCare.
            </p>
          </div>

          <button
            className="sidebar-logout"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="dashboard-main">

        {/* HEADER */}

        <header className="dashboard-header">
          <div className="header-left">
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>Doctors Management</h2>
              <p>Manage clinic doctors and their availability.</p>
            </div>
          </div>

          <div className="header-right">
            <div className="admin-profile">
              <div className="admin-avatar">
                <UserRound size={21} />
              </div>

              <div className="admin-profile-info">
                <strong>Administrator</strong>
                <span>{user?.email || "Admin Account"}</span>
              </div>

              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <div className="dashboard-content">

          {/* WELCOME BANNER */}

          <section className="patients-welcome">
            <div>
              <span className="welcome-label">
                DOCTOR MANAGEMENT
              </span>

              <h1>Our Medical Professionals</h1>

              <p>
                View, register, and manage your clinic's doctors.
              </p>
            </div>

            <div className="patients-welcome-icon">
              <Stethoscope size={48} />
            </div>
          </section>

          {/* SUMMARY CARDS */}

          <section className="doctor-summary-grid">

            <div className="doctor-summary-card">
              <div className="doctor-summary-icon total">
                <Stethoscope size={24} />
              </div>

              <div>
                <span>Total Doctors</span>
                <h2>{loading ? "..." : doctors.length}</h2>
              </div>
            </div>

            <div className="doctor-summary-card">
              <div className="doctor-summary-icon available">
                <Activity size={24} />
              </div>

              <div>
                <span>Available Doctors</span>
                <h2>{loading ? "..." : availableCount}</h2>
              </div>
            </div>

            <div className="doctor-summary-card">
              <div className="doctor-summary-icon unavailable">
                <UserRound size={24} />
              </div>

              <div>
                <span>Unavailable Doctors</span>
                <h2>{loading ? "..." : unavailableCount}</h2>
              </div>
            </div>

          </section>

          {/* DOCTORS TABLE */}

          <section className="dashboard-panel patients-table-panel">

            <div className="patients-toolbar">
              <div>
                <h3>All Doctors</h3>
                <p>
                  Doctor profiles, specializations, and availability
                </p>
              </div>

              <button
                className="add-patient-button"
                type="button"
                onClick={handleOpenAddModal}
              >
                <Plus size={18} />
                Add Doctor
              </button>
            </div>

            {/* SEARCH */}

            <div className="patients-search">
              <Search size={19} />

              <input
                type="text"
                placeholder="Search by doctor ID, name, email, or specialization..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {/* ACTION ERROR */}

            {actionError && !showDeleteModal && (
              <div className="patients-error" role="alert">
                <strong>Action unsuccessful</strong>
                <p>{actionError}</p>
              </div>
            )}

            {/* FETCH ERROR */}

            {errorMessage && (
              <div className="patients-error" role="alert">
                <strong>Unable to load doctors</strong>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* TABLE */}

            <div className="patients-table-wrapper">
              <table className="patients-table doctor-table">

                <thead>
                  <tr>
                    <th>Doctor ID</th>
                    <th>Doctor Name</th>
                    <th>Specialization</th>
                    <th>Contact Number</th>
                    <th>Email Address</th>
                    <th>Availability</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="table-message">
                        Loading doctor records...
                      </td>
                    </tr>
                  ) : doctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-message">
                        No doctor records found.
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doctor) => (
                      <tr key={doctor.doctor_id}>

                        <td>
                          <strong>#{doctor.doctor_id}</strong>
                        </td>

                        <td>
                          <div className="patient-name-cell">
                            <div className="patient-table-avatar doctor-avatar">
                              <Stethoscope size={18} />
                            </div>

                            <div>
                              <strong>
                                Dr. {doctor.first_name} {doctor.last_name}
                              </strong>

                              <span>
                                Registered {formatDate(doctor.created_at)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>{doctor.specialization}</td>

                        <td>
                          {doctor.contact_number || "—"}
                        </td>

                        <td>{doctor.email || "—"}</td>

                        <td>
                          <button
                            type="button"
                            className={`doctor-status-badge ${
                              doctor.status === "Available"
                                ? "available"
                                : "unavailable"
                            }`}
                            title="Click to change availability"
                            onClick={() =>
                              handleToggleAvailability(doctor)
                            }
                          >
                            <span />
                            {doctor.status}
                          </button>
                        </td>

                        <td>
                          <div className="patient-actions">

                            <button
                              type="button"
                              title="View Doctor"
                              onClick={() =>
                                handleViewDoctor(doctor.doctor_id)
                              }
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              title="Edit Doctor"
                              onClick={() =>
                                handleOpenEditModal(doctor)
                              }
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              title="Delete Doctor"
                              onClick={() =>
                                handleOpenDeleteModal(doctor)
                              }
                            >
                              <Trash2 size={17} />
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>

              </table>
            </div>

            <div className="patients-table-footer">
              <span>
                Showing {doctors.length} doctor
                {doctors.length === 1 ? "" : "s"}
              </span>
            </div>

          </section>

          {/* FOOTER */}

          <footer className="dashboard-footer">
            <span>
              © 2026 MediCare Clinic Management System
            </span>

            <span>Administrator Portal</span>
          </footer>

        </div>
      </main>

      {/* =====================================
          ADD / EDIT DOCTOR MODAL
      ===================================== */}

      {showFormModal && (
        <div
          className="patient-modal-overlay"
          onClick={handleCloseFormModal}
        >
          <div
            className="patient-modal doctor-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="patient-modal-header">
              <div>
                <h2>
                  {formMode === "add"
                    ? "Add New Doctor"
                    : "Edit Doctor Information"}
                </h2>

                <p>
                  {formMode === "add"
                    ? "Enter the doctor's professional and contact information."
                    : "Update the selected doctor's information."}
                </p>
              </div>

              <button
                type="button"
                className="patient-modal-close"
                onClick={handleCloseFormModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitDoctor}>

              <div className="patient-form-grid">

                <div className="patient-form-group">
                  <label>First Name *</label>

                  <input
                    type="text"
                    name="first_name"
                    value={doctorForm.first_name}
                    onChange={handleFormChange}
                    placeholder="Enter first name"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>Last Name *</label>

                  <input
                    type="text"
                    name="last_name"
                    value={doctorForm.last_name}
                    onChange={handleFormChange}
                    placeholder="Enter last name"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="patient-form-group full-width">
                  <label>Specialization *</label>

                  <input
                    type="text"
                    name="specialization"
                    value={doctorForm.specialization}
                    onChange={handleFormChange}
                    placeholder="e.g. General Medicine"
                    maxLength={150}
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>Contact Number</label>

                  <input
                    type="tel"
                    name="contact_number"
                    value={doctorForm.contact_number}
                    onChange={handleFormChange}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="Enter an 11-digit number starting with 09."
                  />
                </div>

                <div className="patient-form-group">
                  <label>Email Address</label>

                  <input
                    type="email"
                    name="email"
                    value={doctorForm.email}
                    onChange={handleFormChange}
                    placeholder="doctor@example.com"
                    maxLength={150}
                  />
                </div>

                <div className="patient-form-group full-width">
                  <label>Availability Status *</label>

                  <select
                    name="status"
                    value={doctorForm.status}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>

              </div>

              {formError && (
                <div className="patients-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="patient-modal-actions">

                <button
                  type="button"
                  className="patient-cancel-button"
                  onClick={handleCloseFormModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-patient-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : formMode === "add"
                    ? "Save Doctor"
                    : "Update Doctor"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* =====================================
          VIEW DOCTOR MODAL
      ===================================== */}

      {showViewModal && selectedDoctor && (
        <div
          className="patient-modal-overlay"
          onClick={() => {
            setShowViewModal(false);
            setSelectedDoctor(null);
          }}
        >
          <div
            className="patient-modal doctor-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="patient-modal-header">
              <div>
                <h2>Doctor Details</h2>
                <p>
                  Complete information about this medical professional.
                </p>
              </div>

              <button
                type="button"
                className="patient-modal-close"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDoctor(null);
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="doctor-profile-card">
              <div className="doctor-profile-avatar">
                <Stethoscope size={32} />
              </div>

              <div>
                <h3>
                  Dr. {selectedDoctor.first_name}{" "}
                  {selectedDoctor.last_name}
                </h3>

                <p>{selectedDoctor.specialization}</p>

                <span
                  className={`doctor-status-badge ${
                    selectedDoctor.status === "Available"
                      ? "available"
                      : "unavailable"
                  }`}
                >
                  <span />
                  {selectedDoctor.status}
                </span>
              </div>
            </div>

            <div className="doctor-details-grid">

              <div className="doctor-detail-item">
                <span>Doctor ID</span>
                <strong>#{selectedDoctor.doctor_id}</strong>
              </div>

              <div className="doctor-detail-item">
                <span>Specialization</span>
                <strong>{selectedDoctor.specialization}</strong>
              </div>

              <div className="doctor-detail-item">
                <span>
                  <Phone size={15} /> Contact Number
                </span>
                <strong>
                  {selectedDoctor.contact_number || "Not provided"}
                </strong>
              </div>

              <div className="doctor-detail-item">
                <span>
                  <Mail size={15} /> Email Address
                </span>
                <strong>
                  {selectedDoctor.email || "Not provided"}
                </strong>
              </div>

              <div className="doctor-detail-item full-width">
                <span>Registration Date</span>
                <strong>{formatDate(selectedDoctor.created_at)}</strong>
              </div>

            </div>

            <div className="patient-modal-actions">
              <button
                type="button"
                className="patient-cancel-button"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDoctor(null);
                }}
              >
                Close
              </button>

              <button
                type="button"
                className="add-patient-button"
                onClick={() => {
                  const doctor = selectedDoctor;
                  setShowViewModal(false);
                  handleOpenEditModal(doctor);
                }}
              >
                <Pencil size={16} />
                Edit Doctor
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =====================================
          DELETE DOCTOR CONFIRMATION
      ===================================== */}

      {showDeleteModal && selectedDoctor && (
        <div
          className="patient-modal-overlay"
          onClick={() => {
            if (!saving) {
              setShowDeleteModal(false);
              setSelectedDoctor(null);
              setActionError("");
            }
          }}
        >
          <div
            className="patient-modal doctor-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="doctor-delete-icon">
              <Trash2 size={30} />
            </div>

            <div className="doctor-delete-content">
              <h2>Delete Doctor?</h2>

              <p>
                Are you sure you want to delete
                <strong>
                  {" "}Dr. {selectedDoctor.first_name}{" "}
                  {selectedDoctor.last_name}
                </strong>
                ? This action cannot be undone.
              </p>

              <p className="doctor-delete-note">
                Doctors with existing appointments or medical records
                cannot be deleted.
              </p>
            </div>

            {actionError && (
              <div className="patients-error" role="alert">
                {actionError}
              </div>
            )}

            <div className="patient-modal-actions">

              <button
                type="button"
                className="patient-cancel-button"
                disabled={saving}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDoctor(null);
                  setActionError("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="doctor-confirm-delete"
                disabled={saving}
                onClick={handleDeleteDoctor}
              >
                {saving ? "Deleting..." : "Yes, Delete"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default DoctorsPage;
