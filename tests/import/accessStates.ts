// Shared user states for the import subscription tests. One table, used by
// both the rule tests and the parity test against the real access route.

import type { ImportAccessUser } from "../../lib/import/subscription";

export const NOW = new Date("2026-11-12T06:30:00.000Z");

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const ahead = (ms: number) => new Date(NOW.getTime() + ms);

const base: ImportAccessUser = {
  subscriptionStatus: "expired",
  subscriptionEndDate: null,
  subscriptionCreatedAt: null,
  lastGraceExpiredAt: null,
  isActive: true,
  deletedAt: null,
};

export type AccessCase = {
  name: string;
  user: ImportAccessUser;
  hasAccess: boolean;
  status: string;
};

export const ACCESS_CASES: AccessCase[] = [
  {
    name: "trial, end date ahead",
    user: { ...base, subscriptionStatus: "trial", subscriptionEndDate: ahead(3 * DAY) },
    hasAccess: true,
    status: "trial",
  },
  {
    name: "trial, no end date",
    user: { ...base, subscriptionStatus: "trial" },
    hasAccess: true,
    status: "trial",
  },
  {
    name: "trial, end date passed",
    user: { ...base, subscriptionStatus: "trial", subscriptionEndDate: ago(MIN) },
    hasAccess: false,
    status: "trial_expired",
  },
  {
    name: "active, end date ahead",
    user: { ...base, subscriptionStatus: "active", subscriptionEndDate: ahead(90 * DAY) },
    hasAccess: true,
    status: "active",
  },
  {
    name: "active, no end date",
    user: { ...base, subscriptionStatus: "active" },
    hasAccess: true,
    status: "active",
  },
  {
    name: "active, end date passed",
    user: { ...base, subscriptionStatus: "active", subscriptionEndDate: ago(MIN) },
    hasAccess: false,
    status: "expired",
  },
  {
    name: "active, stale grace mark",
    user: {
      ...base,
      subscriptionStatus: "active",
      subscriptionEndDate: ahead(DAY),
      lastGraceExpiredAt: ago(HOUR),
    },
    hasAccess: true,
    status: "active",
  },
  {
    name: "created, inside the 10-minute window",
    user: { ...base, subscriptionStatus: "created", subscriptionCreatedAt: ago(5 * MIN) },
    hasAccess: true,
    status: "processing",
  },
  {
    name: "created, inside the window, wasted window within 24h",
    user: {
      ...base,
      subscriptionStatus: "created",
      subscriptionCreatedAt: ago(5 * MIN),
      lastGraceExpiredAt: ago(2 * HOUR),
    },
    hasAccess: false,
    status: "payment_required",
  },
  {
    name: "created, inside the window, wasted window older than 24h",
    user: {
      ...base,
      subscriptionStatus: "created",
      subscriptionCreatedAt: ago(5 * MIN),
      lastGraceExpiredAt: ago(25 * HOUR),
    },
    hasAccess: true,
    status: "processing",
  },
  {
    name: "created, exactly at 10 minutes",
    user: { ...base, subscriptionStatus: "created", subscriptionCreatedAt: ago(10 * MIN) },
    hasAccess: false,
    status: "payment_timeout",
  },
  {
    name: "created, window passed",
    user: { ...base, subscriptionStatus: "created", subscriptionCreatedAt: ago(HOUR) },
    hasAccess: false,
    status: "payment_timeout",
  },
  {
    name: "created, no timestamp",
    user: { ...base, subscriptionStatus: "created" },
    hasAccess: false,
    status: "expired",
  },
  {
    name: "halted",
    user: { ...base, subscriptionStatus: "halted", subscriptionEndDate: ahead(DAY) },
    hasAccess: false,
    status: "inactive",
  },
  {
    name: "expired",
    user: { ...base, subscriptionStatus: "expired" },
    hasAccess: false,
    status: "inactive",
  },
  {
    name: "active but suspended",
    user: {
      ...base,
      subscriptionStatus: "active",
      subscriptionEndDate: ahead(DAY),
      isActive: false,
    },
    hasAccess: false,
    status: "account_suspended",
  },
  {
    name: "trial but soft-deleted",
    user: {
      ...base,
      subscriptionStatus: "trial",
      subscriptionEndDate: ahead(DAY),
      deletedAt: ago(DAY),
    },
    hasAccess: false,
    status: "account_suspended",
  },
];
