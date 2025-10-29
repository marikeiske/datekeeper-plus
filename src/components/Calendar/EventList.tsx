import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: string;
  is_all_day: boolean;
}

interface EventListProps {
  events: Event[];
  selectedDate: Date;
  onDeleteEvent: (eventId: string) => void;
}

export const EventList = ({ events, selectedDate, onDeleteEvent }: EventListProps) => {
  const navigate = useNavigate();

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum evento neste dia</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        Eventos de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
      </h3>
      {events.map((event) => (
        <Card key={event.id} className="overflow-hidden">
          <div 
            className="h-1" 
            style={{ backgroundColor: event.color }}
          />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-start justify-between">
              <span>{event.title}</span>
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
