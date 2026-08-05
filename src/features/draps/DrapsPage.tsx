import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart3, Save, CheckCircle, FileText, History, ChevronDown, ChevronUp, AlertCircle, Printer } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import { Badge } from "../../components/Badge/Badge";
import { FirebaseRepresentativeRepository } from "../../repositories/firebase/FirebaseRepresentativeRepository";
import { FirebaseDailyDrapsReportRepository } from "../../repositories/firebase/FirebaseDailyDrapsReportRepository";
import { FirebaseDailyRepResultRepository } from "../../repositories/firebase/FirebaseDailyRepResultRepository";
import { getSession } from "../../services/authService";
import { drapsCalc, formatDateAU, todayAU } from "../../services/drapsCalculations";
import { emptyRepResult, emptyDrapsSection, emptyFirstConsultSection, emptyFinanceRunSection } from "../../models/draps";
import type { Representative } from "../../models/representative";
import type { DailyDrapsReport, DailyRepResult, DrapsResultSection, FirstConsultResultSection, FinanceRunResultSection, ResultSectionStatus } from "../../models/draps";
import { useNavigate } from "react-router-dom";
import styles from "./DrapsPage.module.css";

const repRepo = new FirebaseRepresentativeRepository();
const reportRepo = new FirebaseDailyDrapsReportRepository();
const resultRepo = new FirebaseDailyRepResultRepository();

const OFFICES = [{ value: "all", label: "All Offices" }, { value: "brisbane", label: "Brisbane" }, { value: "perth", label: "Perth" }];
const STATUS_OPTIONS: { value: ResultSectionStatus; label: string }[] = [
  { value: "supplied", label: "Figures Supplied" },
  { value: "not_supplied", label: "Not Supplied by Rep" },
  { value: "not_applicable", label: "Not Applicable Today" },
  { value: "observation", label: "Observation" },
];

