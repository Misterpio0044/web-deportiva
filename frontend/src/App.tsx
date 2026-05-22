import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { LoginPage } from './ui/pages/LoginPage';
import { RegisterPage } from './ui/pages/RegisterPage';
import { DashboardPage } from './ui/pages/DashboardPage';
import { ActivitiesPage } from './ui/pages/ActivitiesPage';
import { ActivityDetailPage } from './ui/pages/ActivityDetailPage';
import { AddActivityPage } from './ui/pages/AddActivityPage';
import { SettingsPage } from './ui/pages/SettingsPage';
import { AdminAthletesPage } from './ui/pages/AdminAthletesPage';
import { StravaReturnPage } from './ui/pages/StravaReturnPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas — cualquiera puede entrar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/strava/return" element={<StravaReturnPage />} />

        {/* Rutas protegidas — solo usuarios autenticados */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/activities/add" element={<AddActivityPage />} />
          <Route path="/activities/:id" element={<ActivityDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Rutas de admin — solo rol admin */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/athletes" element={<AdminAthletesPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
