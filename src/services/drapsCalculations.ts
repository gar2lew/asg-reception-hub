/**
 * DRAPS calculation helpers — pure functions, no side effects.
 */
import type { DrapsResultSection, FirstConsultResultSection, FinanceRunResultSection } from "../models/draps";

export type CalcResult = { value: number | null; display: string };

function safeRate(numerator: number | null, denominator: number | null, hasData?: boolean): CalcResult {
  if (numerator == null || denominator == null || denominator === 0) {
    if (denominator === 0 && hasData) return { value: 0, display: "0%" };
    return { value: null, display: "—" };
  }
  const pct = Math.round((numerator / denominator) * 100);
  return { value: pct, display: `${pct}%` };
}

function safeSum(values: (number | null)[]): number {
  return values.reduce((s: number, v) => s + (v ?? 0), 0);
}

// ---- Per-section totals ----

function drapsTotals(sections: DrapsResultSection[]) {
  const included = sections.filter(s => s.status === "supplied" || s.status === "observation");
  return {
    doorQuestionnaires: safeSum(included.map(s => s.doorQuestionnaires)),
    referrals: safeSum(included.map(s => s.referrals)),
    appointments: safeSum(included.map(s => s.appointments)),
    presented: safeSum(included.map(s => s.presented)),
    sold: safeSum(included.map(s => s.sold)),
  };
}

function firstConsultTotals(sections: FirstConsultResultSection[]) {
  const included = sections.filter(s => s.status === "supplied" || s.status === "observation");
  return {
    bookedAppointments: safeSum(included.map(s => s.bookedAppointments)),
    presented: safeSum(included.map(s => s.presented)),
    sold: safeSum(included.map(s => s.sold)),
  };
}

function financeRunTotals(sections: FinanceRunResultSection[]) {
  const included = sections.filter(s => s.status === "supplied" || s.status === "observation");
  return {
    bookedAppointments: safeSum(included.map(s => s.bookedAppointments)),
    presented: safeSum(included.map(s => s.presented)),
    sold: safeSum(included.map(s => s.sold)),
  };
}

// ---- Conversion rates ----

function drapsPresentationRate(drapsSections: DrapsResultSection[]): CalcResult {
  const totals = drapsTotals(drapsSections);
  const hasData = drapsSections.some(s => s.status === "supplied" || s.status === "observation");
  return safeRate(totals.presented, totals.appointments, hasData);
}

function drapsCloseRate(drapsSections: DrapsResultSection[]): CalcResult {
  const totals = drapsTotals(drapsSections);
  const hasData = drapsSections.some(s => s.status === "supplied" || s.status === "observation");
  return safeRate(totals.sold, totals.presented, hasData);
}

function fcPresentationRate(fcs: FirstConsultResultSection[]): CalcResult {
  const totals = firstConsultTotals(fcs);
  const hasData = fcs.some(s => s.status === "supplied" || s.status === "observation");
  return safeRate(totals.presented, totals.bookedAppointments, hasData);
}

function fcCloseRate(fcs: FirstConsultResultSection[]): CalcResult {
  const totals = firstConsultTotals(fcs);
  const hasData = fcs.some(s => s.status === "supplied" || s.status === "observation");
  return safeRate(totals.sold, totals.presented, hasData);
}

function frPresentationRate(frs: FinanceRunResultSection[]): CalcResult {
  const totals = financeRunTotals(frs);
  const hasData = frs.some(s => s.status === "supplied" || s.status === "observation");
  return safeRate(totals.presented, totals.bookedAppointments, hasData);
}

function frCloseRate(frs: FinanceRunResultSection[]): CalcResult {
  const totals = financeRunTotals(frs);
  const hasData = frs.some(s => s.status === "supplied" || s.status === "observation");
  return safeRate(totals.sold, totals.presented, hasData);
}

// ---- Summary counts ----

interface SummaryCounts {
  repsComplete: number;
  repsIncomplete: number;
  notSupplied: number;
  notApplicable: number;
  observation: number;
  missingValues: number;
}

function computeSummary(results: { draps: DrapsResultSection; firstConsult: FirstConsultResultSection; financeRun: FinanceRunResultSection }[]): SummaryCounts {
  let repsComplete = 0;
  let repsIncomplete = 0;
  let notSupplied = 0;
  let notApplicable = 0;
  let observation = 0;
  let missingValues = 0;

  for (const r of results) {
    let allDone = true;
    for (const section of [r.draps, r.firstConsult, r.financeRun] as const) {
      const s = section as any;
      if (s.status === "not_supplied") { notSupplied++; continue; }
      if (s.status === "not_applicable") { notApplicable++; continue; }
      if (s.status === "observation") { observation++; }
      if (s.status === "supplied" || s.status === "observation") {
        const numericFields = Object.keys(s).filter(k => k !== "status");
        for (const f of numericFields) {
          if (s[f] == null) { missingValues++; allDone = false; }
        }
      }
    }
    if (allDone) repsComplete++;
    else repsIncomplete++;
  }

  return { repsComplete, repsIncomplete, notSupplied, notApplicable, observation, missingValues };
}

// ---- Section validation ----

function isSectionValid(section: { status: string; [key: string]: any }): boolean {
  if (section.status === "not_supplied" || section.status === "not_applicable" || section.status === "observation") return true;
  if (section.status !== "supplied") return false;
  const numericFields = Object.keys(section).filter(k => k !== "status");
  return numericFields.every(f => section[f] != null && section[f] >= 0 && Number.isInteger(section[f]));
}

export const drapsCalc = {
  drapsTotals,
  firstConsultTotals,
  financeRunTotals,
  drapsPresentationRate,
  drapsCloseRate,
  fcPresentationRate,
  fcCloseRate,
  frPresentationRate,
  frCloseRate,
  computeSummary,
  isSectionValid,
  safeRate,
  safeSum,
};

export function formatDateAU(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function todayAU(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
