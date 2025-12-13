-- ============================================================================
-- Create Payments Table for PayFast Integration
--
-- This table stores payment transactions for bookings and other services.
-- It tracks PayFast payment IDs, status, and transaction details.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Create PaymentStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PaymentProvider enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "PaymentProvider" AS ENUM ('payfast', 'stripe');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    "clubId" UUID NOT NULL REFERENCES "Clubs"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "bookingId" UUID REFERENCES "Bookings"("id") ON DELETE SET NULL, -- Optional: link to booking
    
    -- Payment details
    "amount" DECIMAL(10, 2) NOT NULL, -- Amount in ZAR (or club's currency)
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'payfast',
    
    -- PayFast specific fields
    "payfastPaymentId" TEXT, -- PayFast payment ID (pf_payment_id)
    "payfastMerchantId" TEXT, -- PayFast merchant ID
    "payfastSignature" TEXT, -- PayFast signature for verification
    
    -- Transaction details
    "itemName" TEXT NOT NULL, -- Description of what's being paid for (e.g., "Court Booking - Court 1")
    "itemDescription" TEXT, -- Additional description
    "returnUrl" TEXT, -- URL to redirect after payment
    "cancelUrl" TEXT, -- URL to redirect if payment cancelled
    "notifyUrl" TEXT, -- Webhook URL for PayFast notifications
    
    -- PayFast response data (stored as JSONB for flexibility)
    "payfastResponse" JSONB, -- Full PayFast response data
    
    -- Payment metadata
    "payerEmail" TEXT,
    "payerName" TEXT,
    "payerPhone" TEXT,
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3), -- When payment was completed
    "failedAt" TIMESTAMP(3), -- When payment failed
    
    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Payments_clubId_idx" ON "Payments"("clubId");
CREATE INDEX IF NOT EXISTS "Payments_userId_idx" ON "Payments"("userId");
CREATE INDEX IF NOT EXISTS "Payments_bookingId_idx" ON "Payments"("bookingId");
CREATE INDEX IF NOT EXISTS "Payments_status_idx" ON "Payments"("status");
CREATE INDEX IF NOT EXISTS "Payments_payfastPaymentId_idx" ON "Payments"("payfastPaymentId");
CREATE INDEX IF NOT EXISTS "Payments_createdAt_idx" ON "Payments"("createdAt");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS "update_payments_updated_at" ON "Payments";
CREATE TRIGGER "update_payments_updated_at"
    BEFORE UPDATE ON "Payments"
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Enable Row Level Security
ALTER TABLE "Payments" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payments" ON "Payments";
DROP POLICY IF EXISTS "Users can create their own payments" ON "Payments";
DROP POLICY IF EXISTS "Club admins can view all club payments" ON "Payments";
DROP POLICY IF EXISTS "Club admins can manage all club payments" ON "Payments";

-- Create RLS Policies
-- Users can view their own payments
CREATE POLICY "Users can view their own payments" ON "Payments"
    FOR SELECT
    TO authenticated
    USING ("userId" = auth.uid()::text);

-- Users can create their own payments
CREATE POLICY "Users can create their own payments" ON "Payments"
    FOR INSERT
    TO authenticated
    WITH CHECK ("userId" = auth.uid()::text);

-- Club admins can view all club payments
CREATE POLICY "Club admins can view all club payments" ON "Payments"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "UserClubRoles"
            WHERE "UserClubRoles"."userId" = auth.uid()::text
            AND "UserClubRoles"."clubId" = "Payments"."clubId"
            AND "UserClubRoles"."role" = 'CLUB_ADMIN'
        )
    );

-- Club admins can manage all club payments (for refunds, etc.)
CREATE POLICY "Club admins can manage all club payments" ON "Payments"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "UserClubRoles"
            WHERE "UserClubRoles"."userId" = auth.uid()::text
            AND "UserClubRoles"."clubId" = "Payments"."clubId"
            AND "UserClubRoles"."role" = 'CLUB_ADMIN'
        )
    );

COMMIT;



