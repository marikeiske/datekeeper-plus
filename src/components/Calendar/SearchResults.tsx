import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Edit, Trash2, Bell, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface SearchResultsProps {
  events: Event[];
  onDeleteEvent: (eventId: string) => void;
  onSelectDate: (date: Date) => void;
  eventReminders: Record<string, number>;
}

const formatReminderTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${minutes / 60}h`;
  if (minutes < 10080) return `${minutes / 1440}d`;
  return `${minutes / 10080}sem`;
};

export const SearchResults = ({ 
  events, 
  onDeleteEvent, 
  onSelectDate,
  eventReminders 
}: SearchResultsProps) => {
  const navigate = useNavigate();

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = format(startOfDay(new Date(event.start_date)), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const sortedDates = Object.keys(eventsByDate).sort();

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div>
            <p className="font-medium">Nenhum evento encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tente ajustar seus filtros ou buscar por outro termo
            </p>
          </div>
          <div className="bg-accent/10 p-4 rounded-lg text-left">
            <p className="text-sm font-medium mb-2">💡 Dicas de busca:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use palavras-chave do título ou descrição</li>
              <li>Filtre por cores/categorias específicas</li>
              <li>Defina um período de datas personalizado</li>
              <li>Combine filtros para resultados mais precisos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Resultados da Busca ({events.length})
        </h3>
      </div>

      {sortedDates.map((dateKey) => {
        const date = new Date(dateKey);
        const dayEvents = eventsByDate[dateKey];

        return (
          <div key={dateKey} className="space-y-2">
            <button
              onClick={() => onSelectDate(date)}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </button>

            <div className="space-y-2">
              {dayEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <div 
                    className="h-1" 
                    style={{ backgroundColor: event.color }}
                  />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <span>{event.title}</span>
                        {event.is_recurring && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                          </Badge>
                        )}
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
          </div>
        );
      })}
    </div>
  );
};
