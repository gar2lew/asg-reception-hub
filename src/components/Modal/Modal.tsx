import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}
export function Modal({ open, onClose, title, children, width }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) { el.showModal(); } else { el.close(); }
  }, [open]);
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener('close', handler);
    return () => el.removeEventListener('close', handler);
  }, [onClose]);
  if (!open) return null;
  return (
    <dialog ref={dialogRef} className={styles.dialog} style={width ? { maxWidth: width } : undefined}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <button onClick={onClose} className={styles.close} aria-label="Close dialog"><X size={18} /></button>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
