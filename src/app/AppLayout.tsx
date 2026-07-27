import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, GraduationCap, Package, Printer, Link2, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import { getSession, logout } from '../services/authService';
import { greeting, todayAustralian } from '../utils/date';
import { cn } from '../utils/cn';
import styles from './AppLayout.module.css';
const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Daily Tasks' },
  { to: '/training', icon: GraduationCap, label: 'Training Centre' },
  { to: '/quick-links', icon: Link2, label: 'Quick Links' },
  { to: '/stock', icon: Package, label: 'Stock' },
  { to: '/printing', icon: Printer, label: 'Printing Register' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
];
const adminItems = [
  { to: '/admin', icon: Settings, label: 'Admin Area' },
];
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const session = getSession();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const isAdmin = session?.role === 'admin';
  const userLocation = session?.location;
  const sidebar = (
    <div className={styles.sidebarInner}>
      <div className={styles.logo}>
        <div className={styles.logoMark}>ASG</div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>ASG Reception</span>
          <span className={styles.logoSub}>Day-to-Day</span>
        </div>
      </div>
      <nav className={styles.nav}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => cn(styles.navLink, isActive && styles.navLinkActive)} onClick={() => setMobileOpen(false)}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {isAdmin && (
        <>
          <div className={styles.divider} />
          <div className={styles.sectionLabel}>Admin</div>
          <nav className={styles.nav}>
            {adminItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={({ isActive }) => cn(styles.navLink, isActive && styles.navLinkActive)} onClick={() => setMobileOpen(false)}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}
      <div className={styles.sidebarFooter}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>{session?.name?.charAt(0) || '?'}</div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{session?.name}</span>
            <span className={styles.userRole}>{session?.role === 'admin' ? 'Administrator' : userLocation ? `${userLocation} Reception` : 'Receptionist'}</span>
          </div>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn} aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>{sidebar}</aside>
      {mobileOpen && (
        <div className={styles.mobileOverlay}>
          <div className={styles.mobileSidebar}>
            <div className={styles.mobileHeader}>
              <button onClick={() => setMobileOpen(false)} className={styles.mobileClose} aria-label="Close menu"><X size={20} /></button>
            </div>
            {sidebar}
          </div>
          <div className={styles.overlayBg} onClick={() => setMobileOpen(false)} />
        </div>
      )}
      <div className={styles.main}>
        <header className={styles.header}>
          <button onClick={() => setMobileOpen(true)} className={styles.menuBtn} aria-label="Open menu"><Menu size={20} /></button>
          <div className={styles.headerLeft}>
            <span className={styles.greeting}>{greeting()}, {session?.name?.split(' ')[0]}</span>
            <span className={styles.date}>{todayAustralian()}</span>
          </div>
          <div className={styles.headerRight}>
            <button onClick={handleLogout} className={styles.mobileLogoutBtn} aria-label="Sign out"><LogOut size={18} /></button>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
