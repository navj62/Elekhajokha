-- Bug fix: new users must NOT be born into the paid-pending `created` state
-- (with a null subscriptionCreatedAt), which /api/access treated as a fatal
-- invalid_state. A brand-new user has not subscribed, so the correct default
-- is `expired` (a no-access-but-valid state), matching the lazy-create paths.
ALTER TABLE "users" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'expired';
