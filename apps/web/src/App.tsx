import { Link, Route, Routes } from "react-router-dom";
import { Logo } from "./components/Logo";
import { HomeRedirect, RequireRole } from "./auth/RequireRole";
import { StaffLayout } from "./layouts/StaffLayout";
import { StudentLayout } from "./layouts/StudentLayout";
import { AdminPage } from "./pages/admin/AdminPage";
import { PlacesAdminPage } from "./pages/admin/PlacesAdminPage";
import { ReportsAdminPage } from "./pages/admin/ReportsAdminPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { OrgDashboard } from "./pages/org/OrgDashboard";
import { SocialEventPage } from "./pages/SocialEventPage";
import { AccessibilityPage } from "./pages/student/AccessibilityPage";
import { FreshmanPage } from "./pages/student/FreshmanPage";
import { GroupDetailPage, GroupsPage, NewGroupPage } from "./pages/student/GroupsPage";
import { HomePage } from "./pages/student/HomePage";
import { MapPage } from "./pages/student/MapPage";
import { ResourcesPage } from "./pages/student/ResourcesPage";
import { CheckInPage } from "./pages/CheckInPage";
import { CoordDashboard } from "./pages/coord/CoordDashboard";
import { EventFormPage } from "./pages/coord/EventFormPage";
import { ManageEventPage } from "./pages/coord/ManageEventPage";
import { PrintListPage } from "./pages/coord/PrintListPage";
import { TelaoPage } from "./pages/coord/TelaoPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EventDetailPage } from "./pages/student/EventDetailPage";
import { HoursPage } from "./pages/student/HoursPage";
import { MuralPage } from "./pages/student/MuralPage";
import { MyEventsPage } from "./pages/student/MyEventsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/c/:eventId/:phase/:code" element={<CheckInPage />} />
      <Route path="/confirmar/:id" element={<SocialEventPage />} />
      <Route
        element={
          <RequireRole roles={["organizer", "admin"]}>
            <StaffLayout />
          </RequireRole>
        }
      >
        <Route path="/atletica" element={<OrgDashboard />} />
      </Route>
      <Route
        path="/mapa-publico"
        element={
          <div className="min-h-dvh">
            <header className="bg-brand-900 px-4 py-3">
              <Link to="/login" aria-label="Voltar para a entrada">
                <Logo light />
              </Link>
            </header>
            <MapPage publicMode />
          </div>
        }
      />
      <Route
        element={
          <RequireRole roles={["student"]}>
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route path="/inicio" element={<HomePage />} />
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/grupos" element={<GroupsPage />} />
        <Route path="/grupos/novo" element={<NewGroupPage />} />
        <Route path="/grupos/:id" element={<GroupDetailPage />} />
        <Route path="/avisos" element={<AnnouncementsPage />} />
        <Route path="/materiais" element={<ResourcesPage />} />
        <Route path="/calouro" element={<FreshmanPage />} />
        <Route path="/acessibilidade" element={<AccessibilityPage />} />
        <Route path="/eventos" element={<MuralPage />} />
        <Route path="/eventos/:id" element={<EventDetailPage />} />
        <Route path="/meus-eventos" element={<MyEventsPage />} />
        <Route path="/horas" element={<HoursPage />} />
      </Route>

      <Route
        path="/coord/eventos/:id/telao"
        element={
          <RequireRole roles={["coordinator"]}>
            <TelaoPage />
          </RequireRole>
        }
      />
      <Route
        path="/coord/eventos/:id/lista"
        element={
          <RequireRole roles={["coordinator"]}>
            <PrintListPage />
          </RequireRole>
        }
      />
      <Route
        element={
          <RequireRole roles={["coordinator"]}>
            <StaffLayout />
          </RequireRole>
        }
      >
        <Route path="/coord" element={<CoordDashboard />} />
        <Route path="/coord/eventos/novo" element={<EventFormPage />} />
        <Route path="/coord/eventos/:id" element={<ManageEventPage />} />
        <Route path="/coord/eventos/:id/editar" element={<EventFormPage />} />
        <Route path="/coord/avisos" element={<AnnouncementsPage />} />
      </Route>

      <Route
        element={
          <RequireRole roles={["admin"]}>
            <StaffLayout />
          </RequireRole>
        }
      >
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/mapa" element={<PlacesAdminPage />} />
        <Route path="/admin/avisos" element={<AnnouncementsPage />} />
        <Route path="/admin/acessibilidade" element={<ReportsAdminPage />} />
      </Route>

      <Route
        path="*"
        element={
          <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
            <p className="text-5xl font-extrabold text-brand-800">404</p>
            <p className="text-slate-600">Página não encontrada.</p>
            <Link to="/" className="font-semibold text-brand-700 underline">
              Ir para o início
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
