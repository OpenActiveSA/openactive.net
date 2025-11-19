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

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_magicLinkToken_key" ON "User"("magicLinkToken");

-- CreateIndex
CREATE INDEX "User_clubId_idx" ON "User"("clubId");

-- Enable Row Level Security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Allow users to read their own data
CREATE POLICY "Users can view their own data" ON "User"
    FOR SELECT
    USING (auth.uid()::text = id);

-- Allow service role to bypass RLS (for API routes)
-- Note: Service role key already bypasses RLS, but this is explicit
-- For now, we'll allow authenticated users to read all users (adjust based on your needs)
CREATE POLICY "Authenticated users can view all users" ON "User"
    FOR SELECT
    TO authenticated
    USING (true);






