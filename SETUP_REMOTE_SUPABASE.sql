-- Run these SQL commands in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query

-- ============================================================================
-- Migration 1: Create User Table
-- ============================================================================

-- CreateEnum: Role
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CLUB_ADMIN', 'MEMBER');

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "magicLinkToken" TEXT,
    "clubId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_magicLinkToken_key" ON "User"("magicLinkToken");
CREATE INDEX "User_clubId_idx" ON "User"("clubId");

-- Enable Row Level Security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own data" ON "User"
    FOR SELECT
    USING (auth.uid()::text = id);

CREATE POLICY "Authenticated users can view all users" ON "User"
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- Migration 2: Allow Public Read (for demo app)
-- ============================================================================

CREATE POLICY "Public can view users" ON "User"
    FOR SELECT
    TO anon
    USING (true);

-- ============================================================================
-- Seed Data: Insert Demo User
-- ============================================================================

INSERT INTO "User" (
    "id",
    "email",
    "displayName",
    "username",
    "role",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'demo@openactive.local',
    'OpenActive Demo',
    'demo.user',
    'SUPER_ADMIN',
    true,
    NOW(),
    NOW()
)
ON CONFLICT ("email") DO UPDATE
SET
    "displayName" = EXCLUDED."displayName",
    "username" = EXCLUDED."username",
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = NOW();

