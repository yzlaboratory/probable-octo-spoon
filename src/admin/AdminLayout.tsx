import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./shell/Sidebar";
import Topbar from "./shell/Topbar";
import "../styles/admin.css";

export default function AdminLayout() {
  // Rekey the outlet on pathname so .page-enter fires once per navigation.
  const { pathname } = useLocation();

  return (
    <div className="admin-shell flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 relative">
        <Topbar />
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
