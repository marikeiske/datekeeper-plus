-- Add notification_sent column to track sent reminders
ALTER TABLE public.reminders
ADD COLUMN notification_sent BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient querying of pending notifications
CREATE INDEX idx_reminders_notification_sent ON public.reminders(notification_sent);

-- Create function to get pending reminders
CREATE OR REPLACE FUNCTION public.get_pending_reminders()
RETURNS TABLE (
  reminder_id uuid,
  event_id uuid,
  event_title text,
  event_start_date timestamptz,
  event_description text,
  user_email text,
  minutes_before integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as reminder_id,
    e.id as event_id,
    e.title as event_title,
    e.start_date as event_start_date,
    e.description as event_description,
    p.email as user_email,
    r.minutes_before
  FROM reminders r
  INNER JOIN events e ON r.event_id = e.id
  INNER JOIN profiles p ON e.user_id = p.id
  WHERE r.notification_sent = false
    AND e.start_date - (r.minutes_before * INTERVAL '1 minute') <= NOW()
    AND e.start_date > NOW();
END;
$$;