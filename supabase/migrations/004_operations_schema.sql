-- Commitment table
CREATE TABLE IF NOT EXISTS public.commitment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.family(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on commitment table
ALTER TABLE public.commitment ENABLE ROW LEVEL SECURITY;

-- Commitment RLS policies
CREATE POLICY "Users can view commitments for their family"
  ON public.commitment FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create commitments for their family"
  ON public.commitment FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update commitments for their family"
  ON public.commitment FOR UPDATE
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

CREATE POLICY "Users can delete commitments for their family"
  ON public.commitment FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

-- Calendar Event table
CREATE TABLE IF NOT EXISTS public.calendar_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.family(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  color TEXT DEFAULT '#0a7ea4',
  recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on calendar_event table
ALTER TABLE public.calendar_event ENABLE ROW LEVEL SECURITY;

-- Calendar Event RLS policies
CREATE POLICY "Users can view events for their family"
  ON public.calendar_event FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create events for their family"
  ON public.calendar_event FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update events for their family"
  ON public.calendar_event FOR UPDATE
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

CREATE POLICY "Users can delete events for their family"
  ON public.calendar_event FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

-- Chore table
CREATE TABLE IF NOT EXISTS public.chore (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.family(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly')),
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on chore table
ALTER TABLE public.chore ENABLE ROW LEVEL SECURITY;

-- Chore RLS policies
CREATE POLICY "Users can view chores for their family"
  ON public.chore FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create chores for their family"
  ON public.chore FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update chores for their family"
  ON public.chore FOR UPDATE
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

CREATE POLICY "Users can delete chores for their family"
  ON public.chore FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commitment_family_id ON public.commitment(family_id);
CREATE INDEX IF NOT EXISTS idx_commitment_due_date ON public.commitment(due_date);
CREATE INDEX IF NOT EXISTS idx_commitment_status ON public.commitment(status);
CREATE INDEX IF NOT EXISTS idx_calendar_event_family_id ON public.calendar_event(family_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_start_date ON public.calendar_event(start_date);
CREATE INDEX IF NOT EXISTS idx_chore_family_id ON public.chore(family_id);
CREATE INDEX IF NOT EXISTS idx_chore_due_date ON public.chore(due_date);
CREATE INDEX IF NOT EXISTS idx_chore_status ON public.chore(status);

-- Triggers to update updated_at timestamp
CREATE TRIGGER update_commitment_updated_at BEFORE UPDATE ON public.commitment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_event_updated_at BEFORE UPDATE ON public.calendar_event
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chore_updated_at BEFORE UPDATE ON public.chore
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
