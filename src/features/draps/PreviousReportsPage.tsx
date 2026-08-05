import { FileText } from "lucide-react";
import styles from "./PreviousReportsPage.module.css";

export function PreviousReportsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}><FileText size={24} /> Previous Reports</h1></div>
      <p className={styles.placeholder}>Previous reports — coming soon.</p>
    </div>
  );
}
