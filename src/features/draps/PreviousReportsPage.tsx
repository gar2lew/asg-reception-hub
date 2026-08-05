import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, Edit3, Printer, Download, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Select } from "../../components/Select/Select";
import { Badge } from "../../components/Badge/Badge";
import { FirebaseDailyDrapsReportRepository } from "../../repositories/firebase/FirebaseDailyDrapsReportRepository";
import { FirebaseDailyRepResultRepository } from "../../repositories/firebase/FirebaseDailyRepResultRepository";
import { formatDateAU } from "../../services/drapsCalculations";
import type { DailyDrapsReport } from "../../models/draps";
import { getSession } from "../../services/authService";
import styles from "./PreviousReportsPage.module.css";

const reportRepo = new FirebaseDailyDrapsReportRepository();
const resultRepo = new FirebaseDailyRepResultRepository();

const OFFICES = [{ value: "all", label: "All" }, { value: "brisbane", label: "Brisbane" }, { value: "perth", label: "Perth" }];

export function PreviousReportsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [reports, setReports] = useState<DailyDrapsReport[]>([]);
  const [officeFilter, setOfficeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resCounts, setResCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    reportRepo.getAll().then(list => {
      setReports(list);
      list.forEach(async r => {
        const results = await resultRepo.getByReport(r.id);
        setResCounts(prev => ({ ...prev, [r.id]: results.length }));
      });
    }).catch(console.error);
  }, []);

  const filtered = reports
    .filter(r => officeFilter === "all" || r.office === officeFilter)
    .filter(r => statusFilter === "all" || r.status === statusFilter);

  const reopen = async (report: DailyDrapsReport) => {
    if (!window.confirm("Reopen this report for editing?")) return;
    try {
      await reportRepo.reopen(report.id, session?.staffId || "", session?.name || "");
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "draft" as const } : r));
    } catch (e) { console.error(e); }
  };

  const print = (report: DailyDrapsReport) => {
    const url = `/draps/print?reportId=${report.id}`;
    window.open(url, "_blank");
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}><Button variant="ghost" size="sm" onClick={() => navigate("/draps")}><ArrowLeft size={14} /> Back</Button><h1 className={styles.title}><FileText size={24} /> Previous Reports</h1></div>
      <div className={styles.toolbar}>
        <Select label="Office" value={officeFilter} onChange={e => setOfficeFilter(e.target.value)} options={OFFICES} />
        <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={[{ value: "all", label: "All" }, { value: "draft", label: "Draft" }, { value: "complete", label: "Complete" }]} />
      </div>
      {filtered.length === 0 ? <p className={styles.empty}>No reports match the selected filters.</p> : (
        <div className={styles.table}>
          <div className={styles.tableHeader}><span>Date</span><span>Office</span><span>Status</span><span>Reps</span><span>Completed By</span><span></span></div>
          {filtered.map(r => (
            <div key={r.id} className={styles.tableRow}>
              <span className={styles.date}>{formatDateAU(r.reportDate)}</span>
              <span><Badge>{r.office === "all" ? "All" : r.office}</Badge></span>
              <span><Badge variant={r.status === "complete" ? "success" : "default"}>{r.status}</Badge></span>
              <span>{resCounts[r.id] ?? "—"}</span>
              <span className={styles.completedBy}>{r.completedByName || r.createdByName}</span>
              <span className={styles.rowActions}>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/draps?date=${r.reportDate}&office=${r.office}`)}><Eye size={14} /></Button>
                {r.status === "complete" && <Button variant="ghost" size="sm" onClick={() => reopen(r)}><Edit3 size={14} /></Button>}
                <Button variant="ghost" size="sm" onClick={() => print(r)}><Printer size={14} /></Button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
