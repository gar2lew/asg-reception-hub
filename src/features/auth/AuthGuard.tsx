import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, isAdmin } from '../../services/authService';
interface AuthGuardProps { children: React.ReactNode; requireAdmin?: boolean; }
export function AuthGuard({ children, requireAdmin }: AuthGuardProps) {
  const location = useLocation();
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requireAdmin && !isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}
