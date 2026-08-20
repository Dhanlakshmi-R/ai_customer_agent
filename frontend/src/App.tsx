import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { PageBackground } from './components/PageBackground';
import { useStore } from './store/useStore';

// Pages
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { MainConsolePage } from './pages/MainConsolePage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SessionsPage } from './pages/SessionsPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient();

// Protected Layout with Sidebar and Header
const DashboardLayout: React.FC = () => {
  const { user } = useStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-canvas relative flex h-screen text-slate-100 overflow-hidden">
      <PageBackground />
      <Sidebar />
      <MobileNav />
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        <main className="flex-1 min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { theme } = useStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Application Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/console" element={<MainConsolePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback Redirection */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {/* Global development banner — bottom right corner of the whole project */}
        <div className="fixed bottom-3 right-4 z-50 pointer-events-none select-none hidden sm:block">
          <div
            className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] tracking-wide backdrop-blur-md"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'color-mix(in srgb, var(--surface-1) 82%, transparent)',
              color: 'var(--text-muted)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Sparkles className="w-3 h-3 shrink-0" style={{ color: 'var(--brand)' }} />
            <span>Development of AI-Powered Customer Support Assistant with Live Response Guidance</span>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
