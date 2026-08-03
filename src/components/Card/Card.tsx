import type { ReactNode } from 'react';
import styles from './Card.module.css';
type CardVariant = 'sm' | 'md' | 'lg' | 'flat';
interface CardProps { children: ReactNode; className?: string; variant?: CardVariant; }
export function Card({ children, className = '', variant = 'md' }: CardProps) {
  const v = variant === 'flat' ? styles.cardFlat : variant === 'sm' ? styles.cardSm : variant === 'lg' ? styles.cardLg : styles.cardMd;
  return <div className={`${styles.card} ${v} ${className}`.trim()}>{children}</div>;
}
interface CardHeaderProps { children: ReactNode; className?: string; }
export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`${styles.cardHeader} ${className}`.trim()}>{children}</div>;
}
interface CardTitleProps { children: ReactNode; className?: string; }
export function CardTitle({ children, className = '' }: CardTitleProps) {
  return <h3 className={`${styles.cardTitle} ${className}`.trim()}>{children}</h3>;
}
interface CardBodyProps { children: ReactNode; className?: string; }
export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`${styles.cardBody} ${className}`.trim()}>{children}</div>;
}
