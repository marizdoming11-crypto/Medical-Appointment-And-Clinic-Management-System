
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
  Menu,
  Search,
  CalendarCheck,
  UserRound,
  Activity,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import "./DashboardPage.css";

type AuthUser = {
  user_id: number;
  email: string;
  role: string;
};

type DashboardStatistics = {
  totalPatients: number;
  todaysAppointments: number;
  totalDoctors: number;
  totalRecords: number;
};

type UpcomingAppointment = {
  appointment_id: number;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

type DashboardResponse = {
  success: boolean;
  statistics: DashboardStatistics;
  upcomingAppointments: UpcomingAppointment[];
  message?: string;
};

function formatDate(dateValue: string) {
  const datePart = dateValue.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return dateValue;
  }

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeValue;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function DashboardPage() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [statistics, setStatistics] = useState<DashboardStatistics>({
    totalPatients: 0,
    todaysAppointments: 0,
    totalDoctors: 0,
    totalRecords: 0,
  });

  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  let user: AuthUser | null = null;

  try {
    const savedUser = sessionStorage.getItem("authUser");
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    user = null;
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
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

        const response = await fetch(`${apiUrl}/dashboard/overview`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data: DashboardResponse = await response.json();

        if (response.status === 401 || response.status === 403) {
          setErrorMessage(
            data.message || "Your session is invalid or unauthorized."
          );
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load dashboard information."
          );
        }

        setStatistics(data.statistics);
        setAppointments(data.upcomingAppointments || []);
      } catch (error) {
        console.error("Dashboard fetch error:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    navigate("/login", { replace: true });
  };

  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Patients", icon: Users, active: false },
    { label: "Appointments", icon: CalendarDays, active: false },
    { label: "Doctors", icon: Stethoscope, active: false },
    { label: "Medical Records", icon: ClipboardList, active: false },
    { label: "Notifications", icon: Bell, active: false },
    { label: "Settings", icon: Settings, active: false },
  ];

  const stats = [
    {
      title: "Total Patients",
      value: statistics.totalPatients,
      description: "Registered patients",
      icon: Users,
      color: "blue",
    },
    {
      title: "Today's Appointments",
      value: statistics.todaysAppointments,
      description: "Scheduled for today",
      icon: CalendarCheck,
      color: "green",
    },
    {
      title: "Total Doctors",
      value: statistics.totalDoctors,
      description: "Registered doctors",
      icon: Stethoscope,
      color: "purple",
    },
    {
      title: "Medical Records",
      value: statistics.totalRecords,
      description: "Total patient records",
      icon: ClipboardList,
      color: "orange",
    },
  ];

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
                className={`sidebar-link ${
                  item.active ? "active" : ""
                }`}
                type="button"
              onClick={() => {
  if (item.label === "Patients") {
    navigate("/patients");
  } else if (!item.active) {
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
            <Activity size={22} />
            <strong>Clinic System</strong>
            <p>Manage your clinic efficiently with MediCare.</p>
          </div>

          <button
            className="sidebar-logout"
            onClick={handleLogout}
            type="button"
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              type="button"
              aria-label="Toggle navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>Dashboard Overview</h2>
              <p>Welcome to your clinic administration portal.</p>
            </div>
          </div>

          <div className="header-right">
            <button
              className="header-icon-button"
              type="button"
              aria-label="Search"
            >
              <Search size={19} />
            </button>

            <button
              className="header-icon-button notification-button"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={19} />
            </button>

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
          <section className="dashboard-welcome">
            <div>
              <span className="welcome-label">ADMINISTRATION</span>
              <h1>Good day, Administrator!</h1>
              <p>Here's an overview of your clinic's operations.</p>
            </div>

            <div className="welcome-icon">
              <HeartPulse size={55} />
            </div>
          </section>

          {/* API ERROR MESSAGE */}
          {errorMessage && (
            <div className="dashboard-error" role="alert">
              <strong>Unable to load dashboard data</strong>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* STATISTICS */}
          <section className="dashboard-stats">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div className="stat-card" key={stat.title}>
                  <div className={`stat-icon ${stat.color}`}>
                    <Icon size={23} />
                  </div>

                  <div className="stat-information">
                    <span>{stat.title}</span>
                    <h2>
                      {loading ? "..." : stat.value.toLocaleString()}
                    </h2>
                    <p>{stat.description}</p>
                  </div>

                  <ArrowUpRight className="stat-arrow" size={19} />
                </div>
              );
            })}
          </section>

          {/* LOWER DASHBOARD */}
          <section className="dashboard-grid">
            <div className="dashboard-panel appointments-panel">
              <div className="panel-heading">
                <div>
                  <h3>Upcoming Appointments</h3>
                  <p>Recent and scheduled patient visits</p>
                </div>

                <button className="panel-action" type="button">
                  View All
                  <ArrowUpRight size={15} />
                </button>
              </div>

              {loading ? (
                <div className="empty-state">
                  <p>Loading appointments...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <CalendarDays size={30} />
                  </div>

                  <h4>No appointment data yet</h4>
                  <p>
                    Appointment schedules will appear here once
                    appointments are added to the database.
                  </p>
                </div>
              ) : (
                <div className="appointment-list">
                  {appointments.map((appointment) => (
                    <div
                      className="appointment-item"
                      key={appointment.appointment_id}
                    >
                      <div className="appointment-date-icon">
                        <CalendarDays size={21} />
                      </div>

                      <div className="appointment-information">
                        <strong>{appointment.patient_name}</strong>
                        <span>
                          Dr. {appointment.doctor_name}
                        </span>
                        <small>
                          {formatDate(appointment.appointment_date)} ·{" "}
                          {formatTime(appointment.appointment_time)}
                        </small>
                      </div>

                      <span
                        className={`appointment-status ${appointment.status.toLowerCase()}`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dashboard-panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h3>Clinic Overview</h3>
                  <p>System information</p>
                </div>
              </div>

              <div className="overview-item">
                <div className="overview-icon blue">
                  <Users size={19} />
                </div>

                <div>
                  <strong>Patient Management</strong>
                  <span>Patient registration and records</span>
                </div>
              </div>

              <div className="overview-item">
                <div className="overview-icon green">
                  <CalendarCheck size={19} />
                </div>

                <div>
                  <strong>Appointment Management</strong>
                  <span>Scheduling and appointment tracking</span>
                </div>
              </div>

              <div className="overview-item">
                <div className="overview-icon purple">
                  <Stethoscope size={19} />
                </div>

                <div>
                  <strong>Doctor Management</strong>
                  <span>Doctor profiles and availability</span>
                </div>
              </div>

              <div className="overview-item">
                <div className="overview-icon orange">
                  <ClipboardList size={19} />
                </div>

                <div>
                  <strong>Medical Records</strong>
                  <span>Patient diagnosis and medical history</span>
                </div>
              </div>
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

export default DashboardPage;