export function DrapsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [reportDate, setReportDate] = useState(todayAU());
  const [officeFilter, setOfficeFilter] = useState("all");
  const [report, setReport] = useState<DailyDrapsReport | null>(null);
  const [reps, setReps] = useState<Representative[]>([]);
  const [results, setResults] = useState<Map<string, DailyRepResult>>(new Map());
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const activeReps = useMemo(() =>
    reps.filter(r => r.active && (officeFilter === "all" || r.office === officeFilter || r.office === "all")),
  [reps, officeFilter]);

  const load = useCallback(async () => {
    try {
      const [allReps, existingReport] = await Promise.all([repRepo.getAll(), reportRepo.getByDate(reportDate, officeFilter)]);
      setReps(allReps);
      if (existingReport) {
        setReport(existingReport);
        setLastSaved(existingReport.updatedAt);
        const resList = await resultRepo.getByReport(existingReport.id);
        const map = new Map<string, DailyRepResult>();
        for (const r of resList) map.set(r.representativeId, r);
        setResults(map);
      } else {
        setReport(null); setResults(new Map()); setLastSaved(null);
      }
    } catch (e: any) { console.error("Load DRAPS failed:", e); }
  }, [reportDate, officeFilter]);

  useEffect(() => { load(); }, [load]);

  const ensureReport = useCallback(async (): Promise<DailyDrapsReport> => {
    if (report) return report;
    const uid = session?.staffId || "unknown";
    const name = session?.name || "Unknown";
    const rpt = await reportRepo.create(reportDate, officeFilter, uid, name);
    setReport(rpt);
    return rpt;
  }, [report, reportDate, officeFilter, session]);

  const getOrCreateResult = useCallback((rep: Representative): DailyRepResult => {
    const existing = results.get(rep.id);
    if (existing) return existing;
    return emptyRepResult(report?.id || "", reportDate, rep);
  }, [results, report, reportDate]);

  const updateResultField = useCallback((repId: string, section: "draps" | "firstConsult" | "financeRun", field: string, value: any) => {
    setResults(prev => {
      const next = new Map(prev);
      let current = next.get(repId) || emptyRepResult(report?.id || "", reportDate, activeReps.find(r => r.id === repId)!);
      const updated = { ...current, [section]: { ...current[section], [field]: value }, updatedAt: new Date().toISOString() };
      next.set(repId, updated);
      return next;
    });
  }, [report, reportDate, activeReps]);

  const saveDraft = async () => {
    setSaving(true); setMessage(null);
    try {
      const rpt = await ensureReport();
      const uid = session?.staffId || "unknown";
      const name = session?.name || "Unknown";
      for (const [, result] of results) {
        const withAudit = { ...result, reportId: rpt.id, updatedByUid: uid, updatedByName: name, updatedAt: new Date().toISOString() };
        await resultRepo.save(withAudit);
      }
      await reportRepo.update(rpt.id, { updatedByUid: uid, updatedByName: name });
      setLastSaved(new Date().toISOString());
      setMessage({ type: "success", text: "Draft saved." });
    } catch (e: any) {
      setMessage({ type: "error", text: "Could not save draft. Please try again." });
      console.error("Save draft failed:", e);
    } finally { setSaving(false); }
  };

  const markComplete = async () => {
    const repResults = activeReps.map(rep => getOrCreateResult(rep));
    let missing: string[] = [];
    for (const r of repResults) {
      const rep = activeReps.find(x => x.id === r.representativeId);
      const name = rep?.name || r.representativeId;
      if (rep?.includeDraps && !drapsCalc.isSectionValid(r.draps)) missing.push(`${name}: Daily DRAPS incomplete`);
      if (rep?.includeFirstConsult && !drapsCalc.isSectionValid(r.firstConsult)) missing.push(`${name}: First Consult incomplete`);
      if (rep?.includeFinanceRun && !drapsCalc.isSectionValid(r.financeRun)) missing.push(`${name}: Finance Run incomplete`);
    }
    if (missing.length > 0) {
      setMessage({ type: "error", text: `Cannot complete: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? "..." : ""}` });
      return;
    }
    if (!window.confirm("Mark this report as Complete? You can reopen it later if needed.")) return;
    setCompleting(true); setMessage(null);
    try {
      const rpt = await ensureReport();
      const uid = session?.staffId || "unknown";
      const name = session?.name || "Unknown";
      for (const r of repResults) {
        await resultRepo.save({ ...r, reportId: rpt.id, updatedByUid: uid, updatedByName: name, updatedAt: new Date().toISOString() });
      }
      await reportRepo.markComplete(rpt.id, uid, name);
      setReport({ ...rpt, status: "complete", completedByUid: uid, completedByName: name });
      setMessage({ type: "success", text: "Report marked as Complete." });
    } catch (e: any) {
      setMessage({ type: "error", text: "Could not complete report. Please try again." });
      console.error("Complete failed:", e);
    } finally { setCompleting(false); }
  };

  const reopen = async () => {
    if (!report || !window.confirm("Reopen this report for editing?")) return;
    try {
      const uid = session?.staffId || "unknown";
      const name = session?.name || "Unknown";
      await reportRepo.reopen(report.id, uid, name);
      setReport({ ...report, status: "draft" });
      setMessage({ type: "success", text: "Report reopened." });
    } catch (e: any) {
      setMessage({ type: "error", text: "Could not reopen report." });
      console.error("Reopen failed:", e);
    }
  };

  const summary = useMemo(() => {
    const repResults = activeReps.map(rep => getOrCreateResult(rep));
    const counts = drapsCalc.computeSummary(repResults.map(r => ({ draps: r.draps, firstConsult: r.firstConsult, financeRun: r.financeRun })));
    const draps = repResults.filter(r => activeReps.find(x => x.id === r.representativeId)?.includeDraps).map(r => r.draps);
    const fcs = repResults.filter(r => activeReps.find(x => x.id === r.representativeId)?.includeFirstConsult).map(r => r.firstConsult);
    const frs = repResults.filter(r => activeReps.find(x => x.id === r.representativeId)?.includeFinanceRun).map(r => r.financeRun);
    return { ...counts, draps: drapsCalc.drapsTotals(draps), fc: drapsCalc.firstConsultTotals(fcs), fr: drapsCalc.financeRunTotals(frs), drapsPr: drapsCalc.drapsPresentationRate(draps), drapsCr: drapsCalc.drapsCloseRate(draps), fcPr: drapsCalc.fcPresentationRate(fcs), fcCr: drapsCalc.fcCloseRate(fcs), frPr: drapsCalc.frPresentationRate(frs), frCr: drapsCalc.frCloseRate(frs) };
  }, [activeReps, results, getOrCreateResult]);

  const editable = !report || report.status === "draft";

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}><h1 className={styles.title}><BarChart3 size={24} /> DRAPS & Stats</h1></div>
      <div className={styles.toolbar}>
        <Input label="Date" type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
        <Select label="Office" value={officeFilter} onChange={e => setOfficeFilter(e.target.value)} options={OFFICES} />
        <div className={styles.statusBadge}>{report ? <Badge variant={report.status === "complete" ? "success" : "default"}>{report.status === "complete" ? "Complete" : "Draft"}</Badge> : <Badge variant="default">No report yet</Badge>}</div>
        <div className={styles.actions}>
          {editable ? <><Button onClick={saveDraft} disabled={saving} size="sm"><Save size={14} /> {saving ? "Saving..." : "Save Draft"}</Button><Button onClick={markComplete} disabled={completing} size="sm" variant="primary"><CheckCircle size={14} /> {completing ? "Completing..." : "Mark Complete"}</Button></>
            : <Button onClick={reopen} size="sm" variant="secondary"><CheckCircle size={14} /> Reopen</Button>}
          <Button onClick={() => navigate("/draps/previous")} size="sm" variant="ghost"><History size={14} /> Previous</Button>
        </div>
      </div>
      {lastSaved && <div className={styles.lastSaved}>Last saved: {new Date(lastSaved).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</div>}
      {message && <div className={message.type === "error" ? styles.errorMsg : styles.successMsg}>{message.text}</div>}

      {/* Summary */}
      <div className={styles.summaryGrid}>
        <Card><CardHeader><CardTitle>Daily DRAPS</CardTitle></CardHeader>
          <div className={styles.stats}><Stat label="DQ" value={summary.draps.doorQuestionnaires} /><Stat label="Ref" value={summary.draps.referrals} /><Stat label="Appts" value={summary.draps.appointments} /><Stat label="Pres" value={summary.draps.presented} /><Stat label="Sold" value={summary.draps.sold} /><Stat label="Pres %" display={summary.drapsPr.display} /><Stat label="Close %" display={summary.drapsCr.display} /></div>
        </Card>
        <Card><CardHeader><CardTitle>First Consult</CardTitle></CardHeader>
          <div className={styles.stats}><Stat label="Booked" value={summary.fc.bookedAppointments} /><Stat label="Pres" value={summary.fc.presented} /><Stat label="Sold" value={summary.fc.sold} /><Stat label="Pres %" display={summary.fcPr.display} /><Stat label="Close %" display={summary.fcCr.display} /></div>
        </Card>
        <Card><CardHeader><CardTitle>Finance Run</CardTitle></CardHeader>
          <div className={styles.stats}><Stat label="Booked" value={summary.fr.bookedAppointments} /><Stat label="Pres" value={summary.fr.presented} /><Stat label="Sold" value={summary.fr.sold} /><Stat label="Pres %" display={summary.frPr.display} /><Stat label="Close %" display={summary.frCr.display} /></div>
        </Card>
      </div>

      <Card><CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <div className={styles.stats}>
          <Stat label="Complete" value={summary.repsComplete} />
          <Stat label="Incomplete" value={summary.repsIncomplete} />
          <Stat label="Not Supplied" value={summary.notSupplied} />
          <Stat label="N/A" value={summary.notApplicable} />
          <Stat label="Observation" value={summary.observation} />
          {summary.missingValues > 0 && <Stat label="Missing" value={summary.missingValues} variant="danger" />}
        </div>
      </Card>

      {/* Representative Cards */}
      <div className={styles.repCards}>
        {activeReps.map(rep => {
          const result = getOrCreateResult(rep);
          const isExpanded = expanded.has(rep.id);
          return (
            <Card key={rep.id}>
              <CardHeader>
                <CardTitle>{rep.name}</CardTitle>
                <Badge>{rep.office === "all" ? "All" : rep.office.charAt(0).toUpperCase() + rep.office.slice(1)}</Badge>
                <Button variant="ghost" size="sm" onClick={() => { const next = new Set(expanded); isExpanded ? next.delete(rep.id) : next.add(rep.id); setExpanded(next); }}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Button>
              </CardHeader>
              {isExpanded && (
                <div className={styles.repSections}>
                  {rep.includeDraps && <SectionEditor label="Daily DRAPS" section={result.draps} editable={editable} onChange={(field, value) => updateResultField(rep.id, "draps", field, value)} fields={[{ key: "doorQuestionnaires", label: "Door Q" }, { key: "referrals", label: "Referrals" }, { key: "appointments", label: "Appts" }, { key: "presented", label: "Presented" }, { key: "sold", label: "Sold" }]} />}
                  {rep.includeFirstConsult && <SectionEditor label="First Consult" section={result.firstConsult} editable={editable} onChange={(field, value) => updateResultField(rep.id, "firstConsult", field, value)} fields={[{ key: "bookedAppointments", label: "Booked" }, { key: "presented", label: "Presented" }, { key: "sold", label: "Sold" }]} />}
                  {rep.includeFinanceRun && <SectionEditor label="Finance Run" section={result.financeRun} editable={editable} onChange={(field, value) => updateResultField(rep.id, "financeRun", field, value)} fields={[{ key: "bookedAppointments", label: "Booked" }, { key: "presented", label: "Presented" }, { key: "sold", label: "Sold" }]} />}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, display, variant }: { label: string; value?: number; display?: string; variant?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${variant === "danger" ? styles.statDanger : ""}`}>{display ?? value ?? "\u2014"}</span>
    </div>
  );
}

function SectionEditor({ label, section, editable, onChange, fields }: { label: string; section: any; editable: boolean; onChange: (field: string, value: any) => void; fields: { key: string; label: string }[] }) {
  const disabled = !editable || section.status !== "supplied" && section.status !== "observation";
  const placeholder = section.status === "not_supplied" ? "/" : section.status === "not_applicable" ? "N/A" : "";
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>{label}</span>
        {section.status === "observation" && <Badge variant="default">Observation</Badge>}
        {editable && <Select label="" value={section.status} onChange={e => onChange("status", e.target.value)} options={STATUS_OPTIONS} />}
        {!editable && <span className={styles.sectionStatus}>{STATUS_OPTIONS.find(o => o.value === section.status)?.label || section.status}</span>}
      </div>
      <div className={styles.fieldRow}>
        {fields.map(f => (
          <div key={f.key} className={styles.field}>
            <span className={styles.fieldLabel}>{f.label}</span>
            {disabled && placeholder ? <span className={styles.fieldPlaceholder}>{placeholder}</span>
              : <input type="number" min="0" step="1" className={styles.fieldInput} disabled={disabled} value={section[f.key] ?? ""} onChange={e => { const v = e.target.value; if (v === "") { onChange(f.key, null); return; } const n = parseInt(v); if (!isNaN(n) && n >= 0) onChange(f.key, n); }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
