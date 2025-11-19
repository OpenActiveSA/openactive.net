-- Allow public (anon) users to read User table
-- This is needed for the simple demo app to work without authentication
CREATE POLICY "Public can view users" ON "User"
    FOR SELECT
    TO anon
    USING (true);



