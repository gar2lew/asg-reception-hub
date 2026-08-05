import { describe, it, expect } from "vitest";
import { drapsCalc } from "../services/drapsCalculations";
import { emptyDrapsSection, emptyFirstConsultSection, emptyFinanceRunSection } from "../models/draps";
import type { DrapsResultSection, FirstConsultResultSection, FinanceRunResultSection } from "../models/draps";

function d(overrides: Partial<DrapsResultSection>): DrapsResultSection {
  return { ...emptyDrapsSection(), ...overrides };
}
function fc(overrides: Partial<FirstConsultResultSection>): FirstConsultResultSection {
  return { ...emptyFirstConsultSection(), ...overrides };
}
function fr(overrides: Partial<FinanceRunResultSection>): FinanceRunResultSection {
  return { ...emptyFinanceRunSection(), ...overrides };
}

describe("drapsCalc", () => {
  describe("safeRate", () => {
    it("returns null value for missing numerator", () => {
      expect(drapsCalc.safeRate(null, 10).value).toBeNull();
    });
    it("returns null value for missing denominator", () => {
      expect(drapsCalc.safeRate(5, null).value).toBeNull();
    });
    it("returns null value for all excluded (zero with no hasData)", () => {
      expect(drapsCalc.safeRate(0, 0).value).toBeNull();
    });
    it("returns 0 value when hasData and zero denominator", () => {
      const r = drapsCalc.safeRate(0, 0, true);
      expect(r.value).toBe(0);
      expect(r.display).toBe("0%");
    });
    it("returns correct percentage", () => {
      expect(drapsCalc.safeRate(5, 10).display).toBe("50%");
    });
  });

  describe("totals", () => {
    it("sums supplied sections", () => {
      const s = [d({ doorQuestionnaires: 5, appointments: 3 }), d({ referrals: 2, presented: 1 })];
      const t = drapsCalc.drapsTotals(s);
      expect(t.doorQuestionnaires).toBe(5);
      expect(t.presented).toBe(1);
    });
    it("excludes not_supplied", () => {
      const s = [d({ doorQuestionnaires: 5 }), d({ status: "not_supplied", doorQuestionnaires: 99 })];
      expect(drapsCalc.drapsTotals(s).doorQuestionnaires).toBe(5);
    });
    it("includes observation", () => {
      const s = [d({ presented: 3 }), d({ status: "observation", presented: 4 })];
      expect(drapsCalc.drapsTotals(s).presented).toBe(7);
    });
  });

  describe("rates", () => {
    it("calculates presentation rate", () => {
      expect(drapsCalc.drapsPresentationRate([d({ appointments: 10, presented: 5 })]).display).toBe("50%");
    });
    it("returns null value when all excluded", () => {
      expect(drapsCalc.drapsPresentationRate([d({ status: "not_supplied" })]).value).toBeNull();
    });
    it("returns 0% when supplied denominator is zero", () => {
      // When a section is supplied with 0 appointments, the rate should be 0%
      const r = drapsCalc.drapsPresentationRate([d({ appointments: 0, presented: 0 })]);
      expect(r.value).toBe(0);
    });
  });

  describe("isSectionValid", () => {
    it("supplied with all fields is valid", () => {
      expect(drapsCalc.isSectionValid(d({ doorQuestionnaires: 1, referrals: 0, appointments: 0, presented: 0, sold: 0 }))).toBe(true);
    });
    it("supplied with missing field is invalid", () => {
      expect(drapsCalc.isSectionValid(d({ doorQuestionnaires: 1 }))).toBe(false);
    });
    it("not_supplied is valid", () => expect(drapsCalc.isSectionValid(d({ status: "not_supplied" }))).toBe(true));
    it("not_applicable is valid", () => expect(drapsCalc.isSectionValid(d({ status: "not_applicable" }))).toBe(true));
    it("observation is valid", () => expect(drapsCalc.isSectionValid(d({ status: "observation" }))).toBe(true));
  });

  describe("computeSummary", () => {
    it("counts complete reps (not_supplied and not_applicable are complete states)", () => {
      const r = {
        draps: d({ doorQuestionnaires: 1, referrals: 0, appointments: 0, presented: 0, sold: 0 }),
        firstConsult: fc({ status: "not_supplied" }),
        financeRun: fr({ status: "not_applicable" }),
      };
      const s = drapsCalc.computeSummary([r]);
      expect(s.repsComplete).toBe(1);
    });
    it("counts incomplete with missing data", () => {
      const r = {
        draps: d({ doorQuestionnaires: 1 }),
        firstConsult: fc({ status: "not_supplied" }),
        financeRun: fr({ status: "not_applicable" }),
      };
      const s = drapsCalc.computeSummary([r]);
      expect(s.repsIncomplete).toBe(1);
    });
  });
});
