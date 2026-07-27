import { cn } from '../../utils/cn';
import styles from './Card.module.css';
interface CardProps { children: React.ReactNode; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg'; }
export function Card({ children, className, padding = 'md' }: CardProps) {
  return <div className={cn(styles.card, styles[padding], className)}>{children}</div>;
}
export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(styles.header, className)}>{children}</div>;
}
export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn(styles.title, className)}>{children}</h3>;
}
