import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { TrainingListPage } from '../features/training/TrainingListPage';
import { TrainingDetailPage } from '../features/training/TrainingDetailPage';
import { QuickLinksPage } from '../features/quickLinks/QuickLinksPage';
import { ContactsPage } from '../features/contacts/ContactsPage';
import { StockPage } from '../features/stock/StockPage';
import { PrintingPage } from '../features/printing/PrintingPage';
import { AdminPage } from '../features/admin/AdminPage';
import { RepresentativesPage } from '../features/representatives/RepresentativesPage';
import { DrapsPage } from '../features/draps/DrapsPage';
import { PreviousReportsPage } from '../features/draps/PreviousReportsPage';
import { DrapsPrintPage } from '../features/draps/DrapsPrintPage';
import { LoginPage } from '../features/auth/LoginPage';
import { isAuthenticated } from '../services/authService';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'training', element: <TrainingListPage /> },
      { path: 'training/:id', element: <TrainingDetailPage /> },
      { path: 'quick-links', element: <QuickLinksPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'stock', element: <StockPage /> },
      { path: 'printing', element: <PrintingPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'representatives', element: <RepresentativesPage /> },
      { path: 'draps', element: <DrapsPage /> },
      { path: 'draps/previous', element: <PreviousReportsPage /> },
      { path: 'draps/print', element: <DrapsPrintPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
]);
