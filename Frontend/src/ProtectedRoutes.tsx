import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoutes() {
  const auth = localStorage.getItem("user"); // ← changed from "username" to "user"

  return auth ? <Outlet /> : <Navigate to="/auth" />;
}

export function PublicRoutes() {
  const auth = localStorage.getItem("user"); // ← changed from "username" to "user"

  return auth ? <Navigate to="/home" /> : <Outlet />; // ← also changed "/" to "/home"
}