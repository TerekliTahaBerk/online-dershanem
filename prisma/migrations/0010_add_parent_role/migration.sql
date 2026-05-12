-- Add PARENT to UserRole enum.
-- Kept in its own migration because PostgreSQL forbids ALTER TYPE ... ADD VALUE
-- to be used in the same transaction as the new value. Subsequent migrations
-- (0011_panel_foundation) reference 'PARENT' safely.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARENT';
