import { cn } from '../../utils/cn';
import styles from './Input.module.css';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={styles.wrapper}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input id={inputId} className={cn(styles.input, error && styles.hasError, className)} {...props} />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
