
import { useState } from "react";
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
  Clock,
  CalendarCheck,
  UserRound,
  Activity,
  ChevronDown,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import "./DashboardPage.css";

type AuthUser = {
  user_id: number;
  email: string;
  role: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  let user: AuthUser | null = null;

  try {
    const savedUser = sessionStorage.getItem("authUser");
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    user = null;
  }

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
      value: "—",
      description: "Registered patients",
      icon: Users,
      color: "blue",
    },
    {
      title: "Today's Appointments",
      value: "—",
      description: "Scheduled for today",
      icon: CalendarCheck,
      color: "green",
    },
    {
      title: "Total Doctors",
      value: "—",
      description: "Registered doctors",
      icon: Stethoscope,
      color: "purple",
    },
    {
      title: "Medical Records",
      value: "—",
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

      <aside className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
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
                className={`sidebar-link ${item.active ? "active" : ""}`}
                
                type="button"
                onClick={() => {
                  if (!item.active) {
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
            <button className="header-icon-button" type="button" aria-label="Search">
              <Search size={19} />
            </button>

            <button className="header-icon-button notification-button" type="button" aria-label="Notifications">
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
              <p>
                Here's an overview of your clinic's operations.
              </p>
            </div>

            <div className="welcome-icon">
              <HeartPulse size={55} />
            </div>
          </section>

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
                    <h2>{stat.value}</h2>
                    <p>{stat.description}</p>
                  </div>

                  <ArrowUpRight
                    className="stat-arrow"
                    size={19}
                  />
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

              <div className="empty-state">
                <div className="empty-state-icon">
                  <CalendarDays size={30} />
                </div>

                <h4>No appointment data yet</h4>
                <p>
                  Appointment schedules will appear here
                  once connected to the database.
                </p>
              </div>
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
