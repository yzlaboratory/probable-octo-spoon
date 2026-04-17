import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { admin, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] text-neutral-500">
        Lade…
      </div>
    );
  }
  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  }
  return <Outlet />;
}
