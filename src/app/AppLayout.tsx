import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, SquareCheckBig, GraduationCap, Link2, Package, Printer, Users, Shield, LogOut, Menu, ChevronDown, BarChart3, UserRoundPlus } from 'lucide-react';
import { getSession, logout, isAdmin } from '../services/authService';
import styles from './AppLayout.module.css';
type NavGroup = { label: string; items: { to: string; icon: any; label: string }[] };
const NAV_GROUPS: NavGroup[] = [
  { label: 'Workspace', items: [{ to: '/', icon: LayoutDashboard, label: "Today's Workspace" }, { to: '/tasks', icon: SquareCheckBig, label: 'Daily Tasks' }, { to: '/draps', icon: BarChart3, label: 'DRAPS & Stats' }, { to: '/representatives', icon: UserRoundPlus, label: 'Representatives' }] },
  { label: 'Operations', items: [{ to: '/quick-links', icon: Link2, label: 'Quick Links' }, { to: '/stock', icon: Package, label: 'Stock' }, { to: '/printing', icon: Printer, label: 'Printing Register' }] },
  { label: 'Knowledge', items: [{ to: '/training', icon: GraduationCap, label: 'Training Centre' }] },
  { label: 'People', items: [{ to: '/contacts', icon: Users, label: 'Contacts' }] },
];
const ADMIN_GROUP: NavGroup = {
  label: 'Administration', items: [
    { to: '/admin', icon: Shield, label: 'Task Management' },
    { to: '/admin?tab=staff', icon: Users, label: 'Staff' },
    { to: '/admin?tab=categories', icon: Package, label: 'Stock Categories' },
    { to: '/admin?tab=suppliers', icon: Package, label: 'Suppliers' },
    { to: '/admin?tab=archived-stock', icon: Package, label: 'Archived Stock' },
    { to: '/admin?tab=orders', icon: Package, label: 'Orders' },
  ],
};
export function AppLayout() {
  const navigate = useNavigate(); const location = useLocation();
  const session = getSession(); const admin = isAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const userInitial = session?.name?.charAt(0)?.toUpperCase() || 'R';
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const displayRole = session?.role === 'admin' ? 'Administrator' : `${session?.location ? session.location.charAt(0).toUpperCase() + session.location.slice(1) : ''} Reception`.trim();
  const groups = admin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
        <div className={styles.sidebarInner}>
          <div className={styles.logo}><div className={styles.logoMark}>ASG</div><div className={styles.logoText}><span className={styles.logoTitle}>ASG Reception</span><span className={styles.logoSub}>Day-to-Day</span></div></div>
          <nav className={styles.nav}>
            {groups.map(group => (
              <div key={group.label} className={styles.navGroup}>
                <span className={styles.navGroupLabel}>{group.label}</span>
                {group.items.map(item => {
                  const active = location.pathname === item.to || (item.to.includes('?') && location.pathname + location.search === item.to);
                  return <button key={item.to} onClick={() => navigate(item.to)} className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`} aria-current={active ? 'page' : undefined}><item.icon size={18} /><span>{item.label}</span></button>;
                })}
              </div>
            ))}
          </nav>
          <div className={styles.sidebarFooter}><div className={styles.userInfo}><div className={styles.userAvatar}>{userInitial}</div><div className={styles.userDetails}><span className={styles.userName}>{session?.name || 'Reception User'}</span><span className={styles.userRole}>{displayRole}</span></div></div><button className={styles.logoutBtn} onClick={handleLogout} aria-label="Sign out"><LogOut size={16} /><span>Sign out</span></button></div>
        </div>
      </aside>
      {mobileOpen && <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}><button className={styles.menuBtn} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu"><Menu size={20} /></button><span className={styles.greeting}>Good {timeOfDay}, {session?.name?.split(' ')[0] || 'Reception'}</span><span className={styles.date}>{new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div>
          <div className={styles.headerRight}><button className={styles.mobileLogoutBtn} onClick={handleLogout} aria-label="Sign out"><LogOut size={18} /></button></div>
        </header>
        <main className={styles.content}><Outlet /></main>
      </div>
    </div>
  );
}
