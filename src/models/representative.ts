// Representative model for DRAPS reporting

export interface Representative {
  id: string;
  name: string;
  office: 'brisbane' | 'perth' | 'all';
  active: boolean;
  includeDraps: boolean;
  includeFirstConsult: boolean;
  includeFinanceRun: boolean;
  displayOrder: number;
  notes?: string;
  createdAt: string;
  createdByUid: string;
  createdByName: string;
  updatedAt: string;
  updatedByUid: string;
  updatedByName: string;
  archivedAt?: string;
  archivedByUid?: string;
}

export interface RepresentativeCreate {
  name: string;
  office: 'brisbane' | 'perth' | 'all';
  includeDraps: boolean;
  includeFirstConsult: boolean;
  includeFinanceRun: boolean;
  displayOrder?: number;
  notes?: string;
}
