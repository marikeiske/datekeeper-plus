import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, isToday, startOfDay, getHours, getMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Bell, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: string;
  is_all_day: boolean;
  is_recurring?: boolean;
}

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onDayClick: (date: Date) => void;
  eventReminders: Record<string, number>;
}

export const WeekView = ({ currentDate, events, onDayClick, eventReminders }: WeekViewProps) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Generate hours from 0 to 23
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Calculate current time position
  const now = new Date();
  const currentHour = getHours(now);
  const currentMinute = getMinutes(now);
  const currentTimePercent = ((currentHour * 60 + currentMinute) / (24 * 60)) * 100;
  const isCurrentWeek = weekDays.some(day => isSameDay(day, now));

  // Auto-scroll to current time on mount if it's the current week
  useEffect(() => {
    if (isCurrentWeek && scrollContainerRef.current) {
      const scrollPosition = (currentTimePercent / 100) * scrollContainerRef.current.scrollHeight - 100;
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [isCurrentWeek, currentTimePercent]);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), day)
    );
  };

  const getEventPosition = (event: Event) => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (event.is_all_day) {
      return { top: 0, height: 100, isAllDay: true };
    }

    const startHour = getHours(startDate);
    const startMinute = getMinutes(startDate);
    const endHour = getHours(endDate);
    const endMinute = getMinutes(endDate);

    const startPercent = ((startHour * 60 + startMinute) / (24 * 60)) * 100;
    const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    const heightPercent = (durationMinutes / (24 * 60)) * 100;

    return { 
      top: startPercent, 
      height: Math.max(heightPercent, 2), // Minimum 2% height
      isAllDay: false 
    };
  };

  const formatReminderTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) return `${minutes / 60}h`;
    return `${minutes / 1440}d`;
  };

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      {/* Week header with days */}
      <div className="grid grid-cols-8 gap-px bg-border border-b">
        <div className="bg-card p-2" /> {/* Empty cell for time column */}
        {weekDays.map((day) => {
          const isCurrentDay = isToday(day);
          return (
            <button
              key={day.toString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "bg-card p-2 text-center transition-colors hover:bg-accent/50",
                isCurrentDay && "bg-primary/10"
              )}
            >
              <div className="text-xs font-medium text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div
                className={cn(
                  "text-lg font-bold mt-1 w-8 h-8 mx-auto rounded-full flex items-center justify-center",
                  isCurrentDay && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Week grid with hours */}
      <div ref={scrollContainerRef} className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-8 gap-px bg-border relative">
          {/* Time column */}
          <div className="bg-card">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-16 px-2 py-1 text-xs text-muted-foreground text-right border-b border-border"
              >
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Days columns */}
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const allDayEvents = dayEvents.filter(e => e.is_all_day);
            const timedEvents = dayEvents.filter(e => !e.is_all_day);
            const isCurrentDay = isSameDay(day, now);

            return (
              <div key={day.toString()} className="bg-card relative">
                {/* All-day events section */}
                {allDayEvents.length > 0 && (
                  <div className="absolute top-0 left-0 right-0 z-10 p-1 space-y-1">
                    {allDayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="w-full text-left text-xs px-2 py-1 rounded transition-transform hover:scale-105"
                        style={{
                          backgroundColor: event.color,
                          color: 'white',
                        }}
                        title={event.title}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {event.is_recurring && <Repeat className="h-2.5 w-2.5 flex-shrink-0" />}
                          <span className="truncate font-medium">{event.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Hour grid */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-border hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => onDayClick(day)}
                  />
                ))}

                {/* Current time indicator */}
                {isCurrentWeek && isCurrentDay && (
                  <div 
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimePercent}%` }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Timed events overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {timedEvents.map((event) => {
                    const position = getEventPosition(event);
                    const startDate = new Date(event.start_date);
                    
                    return (
                      <button
                        key={event.id}
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="absolute left-1 right-1 pointer-events-auto rounded px-2 py-1 text-xs overflow-hidden transition-transform hover:scale-105 hover:z-10 shadow-sm"
                        style={{
                          top: `${position.top}%`,
                          height: `${position.height}%`,
                          backgroundColor: event.color,
                          color: 'white',
                          minHeight: '32px',
                        }}
                        title={`${event.title}\n${format(startDate, "HH:mm")} - ${format(new Date(event.end_date), "HH:mm")}`}
                      >
                        <div className="font-medium truncate flex items-center gap-1">
                          {event.is_recurring && <Repeat className="h-2.5 w-2.5 flex-shrink-0" />}
                          {eventReminders[event.id] && <Bell className="h-2.5 w-2.5 flex-shrink-0" />}
                          <span className="truncate">{event.title}</span>
                        </div>
                        {position.height > 5 && (
                          <div className="text-[10px] opacity-90 mt-0.5">
                            {format(startDate, "HH:mm")}
                          </div>
                        )}
                        {position.height > 8 && event.description && (
                          <div className="text-[10px] opacity-75 truncate mt-0.5">
                            {event.description}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-muted/30 px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Repeat className="h-3 w-3" />
          <span>Recorrente</span>
        </div>
        <div className="flex items-center gap-1">
          <Bell className="h-3 w-3" />
          <span>Com lembrete</span>
        </div>
        <div className="ml-auto">
          Clique em um evento para editar
        </div>
      </div>
    </div>
  );
};
