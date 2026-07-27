import { cn } from '../../utils/cn';
import styles from './Badge.module.css';
interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string; }
export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return <span className={cn(styles.badge, styles[variant], className)}>{children}</span>;
}
