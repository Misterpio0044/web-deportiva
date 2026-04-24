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
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes (any authenticated user) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        {/* Admin-only routes */}
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
