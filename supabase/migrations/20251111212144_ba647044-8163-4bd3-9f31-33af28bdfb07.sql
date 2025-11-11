-- Create enum for recurrence frequency
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- Create recurrence rules table
CREATE TABLE public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  frequency recurrence_frequency NOT NULL,
  interval INTEGER NOT NULL DEFAULT 1,
  end_date TIMESTAMPTZ,
  occurrences INTEGER,
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, ..., 6=Saturday (for weekly)
  day_of_month INTEGER, -- for monthly
  month_of_year INTEGER, -- for yearly
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_interval CHECK (interval > 0),
  CONSTRAINT valid_days_of_week CHECK (
    days_of_week IS NULL OR 
    (array_length(days_of_week, 1) > 0 AND 
     days_of_week <@ ARRAY[0,1,2,3,4,5,6])
  ),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  CONSTRAINT valid_month_of_year CHECK (month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12))
);

-- Enable RLS
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurrence_rules
CREATE POLICY "Users can view their own recurrence rules"
ON public.recurrence_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = recurrence_rules.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create recurrence rules for their events"
ON public.recurrence_rules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = recurrence_rules.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own recurrence rules"
ON public.recurrence_rules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = recurrence_rules.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own recurrence rules"
ON public.recurrence_rules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = recurrence_rules.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Add is_recurring flag to events table
ALTER TABLE public.events
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false;

-- Create function to generate recurring event instances
CREATE OR REPLACE FUNCTION public.get_recurring_events(
  start_range TIMESTAMPTZ,
  end_range TIMESTAMPTZ,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  color TEXT,
  is_all_day BOOLEAN,
  is_recurring BOOLEAN,
  parent_event_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE recurring_dates AS (
    -- Base case: get recurring events with their rules
    SELECT 
      e.id as parent_id,
      e.title,
      e.description,
      e.start_date,
      e.end_date,
      e.color,
      e.is_all_day,
      e.is_recurring,
      rr.frequency,
      rr.interval,
      rr.end_date as rule_end_date,
      rr.occurrences,
      rr.days_of_week,
      0 as occurrence_count,
      e.start_date as current_start,
      e.end_date as current_end
    FROM events e
    INNER JOIN recurrence_rules rr ON e.id = rr.event_id
    WHERE e.user_id = p_user_id
      AND e.is_recurring = true
      AND e.start_date <= end_range
      AND (rr.end_date IS NULL OR rr.end_date >= start_range)
    
    UNION ALL
    
    -- Recursive case: generate next occurrence
    SELECT
      rd.parent_id,
      rd.title,
      rd.description,
      rd.start_date,
      rd.end_date,
      rd.color,
      rd.is_all_day,
      rd.is_recurring,
      rd.frequency,
      rd.interval,
      rd.rule_end_date,
      rd.occurrences,
      rd.days_of_week,
      rd.occurrence_count + 1,
      CASE rd.frequency
        WHEN 'daily' THEN rd.current_start + (rd.interval || ' days')::INTERVAL
        WHEN 'weekly' THEN rd.current_start + (rd.interval * 7 || ' days')::INTERVAL
        WHEN 'monthly' THEN rd.current_start + (rd.interval || ' months')::INTERVAL
        WHEN 'yearly' THEN rd.current_start + (rd.interval || ' years')::INTERVAL
      END,
      CASE rd.frequency
        WHEN 'daily' THEN rd.current_end + (rd.interval || ' days')::INTERVAL
        WHEN 'weekly' THEN rd.current_end + (rd.interval * 7 || ' days')::INTERVAL
        WHEN 'monthly' THEN rd.current_end + (rd.interval || ' months')::INTERVAL
        WHEN 'yearly' THEN rd.current_end + (rd.interval || ' years')::INTERVAL
      END
    FROM recurring_dates rd
    WHERE 
      -- Stop conditions
      (rd.occurrences IS NULL OR rd.occurrence_count < rd.occurrences)
      AND (rd.rule_end_date IS NULL OR 
           CASE rd.frequency
             WHEN 'daily' THEN rd.current_start + (rd.interval || ' days')::INTERVAL
             WHEN 'weekly' THEN rd.current_start + (rd.interval * 7 || ' days')::INTERVAL
             WHEN 'monthly' THEN rd.current_start + (rd.interval || ' months')::INTERVAL
             WHEN 'yearly' THEN rd.current_start + (rd.interval || ' years')::INTERVAL
           END <= rd.rule_end_date)
      AND CASE rd.frequency
            WHEN 'daily' THEN rd.current_start + (rd.interval || ' days')::INTERVAL
            WHEN 'weekly' THEN rd.current_start + (rd.interval * 7 || ' days')::INTERVAL
            WHEN 'monthly' THEN rd.current_start + (rd.interval || ' months')::INTERVAL
            WHEN 'yearly' THEN rd.current_start + (rd.interval || ' years')::INTERVAL
          END <= end_range
      AND rd.occurrence_count < 100 -- Safety limit
  )
  SELECT 
    rd.parent_id as id,
    rd.title,
    rd.description,
    rd.current_start as start_date,
    rd.current_end as end_date,
    rd.color,
    rd.is_all_day,
    rd.is_recurring,
    rd.parent_id as parent_event_id
  FROM recurring_dates rd
  WHERE rd.current_start >= start_range
    AND rd.current_start <= end_range
  ORDER BY rd.current_start;
END;
$$;