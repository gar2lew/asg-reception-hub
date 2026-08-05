// DRAPS Daily Report and Results model

export type DailyReportStatus = 'draft' | 'complete';
export type ResultSectionStatus = 'supplied' | 'not_supplied' | 'not_applicable' | 'observation';

export interface DailyDrapsReport {
  id: string;
  reportDate: string;  // YYYY-MM-DD
  office: 'brisbane' | 'perth' | 'all';
  status: DailyReportStatus;
  notes?: string;
  createdAt: string;
  createdByUid: string;
  createdByName: string;
  updatedAt: string;
  updatedByUid: string;
  updatedByName: string;
  completedAt?: string;
  completedByUid?: string;
  completedByName?: string;
  reopenedAt?: string;
  reopenedByUid?: string;
  reopenedByName?: string;
}

export interface DrapsResultSection {
  status: ResultSectionStatus;
  doorQuestionnaires: number | null;
  referrals: number | null;
  appointments: number | null;
  presented: number | null;
  sold: number | null;
}

export interface FirstConsultResultSection {
  status: ResultSectionStatus;
  bookedAppointments: number | null;
  presented: number | null;
  sold: number | null;
}

export interface FinanceRunResultSection {
  status: ResultSectionStatus;
  bookedAppointments: number | null;
  presented: number | null;
  sold: number | null;
}

export interface DailyRepResult {
  id: string;
  reportId: string;
  reportDate: string;
  representativeId: string;
  representativeNameSnapshot: string;
  officeSnapshot: 'brisbane' | 'perth' | 'all';
  draps: DrapsResultSection;
  firstConsult: FirstConsultResultSection;
  financeRun: FinanceRunResultSection;
  notes?: string;
  updatedAt: string;
  updatedByUid: string;
  updatedByName: string;
}

export function emptyDrapsSection(): DrapsResultSection {
  return { status: 'supplied', doorQuestionnaires: null, referrals: null, appointments: null, presented: null, sold: null };
}

export function emptyFirstConsultSection(): FirstConsultResultSection {
  return { status: 'supplied', bookedAppointments: null, presented: null, sold: null };
}

export function emptyFinanceRunSection(): FinanceRunResultSection {
  return { status: 'supplied', bookedAppointments: null, presented: null, sold: null };
}

export function emptyRepResult(
  reportId: string, reportDate: string,
  rep: { id: string; name: string; office: string },
): DailyRepResult {
  return {
    id: crypto.randomUUID(),
    reportId, reportDate,
    representativeId: rep.id,
    representativeNameSnapshot: rep.name,
    officeSnapshot: rep.office as DailyRepResult['officeSnapshot'],
    draps: emptyDrapsSection(),
    firstConsult: emptyFirstConsultSection(),
    financeRun: emptyFinanceRunSection(),
    updatedAt: new Date().toISOString(),
    updatedByUid: '', updatedByName: '',
  };
}
