import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, SquareCheckBig, GraduationCap, Link2, Package, Printer, Users, Shield, LogOut, Menu } from 'lucide-react';
import { getSession, logout } from '../services/authService';
import { isAdmin } from '../services/authService';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: SquareCheckBig, label: 'Daily Tasks' },
  { to: '/training', icon: GraduationCap, label: 'Training Centre' },
  { to: '/quick-links', icon: Link2, label: 'Quick Links' },
  { to: '/stock', icon: Package, label: 'Stock' },
  { to: '/printing', icon: Printer, label: 'Printing Register' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const admin = isAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = session?.name?.charAt(0)?.toUpperCase() || 'R';
  const displayRole = session?.role === 'admin' ? 'Administrator' : `${session?.location || ''} Reception`.trim();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>ASG</div>
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>ASG Reception</span>
              <span className={styles.logoSub}>Day-to-Day</span>
            </div>
          </div>
          <nav className={styles.nav}>
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.to;
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {admin && (
              <button
                onClick={() => navigate('/admin')}
                className={`${styles.navLink} ${location.pathname === '/admin' ? styles.navLinkActive : ''}`}
                aria-current={location.pathname === '/admin' ? 'page' : undefined}
              >
                <Shield size={18} />
                <span>Admin</span>
              </button>
            )}
          </nav>
          <div className={styles.sidebarFooter}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>{userInitial}</div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{session?.name || 'Reception User'}</span>
                <span className={styles.userRole}>{displayRole}</span>
              </div>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} aria-label="Sign out">
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <span className={styles.greeting}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {session?.name?.split(' ')[0] || 'Reception'}
            </span>
            <span className={styles.date}>
              {new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.mobileLogoutBtn} onClick={handleLogout} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
