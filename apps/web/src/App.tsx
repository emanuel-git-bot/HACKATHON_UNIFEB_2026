import { Link, Route, Routes } from "react-router-dom";
import { HomeRedirect, RequireRole } from "./auth/RequireRole";
import { StaffLayout } from "./layouts/StaffLayout";
import { StudentLayout } from "./layouts/StudentLayout";
import { AdminPage } from "./pages/admin/AdminPage";
import { CertificatePage } from "./pages/CertificatePage";
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
import { VerifyPage } from "./pages/VerifyPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/c/:eventId/:phase/:code" element={<CheckInPage />} />
      <Route path="/verificar" element={<VerifyPage />} />
      <Route path="/verificar/:code" element={<VerifyPage />} />
      <Route
        path="/certificados/:id"
        element={
          <RequireRole>
            <CertificatePage />
          </RequireRole>
        }
      />

      <Route
        element={
          <RequireRole roles={["student"]}>
            <StudentLayout />
          </RequireRole>
        }
      >
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
      </Route>

      <Route
        element={
          <RequireRole roles={["admin"]}>
            <StaffLayout />
          </RequireRole>
        }
      >
        <Route path="/admin" element={<AdminPage />} />
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
