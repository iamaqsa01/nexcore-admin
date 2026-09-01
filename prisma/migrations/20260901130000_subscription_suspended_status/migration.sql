-- Phase 5 — AI Receptionist module.
-- Additive enum-only change. Existing rows are untouched.

-- AlterEnum
-- Per-client "service off" switch for a product module (AI Receptionist).
-- Kept separate from Client.status so a product can be suspended without
-- affecting the core tenant record or other products.
ALTER TYPE "SubscriptionStatus" ADD VALUE 'SUSPENDED';
