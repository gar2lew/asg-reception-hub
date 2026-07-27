import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../services/authService';
import { Button } from '../../components/Button/Button';
export function LogoutButton() {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}
      aria-label="Sign out"
    >
      <LogOut size={16} />
      Sign Out
    </Button>
  );
}
