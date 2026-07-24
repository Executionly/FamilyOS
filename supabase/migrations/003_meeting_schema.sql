-- Meeting table
CREATE TABLE IF NOT EXISTS public.meeting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.family(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on meeting table
ALTER TABLE public.meeting ENABLE ROW LEVEL SECURITY;

-- Meeting RLS policies
CREATE POLICY "Users can view meetings for their family"
  ON public.meeting FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create meetings for their family"
  ON public.meeting FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update meetings for their family"
  ON public.meeting FOR UPDATE
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

CREATE POLICY "Users can delete meetings for their family"
  ON public.meeting FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM public.family
      WHERE created_by = auth.uid()
    )
  );

-- Meeting Agenda table
CREATE TABLE IF NOT EXISTS public.meeting_agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meeting(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on meeting_agenda table
ALTER TABLE public.meeting_agenda ENABLE ROW LEVEL SECURITY;

-- Meeting Agenda RLS policies
CREATE POLICY "Users can view agenda for their meetings"
  ON public.meeting_agenda FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meeting
      WHERE family_id IN (
        SELECT id FROM public.family
        WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create agenda for their meetings"
  ON public.meeting_agenda FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meeting
      WHERE family_id IN (
        SELECT id FROM public.family
        WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update agenda for their meetings"
  ON public.meeting_agenda FOR UPDATE
  USING (
    meeting_id IN (
      SELECT id FROM public.meeting
      WHERE family_id IN (
        SELECT id FROM public.family
        WHERE created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meeting
      WHERE family_id IN (
        SELECT id FROM public.family
        WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete agenda for their meetings"
  ON public.meeting_agenda FOR DELETE
  USING (
    meeting_id IN (
      SELECT id FROM public.meeting
      WHERE family_id IN (
        SELECT id FROM public.family
        WHERE created_by = auth.uid()
      )
    )
  );

-- Meeting Summary table
CREATE TABLE IF NOT EXISTS public.meeting_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL UNIQUE REFERENCES public.meeting(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  key_decisions TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on meeting_summary table
ALTER TABLE public.meeting_summary ENABLE ROW LEVEL SECURITY;

-- Meeting Summary RLS policies
CREATE POLICY "Users can view summaries for their meetings"
  ON public.meeting_summary FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meeting
      WHERE family_id IN (
        SELECT id FROM public.family
        WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create summaries for their meetings"
  ON public.meeting_summary FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meeting
      WHERE family_id IN (
        SELECT id FROM public.family
        WHERE created_by = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_family_id ON public.meeting(family_id);
CREATE INDEX IF NOT EXISTS idx_meeting_scheduled_date ON public.meeting(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_meeting_agenda_meeting_id ON public.meeting_agenda(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_summary_meeting_id ON public.meeting_summary(meeting_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_meeting_updated_at BEFORE UPDATE ON public.meeting
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_agenda_updated_at BEFORE UPDATE ON public.meeting_agenda
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
