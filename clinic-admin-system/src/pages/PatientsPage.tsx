
import { useEffect, useState } from "react";
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

function PatientsPage() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const user = (() => {
    try {
      const savedUser = sessionStorage.getItem("authUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })();

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

        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
          throw new Error(data.message || "Unable to retrieve patients.");
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
  }, [search, navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    navigate("/login", { replace: true });
  };

  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Patients", icon: Users, path: "/patients" },
    { label: "Appointments", icon: CalendarDays },
    { label: "Doctors", icon: Stethoscope },
    { label: "Medical Records", icon: ClipboardList },
    { label: "Notifications", icon: Bell },
    { label: "Settings", icon: Settings },
  ];

  const formatDate = (dateValue: string | null) => {
    if (!dateValue) return "Not provided";

    const datePart = dateValue.split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);

    if (!year || !month || !day) return "Not provided";

    return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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

        <div className="sidebar-section-label">MAIN MENU</div>

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
                    alert(`${item.label} module will be implemented next.`);
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
            <p>Manage your clinic efficiently with MediCare.</p>
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
          <section className="patients-welcome">
            <div>
              <span className="welcome-label">PATIENT MANAGEMENT</span>
              <h1>Patient Records</h1>
              <p>View and manage all registered clinic patients.</p>
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
                <p>Patient information and account details</p>
              </div>

              <button
                className="add-patient-button"
                type="button"
                onClick={() =>
                  alert("Add Patient form will be implemented next.")
                }
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
                          <strong>#{patient.patient_id}</strong>
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

                        <td>{patient.contact_number || "—"}</td>

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
                                alert(
                                  `View patient #${patient.patient_id} will be implemented next.`
                                )
                              }
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              title="Edit Patient"
                              onClick={() =>
                                alert(
                                  `Edit patient #${patient.patient_id} will be implemented next.`
                                )
                              }
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              title="Delete Patient"
                              onClick={() =>
                                alert(
                                  `Delete patient #${patient.patient_id} will be implemented next.`
                                )
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

          <footer className="dashboard-footer">
            <span>© 2026 MediCare Clinic Management System</span>
            <span>Administrator Portal</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default PatientsPage;
