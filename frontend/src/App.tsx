import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireRole } from './auth/RequireRole';
import { AssistantWidget } from './components/assistant/AssistantWidget';
import { AppLayout } from './components/layout/AppLayout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AboutPage } from './pages/AboutPage';
import { BookPage } from './pages/BookPage';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServicesPage } from './pages/ServicesPage';
import { WorkerDashboardPage } from './pages/WorkerDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route
              path="customer"
              element={
                <RequireRole roles={['CUSTOMER', 'ADMIN']}>
                  <CustomerDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="worker"
              element={
                <RequireRole roles={['WORKER', 'ADMIN']}>
                  <WorkerDashboardPage />
                </RequireRole>
              }
            />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        {/* Exactly one assistant widget for every route. */}
        <AssistantWidget />
      </AuthProvider>
    </BrowserRouter>
  );
}
