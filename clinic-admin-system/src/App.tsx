
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminRegisterPage from "./pages/AdminRegisterPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-register" element={<AdminRegisterPage />} />
    </Routes>
  );
}

export default App;
