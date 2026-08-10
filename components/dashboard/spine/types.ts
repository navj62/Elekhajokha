// Shapes returned by /api/dashboard/aging-analysis, as the spine consumes them.
// Structurally a superset of AgingAnalysisCard's AgingBucket, so the existing
// table below the spine keeps rendering from the same payload.

import type { RiskTier } from "./tier";

export interface SpinePledge {
  id: string;
  customerId: string;
  customerName: string;
  ageDays: number;
  principal: number;
  owed: number;
  ltv: number | null;
  riskTier: RiskTier | null;
}

export interface SpineBucket {
  label: string;
  ageRange: string;
  count: number;
  principal: number;
  owed: number;
  avgLtv: number | null;
  underwaterCount: number;
  pctOfPrincipal: number;
  pctOfOwed: number;
  pledges: SpinePledge[];
  pledgesTruncated: boolean;
}

export interface SpineData {
  totalActivePledges: number;
  totalPrincipal: number;
  totalOwed: number;
  buckets: SpineBucket[];
  insights: {
    oldestBucketPrincipalShare: number;
    oldestBucketOwedShare: number;
    capitalStuck: number;
    capitalStuckShare: number;
  };
}
