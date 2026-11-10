import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
  const token = sessionStorage.getItem("authToken");
  const savedUser = sessionStorage.getItem("authUser");

  let user = null;

  try {
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    user = null;
  }

  if (!token || !user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;