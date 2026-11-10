
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
} from "lucide-react";

import "./PatientsPage.css";

// ========================================
// TYPES
// ========================================

type Patient = {
  patient_id: number;
  user_id: number;
  email: string;
  account_status: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birth_date: string | null;
  sex: string | null;
  contact_number: string | null;
  address: string | null;
  created_at: string;
};

type PatientsResponse = {
  success: boolean;
  total: number;
  patients: Patient[];
  message?: string;
};

type SinglePatientResponse = {
  success: boolean;
  patient?: Patient;
  message?: string;
};

type PatientForm = {
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  birth_date: string;
  sex: string;
  contact_number: string;
  address: string;
};

type AddPatientResponse = {
  success: boolean;
  message: string;
  patientId?: number;
  temporaryPassword?: string;
};

type ActionResponse = {
  success: boolean;
  message: string;
};

const initialPatientForm: PatientForm = {
  email: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  birth_date: "",
  sex: "",
  contact_number: "",
  address: "",
};

// ========================================
// PATIENTS PAGE
// ========================================

function PatientsPage() {
  const navigate = useNavigate();

  // General states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Add Patient states
  const [showAddModal, setShowAddModal] = useState(false);
  const [patientForm, setPatientForm] =
    useState<PatientForm>(initialPatientForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Temporary password states
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [createdPatientId, setCreatedPatientId] =
    useState<number | null>(null);

  // View Patient states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  // Edit Patient states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPatientId, setEditingPatientId] =
    useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Patient states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPatient, setDeletingPatient] =
    useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // API URL
  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Current administrator
  const user = (() => {
    try {
      const savedUser = sessionStorage.getItem("authUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })();

  // ========================================
  // FETCH PATIENTS
  // ========================================

  useEffect(() => {
    const fetchPatients = async () => {
      const token = sessionStorage.getItem("authToken");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${apiUrl}/patients?search=${encodeURIComponent(search)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data: PatientsResponse = await response.json();

        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to retrieve patients."
          );
        }

        setPatients(data.patients || []);
      } catch (error) {
        console.error("Patients fetch error:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while retrieving patients."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [search, navigate, refreshKey]);

  // ========================================
  // FORM INPUT HANDLING
  // ========================================

  const handlePatientFormChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setPatientForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ========================================
  // ADD PATIENT
  // ========================================

  const handleAddPatient = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError("");

    if (
      !patientForm.email.trim() ||
      !patientForm.first_name.trim() ||
      !patientForm.last_name.trim()
    ) {
      setFormError(
        "Email, first name, and last name are required."
      );
      return;
    }

    if (
      patientForm.contact_number &&
      !/^09\d{9}$/.test(patientForm.contact_number)
    ) {
      setFormError(
        "Contact number must contain 11 digits and start with 09."
      );
      return;
    }

    if (patientForm.birth_date) {
      const selectedDate = new Date(
        `${patientForm.birth_date}T00:00:00`
      );

      if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate > new Date()
      ) {
        setFormError(
          "Please enter a valid birth date that is not in the future."
        );
        return;
      }
    }

    const token = sessionStorage.getItem("authToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${apiUrl}/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...patientForm,
          email: patientForm.email.trim(),
          first_name: patientForm.first_name.trim(),
          middle_name: patientForm.middle_name.trim(),
          last_name: patientForm.last_name.trim(),
          contact_number: patientForm.contact_number.trim(),
          address: patientForm.address.trim(),
        }),
      });

      const data: AddPatientResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to add patient."
        );
      }

      setGeneratedPassword(data.temporaryPassword || "");
      setCreatedPatientId(data.patientId ?? null);

      setShowAddModal(false);
      setPatientForm(initialPatientForm);
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      console.error("Add patient error:", error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong while adding the patient."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAddModal = () => {
    if (saving) return;

    setShowAddModal(false);
    setFormError("");
    setPatientForm(initialPatientForm);
  };

  // ========================================
  // VIEW PATIENT
  // ========================================

  const handleViewPatient = async (patientId: number) => {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setShowViewModal(true);
    setSelectedPatient(null);
    setViewError("");
    setViewLoading(true);

    try {
      const response = await fetch(
        `${apiUrl}/patients/${patientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: SinglePatientResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success || !data.patient) {
        throw new Error(
          data.message || "Unable to retrieve patient information."
        );
      }

      setSelectedPatient(data.patient);
    } catch (error) {
      console.error("View patient error:", error);

      setViewError(
        error instanceof Error
          ? error.message
          : "Something went wrong while retrieving patient information."
      );
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedPatient(null);
    setViewError("");
  };

  // ========================================
  // EDIT PATIENT
  // ========================================

  const handleOpenEditModal = (patient: Patient) => {
    setEditingPatientId(patient.patient_id);

    setPatientForm({
      email: patient.email || "",
      first_name: patient.first_name || "",
      middle_name: patient.middle_name || "",
      last_name: patient.last_name || "",
      birth_date: patient.birth_date
        ? patient.birth_date.split("T")[0].split(" ")[0]
        : "",
      sex: patient.sex || "",
      contact_number: patient.contact_number || "",
      address: patient.address || "",
    });

    setEditError("");
    setShowEditModal(true);
  };

  const handleUpdatePatient = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setEditError("");

    if (editingPatientId === null) return;

    if (
      !patientForm.email.trim() ||
      !patientForm.first_name.trim() ||
      !patientForm.last_name.trim()
    ) {
      setEditError(
        "Email, first name, and last name are required."
      );
      return;
    }

    if (
      patientForm.contact_number &&
      !/^09\d{9}$/.test(patientForm.contact_number)
    ) {
      setEditError(
        "Contact number must contain 11 digits and start with 09."
      );
      return;
    }

    if (patientForm.birth_date) {
      const selectedDate = new Date(
        `${patientForm.birth_date}T00:00:00`
      );

      if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate > new Date()
      ) {
        setEditError(
          "Please enter a valid birth date that is not in the future."
        );
        return;
      }
    }

    const token = sessionStorage.getItem("authToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(
        `${apiUrl}/patients/${editingPatientId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...patientForm,
            email: patientForm.email.trim(),
            first_name: patientForm.first_name.trim(),
            middle_name: patientForm.middle_name.trim(),
            last_name: patientForm.last_name.trim(),
            contact_number: patientForm.contact_number.trim(),
            address: patientForm.address.trim(),
          }),
        }
      );

      const data: ActionResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update patient."
        );
      }

      setShowEditModal(false);
      setEditingPatientId(null);
      setPatientForm(initialPatientForm);
      setRefreshKey((previous) => previous + 1);

      alert(data.message || "Patient information updated successfully!");
    } catch (error) {
      console.error("Update patient error:", error);

      setEditError(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the patient."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseEditModal = () => {
    if (updating) return;

    setShowEditModal(false);
    setEditingPatientId(null);
    setPatientForm(initialPatientForm);
    setEditError("");
  };

  // ========================================
  // DELETE PATIENT
  // ========================================

  const handleOpenDeleteModal = (patient: Patient) => {
    setDeletingPatient(patient);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const handleDeletePatient = async () => {
    if (!deletingPatient) return;

    const token = sessionStorage.getItem("authToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      const response = await fetch(
        `${apiUrl}/patients/${deletingPatient.patient_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: ActionResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to delete patient."
        );
      }

      setShowDeleteModal(false);
      setDeletingPatient(null);
      setRefreshKey((previous) => previous + 1);

      alert(data.message || "Patient account processed successfully.");
    } catch (error) {
      console.error("Delete patient error:", error);

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Something went wrong while deleting the patient."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (deleting) return;

    setShowDeleteModal(false);
    setDeletingPatient(null);
    setDeleteError("");
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

  const formatDate = (dateValue: string | null) => {
    if (!dateValue) return "Not provided";

    const datePart = dateValue.split("T")[0].split(" ")[0];
    const [year, month, day] = datePart.split("-").map(Number);

    if (!year || !month || !day) return "Not provided";

    return new Date(year, month - 1, day).toLocaleDateString(
      "en-PH",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="dashboard-layout">

      {/* SIDEBAR OVERLAY */}

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
                  item.label === "Patients" ? "active" : ""
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
              <h2>Patients Management</h2>
              <p>Manage registered patient information.</p>
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
                PATIENT MANAGEMENT
              </span>

              <h1>Patient Records</h1>

              <p>
                View and manage all registered clinic patients.
              </p>
            </div>

            <div className="patients-welcome-icon">
              <Users size={48} />
            </div>
          </section>

          {/* PATIENT SUMMARY */}

          <section className="patient-summary">
            <div className="patient-summary-icon">
              <Users size={25} />
            </div>

            <div>
              <span>Total Registered Patients</span>
              <h2>{loading ? "..." : patients.length}</h2>
            </div>
          </section>

          {/* PATIENT TABLE */}

          <section className="dashboard-panel patients-table-panel">

            <div className="patients-toolbar">
              <div>
                <h3>All Patients</h3>
                <p>
                  Patient information and account details
                </p>
              </div>

              <button
                className="add-patient-button"
                type="button"
                onClick={() => {
                  setFormError("");
                  setPatientForm(initialPatientForm);
                  setShowAddModal(true);
                }}
              >
                <Plus size={18} />
                Add Patient
              </button>
            </div>

            {/* SEARCH */}

            <div className="patients-search">
              <Search size={19} />

              <input
                type="text"
                placeholder="Search by patient ID, name, or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {/* ERROR */}

            {errorMessage && (
              <div className="patients-error" role="alert">
                <strong>Unable to load patients</strong>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* TABLE */}

            <div className="patients-table-wrapper">
              <table className="patients-table">

                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Patient Name</th>
                    <th>Email Address</th>
                    <th>Contact Number</th>
                    <th>Sex</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="table-message">
                        Loading patient records...
                      </td>
                    </tr>
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-message">
                        No patient records found.
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.patient_id}>

                        <td>
                          <strong>
                            #{patient.patient_id}
                          </strong>
                        </td>

                        <td>
                          <div className="patient-name-cell">
                            <div className="patient-table-avatar">
                              <UserRound size={18} />
                            </div>

                            <div>
                              <strong>
                                {patient.first_name}{" "}
                                {patient.middle_name
                                  ? `${patient.middle_name} `
                                  : ""}
                                {patient.last_name}
                              </strong>

                              <span>
                                {formatDate(patient.birth_date)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>{patient.email}</td>

                        <td>
                          {patient.contact_number || "—"}
                        </td>

                        <td>{patient.sex || "—"}</td>

                        <td>
                          <span
                            className={`patient-account-status ${
                              patient.account_status === "active"
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {patient.account_status}
                          </span>
                        </td>

                        <td>
                          <div className="patient-actions">

                            <button
                              type="button"
                              title="View Patient"
                              onClick={() =>
                                handleViewPatient(patient.patient_id)
                              }
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              title="Edit Patient"
                              onClick={() =>
                                handleOpenEditModal(patient)
                              }
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              title="Delete Patient"
                              onClick={() =>
                                handleOpenDeleteModal(patient)
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
                Showing {patients.length} patient
                {patients.length === 1 ? "" : "s"}
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
          ADD PATIENT MODAL
      ===================================== */}

      {showAddModal && (
        <div
          className="patient-modal-overlay"
          onClick={handleCloseAddModal}
        >
          <div
            className="patient-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="patient-modal-header">
              <div>
                <h2>Add New Patient</h2>
                <p>
                  Enter the patient's personal and account information.
                </p>
              </div>

              <button
                type="button"
                className="patient-modal-close"
                onClick={handleCloseAddModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddPatient}>

              <div className="patient-form-grid">

                <div className="patient-form-group full-width">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={patientForm.email}
                    onChange={handlePatientFormChange}
                    placeholder="patient@example.com"
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={patientForm.first_name}
                    onChange={handlePatientFormChange}
                    placeholder="Enter first name"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={patientForm.middle_name}
                    onChange={handlePatientFormChange}
                    placeholder="Enter middle name"
                    maxLength={100}
                  />
                </div>

                <div className="patient-form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={patientForm.last_name}
                    onChange={handlePatientFormChange}
                    placeholder="Enter last name"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>Birth Date</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={patientForm.birth_date}
                    onChange={handlePatientFormChange}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="patient-form-group">
                  <label>Sex</label>
                  <select
                    name="sex"
                    value={patientForm.sex}
                    onChange={handlePatientFormChange}
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="patient-form-group">
                  <label>Contact Number</label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={patientForm.contact_number}
                    onChange={handlePatientFormChange}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="Enter an 11-digit number starting with 09."
                  />
                </div>

                <div className="patient-form-group full-width">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={patientForm.address}
                    onChange={handlePatientFormChange}
                    placeholder="Enter complete address"
                    rows={3}
                  />
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
                  onClick={handleCloseAddModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-patient-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Patient"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =====================================
          VIEW PATIENT MODAL
      ===================================== */}

      {showViewModal && (
        <div
          className="patient-modal-overlay"
          onClick={handleCloseViewModal}
        >
          <div
            className="patient-modal view-patient-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="patient-modal-header">
              <div>
                <h2>Patient Information</h2>
                <p>Complete details of the selected patient.</p>
              </div>

              <button
                type="button"
                className="patient-modal-close"
                onClick={handleCloseViewModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {viewLoading ? (
              <div className="view-patient-message">
                Loading patient information...
              </div>
            ) : viewError ? (
              <div className="patients-error" role="alert">
                {viewError}
              </div>
            ) : selectedPatient ? (
              <>
                <div className="view-patient-profile">
                  <div className="view-patient-avatar">
                    <UserRound size={30} />
                  </div>

                  <div>
                    <h3>
                      {selectedPatient.first_name}{" "}
                      {selectedPatient.middle_name
                        ? `${selectedPatient.middle_name} `
                        : ""}
                      {selectedPatient.last_name}
                    </h3>

                    <span>
                      Patient ID: #{selectedPatient.patient_id}
                    </span>
                  </div>
                </div>

                <div className="view-patient-grid">

                  <div className="view-patient-field">
                    <span>Email Address</span>
                    <strong>
                      {selectedPatient.email || "Not provided"}
                    </strong>
                  </div>

                  <div className="view-patient-field">
                    <span>Account Status</span>
                    <strong>
                      <span
                        className={`patient-account-status ${
                          selectedPatient.account_status === "active"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {selectedPatient.account_status || "Unknown"}
                      </span>
                    </strong>
                  </div>

                  <div className="view-patient-field">
                    <span>Birth Date</span>
                    <strong>
                      {formatDate(selectedPatient.birth_date)}
                    </strong>
                  </div>

                  <div className="view-patient-field">
                    <span>Sex</span>
                    <strong>
                      {selectedPatient.sex || "Not provided"}
                    </strong>
                  </div>

                  <div className="view-patient-field">
                    <span>Contact Number</span>
                    <strong>
                      {selectedPatient.contact_number || "Not provided"}
                    </strong>
                  </div>

                  <div className="view-patient-field">
                    <span>Registration Date</span>
                    <strong>
                      {formatDate(selectedPatient.created_at)}
                    </strong>
                  </div>

                  <div className="view-patient-field full-width">
                    <span>Complete Address</span>
                    <strong>
                      {selectedPatient.address || "Not provided"}
                    </strong>
                  </div>

                </div>

                <div className="patient-modal-actions">
                  <button
                    type="button"
                    className="add-patient-button"
                    onClick={handleCloseViewModal}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}

          </div>
        </div>
      )}

      {/* =====================================
          EDIT PATIENT MODAL
      ===================================== */}

      {showEditModal && (
        <div
          className="patient-modal-overlay"
          onClick={handleCloseEditModal}
        >
          <div
            className="patient-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="patient-modal-header">
              <div>
                <h2>Edit Patient Information</h2>
                <p>
                  Update the selected patient's personal information.
                </p>
              </div>

              <button
                type="button"
                className="patient-modal-close"
                onClick={handleCloseEditModal}
                disabled={updating}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdatePatient}>

              <div className="patient-form-grid">

                <div className="patient-form-group full-width">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={patientForm.email}
                    onChange={handlePatientFormChange}
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={patientForm.first_name}
                    onChange={handlePatientFormChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={patientForm.middle_name}
                    onChange={handlePatientFormChange}
                    maxLength={100}
                  />
                </div>

                <div className="patient-form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={patientForm.last_name}
                    onChange={handlePatientFormChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="patient-form-group">
                  <label>Birth Date</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={patientForm.birth_date}
                    onChange={handlePatientFormChange}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="patient-form-group">
                  <label>Sex</label>
                  <select
                    name="sex"
                    value={patientForm.sex}
                    onChange={handlePatientFormChange}
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="patient-form-group">
                  <label>Contact Number</label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={patientForm.contact_number}
                    onChange={handlePatientFormChange}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="Enter an 11-digit number starting with 09."
                  />
                </div>

                <div className="patient-form-group full-width">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={patientForm.address}
                    onChange={handlePatientFormChange}
                    placeholder="Enter complete address"
                    rows={3}
                  />
                </div>

              </div>

              {editError && (
                <div className="patients-error" role="alert">
                  {editError}
                </div>
              )}

              <div className="patient-modal-actions">
                <button
                  type="button"
                  className="patient-cancel-button"
                  onClick={handleCloseEditModal}
                  disabled={updating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-patient-button"
                  disabled={updating}
                >
                  {updating ? "Updating..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =====================================
          DELETE PATIENT MODAL
      ===================================== */}

      {showDeleteModal && deletingPatient && (
        <div
          className="patient-modal-overlay"
          onClick={handleCloseDeleteModal}
        >
          <div
            className="patient-modal delete-patient-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="delete-patient-icon">
              <Trash2 size={30} />
            </div>

            <h2>Delete Patient?</h2>

            <p>
              Are you sure you want to delete the account of{" "}
              <strong>
                {deletingPatient.first_name}{" "}
                {deletingPatient.last_name}
              </strong>
              ?
            </p>

            <p className="delete-patient-warning">
              If this patient has existing appointments or medical
              records, their profile and history will be preserved
              and their account will be deactivated.
            </p>

            {deleteError && (
              <div className="patients-error" role="alert">
                {deleteError}
              </div>
            )}

            <div className="patient-modal-actions">
              <button
                type="button"
                className="patient-cancel-button"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={handleDeletePatient}
                disabled={deleting}
              >
                {deleting ? "Processing..." : "Confirm Delete"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =====================================
          GENERATED TEMPORARY PASSWORD
      ===================================== */}

      {generatedPassword && (
        <div className="patient-modal-overlay">
          <div className="patient-modal password-modal">

            <div className="patient-modal-header">
              <div>
                <h2>Patient Added Successfully!</h2>
                <p>
                  Patient ID: #{createdPatientId}
                </p>
              </div>
            </div>

            <div className="temporary-password-notice">
              <strong>Temporary Login Password</strong>

              <p>
                Provide this password securely to the patient.
                It will not be displayed again after closing this window.
              </p>

              <div className="temporary-password-value">
                {generatedPassword}
              </div>

              <button
                type="button"
                className="copy-password-button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    generatedPassword
                  );
                }}
              >
                Copy Password
              </button>
            </div>

            <div className="patient-modal-actions">
              <button
                type="button"
                className="add-patient-button"
                onClick={() => {
                  setGeneratedPassword("");
                  setCreatedPatientId(null);
                }}
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default PatientsPage;
