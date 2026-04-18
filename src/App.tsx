import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ImpressumPage from "./pages/ImpressumPage";
import DatenschutzPage from "./pages/DatenschutzPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import SchedulePage from "./pages/SchedulePage";
import TrainingPage from "./pages/TrainingPage";
import { AuthProvider } from "./admin/AuthContext";
import RequireAuth from "./admin/RequireAuth";
import AdminLayout from "./admin/AdminLayout";
import LoginPage from "./admin/pages/LoginPage";
import ResetPage from "./admin/pages/ResetPage";
import NewsListPage from "./admin/pages/NewsListPage";
import NewsEditPage from "./admin/pages/NewsEditPage";
import SponsorListPage from "./admin/pages/SponsorListPage";
import SponsorEditPage from "./admin/pages/SponsorEditPage";
import VorstandPage from "./admin/pages/VorstandPage";
import AdminsPage from "./admin/pages/AdminsPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/Impressum" element={<ImpressumPage />} />
          <Route path="/Datenschutzerklaerung" element={<DatenschutzPage />} />
          <Route path="/news/:path" element={<NewsDetailPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/spiele" element={<SchedulePage />} />
        </Route>

        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/reset" element={<ResetPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/news" replace />} />
            <Route path="/admin/news" element={<NewsListPage />} />
            <Route path="/admin/news/new" element={<NewsEditPage />} />
            <Route path="/admin/news/:id" element={<NewsEditPage />} />
            <Route path="/admin/sponsors" element={<SponsorListPage />} />
            <Route path="/admin/sponsors/new" element={<SponsorEditPage />} />
            <Route path="/admin/sponsors/:id" element={<SponsorEditPage />} />
            <Route path="/admin/vorstand" element={<VorstandPage />} />
            <Route path="/admin/admins" element={<AdminsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
