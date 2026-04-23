import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "../styles/admin.css";

export default function RequireAuth() {
  const { admin, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center">
        <span style={{ color: "var(--ink-3)" }}>Lade…</span>
      </div>
    );
  }
  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  }
  return <Outlet />;
}
