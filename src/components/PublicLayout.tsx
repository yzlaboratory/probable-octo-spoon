import { Outlet, useLocation } from "react-router-dom";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
import "../styles/public.css";

export default function PublicLayout() {
  const { pathname } = useLocation();

  return (
    <div className="public-shell flex min-h-screen flex-col">
      <PublicHeader />
      <main key={pathname} className="page-enter flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
