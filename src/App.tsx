import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ImpressumPage from "./pages/ImpressumPage";
import DatenschutzPage from "./pages/DatenschutzPage";
import NewsDetailPage from "./pages/NewsDetailPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/Impressum" element={<ImpressumPage />} />
        <Route path="/Datenschutzerklaerung" element={<DatenschutzPage />} />
        <Route path="/news/:path" element={<NewsDetailPage />} />
      </Route>
    </Routes>
  );
}
