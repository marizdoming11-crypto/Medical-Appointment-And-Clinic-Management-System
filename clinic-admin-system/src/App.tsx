
import { Navigate, Route, Routes } from "react-router-dom";

// Page Components
import LoginPage from "./pages/LoginPage";
import AdminRegisterPage from "./pages/AdminRegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import DoctorsPage from "./pages/DoctorsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import MedicalRecordsPage from "./pages/MedicalRecordsPage";

// Route Protection
import ProtectedRoute from "./components/ProtectedRoute";

// Global Styles
import "./App.css";

function App() {
  return (
    <Routes>
      {/* Default Route */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Public Routes */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/admin-register"
        element={<AdminRegisterPage />}
      />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
<Route path="/medical-records" element={<MedicalRecordsPage />} />
        <Route
          path="/patients"
          element={<PatientsPage />}
        />

        <Route
          path="/doctors"
          element={<DoctorsPage />}
        />

        <Route
          path="/appointments"
          element={<AppointmentsPage />}
        />
      </Route>

      {/* Unknown Routes */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default App;
