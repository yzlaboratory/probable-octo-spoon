import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import logo from "../assets/logo.svg";

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const nav = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-sm px-3 py-2 text-sm transition ${
      isActive ? "bg-primary text-white" : "text-neutral-300 hover:bg-neutral-800"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-[#121212] text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-black px-6 py-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-8 w-8" />
          <div>
            <div className="text-xs text-neutral-400">SV Alemannia Thalexweiler</div>
            <div className="font-bold tracking-wide">Admin-Bereich</div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/admin/news" className={linkClass}>
            News
          </NavLink>
          <NavLink to="/admin/sponsors" className={linkClass}>
            Sponsoren
          </NavLink>
          <NavLink to="/admin/vorstand" className={linkClass}>
            Vorstand
          </NavLink>
          <NavLink to="/admin/admins" className={linkClass}>
            Admins
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">{admin?.email}</span>
          <button
            className="rounded-sm border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
            onClick={async () => {
              await logout();
              nav("/admin/login", { replace: true });
            }}
          >
            Abmelden
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
