-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Family table
CREATE TABLE IF NOT EXISTS public.family (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  photo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on family table
ALTER TABLE public.family ENABLE ROW LEVEL SECURITY;

-- Family RLS policies
CREATE POLICY "Users can view their own family"
  ON public.family FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create families"
  ON public.family FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Family creators can update their family"
  ON public.family FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Member table
CREATE TABLE IF NOT EXISTS public.member (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.family(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coparent', 'member', 'child')) DEFAULT 'member',
  age_band TEXT CHECK (age_band IN ('toddler', 'child', 'preteen', 'teen', 'adult')),
  has_login BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on member table
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;

-- Member RLS policies (simplified to avoid infinite recursion)
CREATE POLICY "Users can view members of their family"
  ON public.member FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create members in their family"
  ON public.member FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update members in their family"
  ON public.member FOR UPDATE
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_family_created_by ON public.family(created_by);
CREATE INDEX idx_member_family_id ON public.member(family_id);
CREATE INDEX idx_member_user_id ON public.member(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_family_updated_at BEFORE UPDATE ON public.family
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_updated_at BEFORE UPDATE ON public.member
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
