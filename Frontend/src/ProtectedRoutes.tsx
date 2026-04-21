import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoutes() {
  const auth = localStorage.getItem("accessToken"); // ← match what AuthSuccess saves

  return auth ? <Outlet /> : <Navigate to="/auth" />;
}

export function PublicRoutes() {
  const auth = localStorage.getItem("accessToken"); // ← match what AuthSuccess saves

  return auth ? <Navigate to="/home" /> : <Outlet />;
}