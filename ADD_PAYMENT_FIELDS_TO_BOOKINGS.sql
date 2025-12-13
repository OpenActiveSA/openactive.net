-- ============================================================================
-- Add Payment Fields to Bookings Table
--
-- This script adds payment-related fields to the Bookings table to track
-- payment status and link bookings to payment transactions.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Add paymentId column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Bookings'
        AND column_name = 'paymentId'
    ) THEN
        ALTER TABLE "Bookings"
        ADD COLUMN "paymentId" UUID REFERENCES "Payments"("id") ON DELETE SET NULL;

        RAISE NOTICE 'Added "paymentId" column to "Bookings" table';
    ELSE
        RAISE NOTICE '"paymentId" column already exists in "Bookings" table';
    END IF;
END
$$;

-- Add amount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Bookings'
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE "Bookings"
        ADD COLUMN "amount" DECIMAL(10, 2);

        RAISE NOTICE 'Added "amount" column to "Bookings" table';
    ELSE
        RAISE NOTICE '"amount" column already exists in "Bookings" table';
    END IF;
END
$$;

-- Add paymentStatus column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Bookings'
        AND column_name = 'paymentStatus'
    ) THEN
        ALTER TABLE "Bookings"
        ADD COLUMN "paymentStatus" TEXT DEFAULT 'pending'; -- 'pending', 'paid', 'failed', 'refunded'

        RAISE NOTICE 'Added "paymentStatus" column to "Bookings" table';
    ELSE
        RAISE NOTICE '"paymentStatus" column already exists in "Bookings" table';
    END IF;
END
$$;

-- Create index on paymentId for faster lookups
CREATE INDEX IF NOT EXISTS "Bookings_paymentId_idx" ON "Bookings"("paymentId");
CREATE INDEX IF NOT EXISTS "Bookings_paymentStatus_idx" ON "Bookings"("paymentStatus");

COMMIT;



