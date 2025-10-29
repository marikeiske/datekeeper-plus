-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can insert holidays" ON holidays;
DROP POLICY IF EXISTS "Only admins can update holidays" ON holidays;

-- Allow authenticated users to insert holidays
CREATE POLICY "Authenticated users can insert holidays"
ON holidays
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update holidays
CREATE POLICY "Authenticated users can update holidays"
ON holidays
FOR UPDATE
TO authenticated
USING (true);