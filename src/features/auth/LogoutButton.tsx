import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../services/authService';
import { Button } from '../../components/Button/Button';
export function LogoutButton() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // The auth service clears the UI session even if provider sign-out fails.
    } finally {
      navigate('/login');
    }
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}
      aria-label="Sign out"
    >
      <LogOut size={16} />
      Sign Out
    </Button>
  );
}
