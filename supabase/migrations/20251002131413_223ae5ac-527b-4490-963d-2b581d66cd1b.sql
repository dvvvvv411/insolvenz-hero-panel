-- Enable team-wide access for all tables
-- Drop old user-specific policies and create new team-wide policies

-- Table: interessenten
DROP POLICY IF EXISTS "Users can view their own interessenten" ON interessenten;
DROP POLICY IF EXISTS "Users can create their own interessenten" ON interessenten;
DROP POLICY IF EXISTS "Users can update their own interessenten" ON interessenten;
DROP POLICY IF EXISTS "Users can delete their own interessenten" ON interessenten;

CREATE POLICY "Team can view all interessenten"
ON interessenten FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create interessenten"
ON interessenten FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update all interessenten"
ON interessenten FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Team can delete all interessenten"
ON interessenten FOR DELETE
TO authenticated
USING (true);

-- Table: interessenten_aktivitaeten
DROP POLICY IF EXISTS "Users can view their own aktivitaeten" ON interessenten_aktivitaeten;
DROP POLICY IF EXISTS "Users can create their own aktivitaeten" ON interessenten_aktivitaeten;
DROP POLICY IF EXISTS "Users can delete their own aktivitaeten" ON interessenten_aktivitaeten;

CREATE POLICY "Team can view all aktivitaeten"
ON interessenten_aktivitaeten FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create aktivitaeten"
ON interessenten_aktivitaeten FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can delete all aktivitaeten"
ON interessenten_aktivitaeten FOR DELETE
TO authenticated
USING (true);

-- Table: interessenten_calls
DROP POLICY IF EXISTS "Users can view their own calls" ON interessenten_calls;
DROP POLICY IF EXISTS "Users can create their own calls" ON interessenten_calls;
DROP POLICY IF EXISTS "Users can update their own calls" ON interessenten_calls;
DROP POLICY IF EXISTS "Users can delete their own calls" ON interessenten_calls;

CREATE POLICY "Team can view all calls"
ON interessenten_calls FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create calls"
ON interessenten_calls FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update all calls"
ON interessenten_calls FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Team can delete all calls"
ON interessenten_calls FOR DELETE
TO authenticated
USING (true);

-- Table: interessenten_email_verlauf
DROP POLICY IF EXISTS "Users can view their own email verlauf" ON interessenten_email_verlauf;
DROP POLICY IF EXISTS "Users can create their own email verlauf" ON interessenten_email_verlauf;
DROP POLICY IF EXISTS "Users can delete their own email verlauf" ON interessenten_email_verlauf;

CREATE POLICY "Team can view all email verlauf"
ON interessenten_email_verlauf FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create email verlauf"
ON interessenten_email_verlauf FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can delete all email verlauf"
ON interessenten_email_verlauf FOR DELETE
TO authenticated
USING (true);

-- Table: interessenten_notizen
DROP POLICY IF EXISTS "Users can view their own notizen" ON interessenten_notizen;
DROP POLICY IF EXISTS "Users can create their own notizen" ON interessenten_notizen;
DROP POLICY IF EXISTS "Users can update their own notizen" ON interessenten_notizen;
DROP POLICY IF EXISTS "Users can delete their own notizen" ON interessenten_notizen;

CREATE POLICY "Team can view all notizen"
ON interessenten_notizen FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create notizen"
ON interessenten_notizen FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update all notizen"
ON interessenten_notizen FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Team can delete all notizen"
ON interessenten_notizen FOR DELETE
TO authenticated
USING (true);

-- Table: nischen
DROP POLICY IF EXISTS "Users can view their own nischen" ON nischen;
DROP POLICY IF EXISTS "Users can create their own nischen" ON nischen;
DROP POLICY IF EXISTS "Users can update their own nischen" ON nischen;
DROP POLICY IF EXISTS "Users can delete their own nischen" ON nischen;

CREATE POLICY "Team can view all nischen"
ON nischen FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create nischen"
ON nischen FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update all nischen"
ON nischen FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Team can delete all nischen"
ON nischen FOR DELETE
TO authenticated
USING (true);

-- Table: user_status_settings
DROP POLICY IF EXISTS "Users can view their own status settings" ON user_status_settings;
DROP POLICY IF EXISTS "Users can create their own status settings" ON user_status_settings;
DROP POLICY IF EXISTS "Users can update their own status settings" ON user_status_settings;
DROP POLICY IF EXISTS "Users can delete their own status settings" ON user_status_settings;

CREATE POLICY "Team can view all status settings"
ON user_status_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create status settings"
ON user_status_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update all status settings"
ON user_status_settings FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Team can delete all status settings"
ON user_status_settings FOR DELETE
TO authenticated
USING (true);

-- Table: user_status_colors
DROP POLICY IF EXISTS "Users can view their own status colors" ON user_status_colors;
DROP POLICY IF EXISTS "Users can create their own status colors" ON user_status_colors;
DROP POLICY IF EXISTS "Users can update their own status colors" ON user_status_colors;
DROP POLICY IF EXISTS "Users can delete their own status colors" ON user_status_colors;

CREATE POLICY "Team can view all status colors"
ON user_status_colors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team can create status colors"
ON user_status_colors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update all status colors"
ON user_status_colors FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Team can delete all status colors"
ON user_status_colors FOR DELETE
TO authenticated
USING (true);