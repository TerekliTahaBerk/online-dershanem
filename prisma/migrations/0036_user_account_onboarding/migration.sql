-- Phase 3 / Session 1 — User account onboarding state.
--
-- Mirrors the parent invite trio (Phase 1.5 / Session 13) onto the User
-- table so we can issue invites for STUDENT and TEACHER roles with the same
-- pattern, plus minimal first-login / disable bookkeeping.
--
-- All columns are additive and either nullable or boolean-default-false.
-- Zero data risk; safe to run on production.

ALTER TABLE "User"
  ADD COLUMN "userInviteToken"          TEXT,
  ADD COLUMN "userInviteTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "userInviteSentAt"         TIMESTAMP(3),
  ADD COLUMN "mustChangePassword"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordChangedAt"        TIMESTAMP(3),
  ADD COLUMN "lastLoginAt"              TIMESTAMP(3),
  ADD COLUMN "accountDisabledAt"        TIMESTAMP(3);

CREATE UNIQUE INDEX "User_userInviteToken_key" ON "User"("userInviteToken");
