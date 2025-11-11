import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Edit, Trash2, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: string;
  is_all_day: boolean;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface EventListProps {
  events: Event[];
  holidays: Holiday[];
  selectedDate: Date;
  onDeleteEvent: (eventId: string) => void;
}

export const EventList = ({ events, holidays, selectedDate, onDeleteEvent }: EventListProps) => {
  const navigate = useNavigate();
  const [eventReminders, setEventReminders] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchReminders();
  }, [events]);

  const fetchReminders = async () => {
    if (events.length === 0) return;

    const eventIds = events.map(e => e.id);
    const { data, error } = await supabase
      .from("reminders")
      .select("event_id, minutes_before")
      .in("event_id", eventIds);

    if (!error && data) {
      const remindersMap: Record<string, number> = {};
      data.forEach(r => {
        remindersMap[r.event_id] = r.minutes_before;
      });
      setEventReminders(remindersMap);
    }
  };

  const formatReminderTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) return `${minutes / 60}h`;
    if (minutes < 10080) return `${minutes / 1440}d`;
    return `${minutes / 10080}sem`;
  };

  if (events.length === 0 && holidays.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum evento ou feriado neste dia</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
      </h3>
      
      {/* Holidays */}
      {holidays.map((holiday) => (
        <Card key={holiday.id} className="overflow-hidden border-destructive/30">
          <div className="h-1 bg-destructive" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-start gap-2">
              <span className="text-xl">🎉</span>
              <span className="text-destructive">{holiday.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Feriado Nacional</p>
          </CardContent>
        </Card>
      ))}

      {/* Events */}
      {events.map((event) => (
        <Card key={event.id} className="overflow-hidden">
          <div 
            className="h-1" 
            style={{ backgroundColor: event.color }}
          />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-start justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span>{event.title}</span>
                {eventReminders[event.id] && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    {formatReminderTime(eventReminders[event.id])}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDeleteEvent(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {event.is_all_day ? (
                <span>Dia inteiro</span>
              ) : (
                <span>
                  {format(new Date(event.start_date), "HH:mm")} - {format(new Date(event.end_date), "HH:mm")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
