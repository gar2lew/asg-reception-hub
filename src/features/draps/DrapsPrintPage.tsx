import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FirebaseDailyDrapsReportRepository } from "../../repositories/firebase/FirebaseDailyDrapsReportRepository";
import { FirebaseDailyRepResultRepository } from "../../repositories/firebase/FirebaseDailyRepResultRepository";
import { FirebaseRepresentativeRepository } from "../../repositories/firebase/FirebaseRepresentativeRepository";
import { drapsCalc, formatDateAU } from "../../services/drapsCalculations";
import type { DailyDrapsReport, DailyRepResult } from "../../models/draps";
import styles from "./DrapsPrintPage.module.css";

const reportRepo = new FirebaseDailyDrapsReportRepository();
const resultRepo = new FirebaseDailyRepResultRepository();

export function DrapsPrintPage() {
  const [params] = useSearchParams();
  const reportId = params.get("reportId");
  const [report, setReport] = useState<DailyDrapsReport | null>(null);
  const [results, setResults] = useState<DailyRepResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) { setLoading(false); return; }
    Promise.all([reportRepo.getById(reportId), resultRepo.getByReport(reportId)]).then(([rpt, res]) => {
      setReport(rpt || null);
      setResults(res);
    }).catch(console.error).finally(() => setLoading(false));
  }, [reportId]);

  useEffect(() => { if (report) document.title = `Daily_DRAPS_${report.reportDate.replace(/-/g, "-")}.pdf`; }, [report]);

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;
  if (!report) return <div className={styles.page}><p>Report not found.</p></div>;

  const summary = drapsCalc.computeSummary(results.map(r => ({ draps: r.draps, firstConsult: r.firstConsult, financeRun: r.financeRun })));
  const drapsRes = results.map(r => r.draps);
  const fcRes = results.map(r => r.firstConsult);
  const frRes = results.map(r => r.financeRun);
  const dTotals = drapsCalc.drapsTotals(drapsRes);
  const fcTotals = drapsCalc.firstConsultTotals(fcRes);
  const frTotals = drapsCalc.financeRunTotals(frRes);

  const noPrint = "no-print";

  return (
    <div className={styles.page}>
      <div className={noPrint} style={{ padding: "16px", textAlign: "center" }}>
        <button onClick={() => window.print()} style={{ padding: "8px 24px", fontSize: "14px", cursor: "pointer" }}>Print</button>
        <span style={{ marginLeft: "12px", color: "#666", fontSize: "13px" }}>PDF: Ctrl+P → Save as PDF</span>
      </div>
      <div className={styles.report}>
        <div className={styles.branding}>
          <div className={styles.logo}>ASG</div>
          <div><span className={styles.brandTitle}>ASG Reception Hub</span></div>
        </div>
        <h1 className={styles.reportTitle}>Daily DRAPS & Sales Results</h1>
        <div className={styles.meta}>
          <span><strong>Date:</strong> {formatDateAU(report.reportDate)}</span>
          <span><strong>Office:</strong> {report.office === "all" ? "All Offices" : report.office.charAt(0).toUpperCase() + report.office.slice(1)}</span>
          <span><strong>Status:</strong> {report.status}</span>
          <span><strong>Prepared by:</strong> {report.createdByName}</span>
          <span><strong>Generated:</strong> {new Date().toLocaleString("en-AU")}</span>
        </div>

        <h2 className={styles.sectionTitle}>Representative Results</h2>
        <table className={styles.dataTable}>
          <thead><tr><th>Representative</th><th>Office</th><th>DQ</th><th>Referrals</th><th>Appts</th><th>Presented</th><th>Sold</th><th>FC Booked</th><th>FC Pres</th><th>FC Sold</th><th>FR Booked</th><th>FR Pres</th><th>FR Sold</th><th>Statuses</th></tr></thead>
          <tbody>
            {results.map(r => {
              const statuses: string[] = [];
              if (r.draps.status !== "supplied") statuses.push(`DRAPS: ${r.draps.status}`);
              if (r.firstConsult.status !== "supplied") statuses.push(`FC: ${r.firstConsult.status}`);
              if (r.financeRun.status !== "supplied") statuses.push(`FR: ${r.financeRun.status}`);
              return (
                <tr key={r.id}>
                  <td>{r.representativeNameSnapshot}</td>
                  <td>{r.officeSnapshot}</td>
                  <td>{r.draps.status === "not_supplied" ? "/" : r.draps.status === "not_applicable" ? "N/A" : r.draps.doorQuestionnaires ?? "—"}</td>
                  <td>{r.draps.status === "not_supplied" ? "/" : r.draps.status === "not_applicable" ? "N/A" : r.draps.referrals ?? "—"}</td>
                  <td>{r.draps.status === "not_supplied" ? "/" : r.draps.status === "not_applicable" ? "N/A" : r.draps.appointments ?? "—"}</td>
                  <td>{r.draps.status === "not_supplied" ? "/" : r.draps.status === "not_applicable" ? "N/A" : r.draps.presented ?? "—"}</td>
                  <td>{r.draps.status === "not_supplied" ? "/" : r.draps.status === "not_applicable" ? "N/A" : r.draps.sold ?? "—"}</td>
                  <td>{r.firstConsult.status === "not_supplied" ? "/" : r.firstConsult.status === "not_applicable" ? "N/A" : r.firstConsult.bookedAppointments ?? "—"}</td>
                  <td>{r.firstConsult.status === "not_supplied" ? "/" : r.firstConsult.status === "not_applicable" ? "N/A" : r.firstConsult.presented ?? "—"}</td>
                  <td>{r.firstConsult.status === "not_supplied" ? "/" : r.firstConsult.status === "not_applicable" ? "N/A" : r.firstConsult.sold ?? "—"}</td>
                  <td>{r.financeRun.status === "not_supplied" ? "/" : r.financeRun.status === "not_applicable" ? "N/A" : r.financeRun.bookedAppointments ?? "—"}</td>
                  <td>{r.financeRun.status === "not_supplied" ? "/" : r.financeRun.status === "not_applicable" ? "N/A" : r.financeRun.presented ?? "—"}</td>
                  <td>{r.financeRun.status === "not_supplied" ? "/" : r.financeRun.status === "not_applicable" ? "N/A" : r.financeRun.sold ?? "—"}</td>
                  <td className={styles.statusCell}>{statuses.join("; ") || "All supplied"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={2}><strong>Totals</strong></td>
              <td>{dTotals.doorQuestionnaires}</td><td>{dTotals.referrals}</td><td>{dTotals.appointments}</td><td>{dTotals.presented}</td><td>{dTotals.sold}</td>
              <td>{fcTotals.bookedAppointments}</td><td>{fcTotals.presented}</td><td>{fcTotals.sold}</td>
              <td>{frTotals.bookedAppointments}</td><td>{frTotals.presented}</td><td>{frTotals.sold}</td><td></td>
            </tr>
          </tfoot>
        </table>

        <h2 className={styles.sectionTitle}>Conversion Rates</h2>
        <div className={styles.rates}>
          <span>DRAPS Presentation: {drapsCalc.drapsPresentationRate(drapsRes).display}</span>
          <span>DRAPS Close: {drapsCalc.drapsCloseRate(drapsRes).display}</span>
          <span>FC Presentation: {drapsCalc.fcPresentationRate(fcRes).display}</span>
          <span>FC Close: {drapsCalc.fcCloseRate(fcRes).display}</span>
          <span>FR Presentation: {drapsCalc.frPresentationRate(frRes).display}</span>
          <span>FR Close: {drapsCalc.frCloseRate(frRes).display}</span>
        </div>

        <h2 className={styles.sectionTitle}>Summary</h2>
        <div className={styles.summary}>
          <span>Complete: {summary.repsComplete}</span>
          <span>Incomplete: {summary.repsIncomplete}</span>
          <span>Not Supplied: {summary.notSupplied}</span>
          <span>N/A: {summary.notApplicable}</span>
          <span>Observation: {summary.observation}</span>
          <span>Missing: {summary.missingValues}</span>
        </div>

        {report.notes && <><h2 className={styles.sectionTitle}>Notes</h2><p>{report.notes}</p></>}
        {report.completedByName && <p className={styles.footer}>Completed by {report.completedByName} on {report.completedAt ? new Date(report.completedAt).toLocaleString("en-AU") : "—"}</p>}
        {report.reopenedByUid && <p className={styles.footer}>Reopened by {report.reopenedByName} on {report.reopenedAt ? new Date(report.reopenedAt).toLocaleString("en-AU") : "—"}</p>}
      </div>
    </div>
  );
}
