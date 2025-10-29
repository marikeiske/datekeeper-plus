import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CalendarGridProps {
  currentDate: Date;
  events: Array<{
    id: string;
    title: string;
    start_date: string;
    color: string;
  }>;
  holidays: Array<{
    id: string;
    date: string;
    name: string;
  }>;
  onDayClick: (date: Date) => void;
  selectedDate?: Date;
}

export const CalendarGrid = ({ 
  currentDate, 
  events, 
  holidays, 
  onDayClick,
  selectedDate 
}: CalendarGridProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getEventsForDay = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), date)
    );
  };

  const getHolidayForDay = (date: Date) => {
    return holidays.find(holiday => 
      isSameDay(new Date(holiday.date), date)
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      {/* Week days header */}
      <div className="grid grid-cols-7 gap-px bg-border">
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-card p-2 text-center text-sm font-semibold text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const holiday = getHolidayForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDay = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={day.toString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "bg-card min-h-[80px] p-2 flex flex-col items-start transition-all hover:bg-accent/50",
                !isCurrentMonth && "opacity-40",
                isTodayDay && "bg-primary/10",
                isSelected && "ring-2 ring-primary ring-inset"
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium mb-1 rounded-full w-7 h-7 flex items-center justify-center",
                  isTodayDay && "bg-primary text-primary-foreground",
                  holiday && !isTodayDay && "text-destructive font-bold"
                )}
              >
                {format(day, "d")}
              </span>
              
              <div className="w-full space-y-1">
                {holiday && (
                  <div
                    className="text-xs truncate px-1 py-0.5 rounded bg-destructive/10 text-destructive"
                    title={holiday.name}
                  >
                    🎉 {holiday.name}
                  </div>
                )}
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs truncate px-1 py-0.5 rounded"
                    style={{ 
                      backgroundColor: `${event.color}20`,
                      color: event.color,
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayEvents.length - 2} mais
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
