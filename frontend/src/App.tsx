import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { LoginPage } from './ui/pages/LoginPage';
import { DashboardPage } from './ui/pages/DashboardPage';
import { AdminAthletesPage } from './ui/pages/AdminAthletesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública — cualquiera puede entrar */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas — solo usuarios autenticados */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
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