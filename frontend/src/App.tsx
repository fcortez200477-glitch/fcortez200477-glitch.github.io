import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Transport } from './pages/Transport';
import { Traffic } from './pages/Traffic';
import { Incidents } from './pages/Incidents';
import { Reports } from './pages/Reports';
import { ApiDocs } from './pages/ApiDocs';
import { LinesRegistry } from './pages/LinesRegistry';
import { VehiclesRegistry } from './pages/VehiclesRegistry';
import { UsersRegistry } from './pages/UsersRegistry';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/transporte" element={<Transport />} />
        <Route path="/trafego" element={<Traffic />} />
        <Route path="/incidentes" element={<Incidents />} />
        <Route path="/cadastros/linhas" element={<LinesRegistry />} />
        <Route path="/cadastros/veiculos" element={<VehiclesRegistry />} />
        <Route path="/cadastros/usuarios" element={<UsersRegistry />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/documentacao" element={<ApiDocs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
