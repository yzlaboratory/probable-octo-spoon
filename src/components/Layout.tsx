import { Outlet } from "react-router-dom";
import Header from "./Header";
import "../styles/public.css";

export default function Layout() {
  return (
    <div className="public-shell flex min-h-screen flex-col">
      <Header />
      <Outlet />
    </div>
  );
}
