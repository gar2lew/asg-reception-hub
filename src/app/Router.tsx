import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { AuthGuard } from '../features/auth/AuthGuard';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { TrainingListPage } from '../features/training/TrainingListPage';
import { TrainingDetailPage } from '../features/training/TrainingDetailPage';
import { QuickLinksPage } from '../features/quickLinks/QuickLinksPage';
import { StockPage } from '../features/stock/StockPage';
import { PrintingPage } from '../features/printing/PrintingPage';
import { ContactsPage } from '../features/contacts/ContactsPage';
import { AdminPage } from '../features/admin/AdminPage';
import { getSession } from '../services/authService';
function RootRedirect() {
  const session = getSession();
  if (session) return <AppLayout />;
  return <Navigate to="/login" replace />;
}
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage onLogin={() => { window.location.href = '/'; }} />,
  },
  {
    path: '/',
    element: <RootRedirect />,
    children: [
      { index: true, element: <AuthGuard><DashboardPage /></AuthGuard> },
      { path: 'tasks', element: <AuthGuard><TasksPage /></AuthGuard> },
      { path: 'training', element: <AuthGuard><TrainingListPage /></AuthGuard> },
      { path: 'training/:id', element: <AuthGuard><TrainingDetailPage /></AuthGuard> },
      { path: 'quick-links', element: <AuthGuard><QuickLinksPage /></AuthGuard> },
      { path: 'stock', element: <AuthGuard><StockPage /></AuthGuard> },
      { path: 'printing', element: <AuthGuard><PrintingPage /></AuthGuard> },
      { path: 'contacts', element: <AuthGuard><ContactsPage /></AuthGuard> },
      { path: 'admin', element: <AuthGuard requireAdmin><AdminPage /></AuthGuard> },
    ],
  },
]);
