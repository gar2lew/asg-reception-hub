import { BarChart3 } from "lucide-react";
import styles from "./DrapsPage.module.css";

export function DrapsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}><BarChart3 size={24} /> DRAPS & Stats</h1></div>
      <p className={styles.placeholder}>DRAPS reporting workspace — under active development.</p>
    </div>
  );
}
