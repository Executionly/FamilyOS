-- Charter table for storing family charters (Mission, Vision, Values, Constitution)
CREATE TABLE IF NOT EXISTS charter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  mission TEXT NOT NULL DEFAULT '',
  vision TEXT NOT NULL DEFAULT '',
  values TEXT[] NOT NULL DEFAULT '{}',
  constitution TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id)
);

-- Enable RLS on charter table
ALTER TABLE charter ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own family's charter
CREATE POLICY "Users can read their family's charter"
  ON charter
  FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM family
      WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can only insert charter for their own family
CREATE POLICY "Users can insert charter for their family"
  ON charter
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM family
      WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can only update their own family's charter
CREATE POLICY "Users can update their family's charter"
  ON charter
  FOR UPDATE
  USING (
    family_id IN (
      SELECT id FROM family
      WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT id FROM family
      WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can only delete their own family's charter
CREATE POLICY "Users can delete their family's charter"
  ON charter
  FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM family
      WHERE created_by = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_charter_family_id ON charter(family_id);
