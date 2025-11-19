-- Seed data for local development
-- This file is automatically run when you reset the database

-- Insert demo user
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




