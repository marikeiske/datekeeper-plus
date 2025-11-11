import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const EVENT_COLORS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Verde", value: "#10b981" },
  { name: "Amarelo", value: "#f59e0b" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Laranja", value: "#f97316" },
];

const REMINDER_OPTIONS = [
  { label: "Sem lembrete", value: "0" },
  { label: "5 minutos antes", value: "5" },
  { label: "15 minutos antes", value: "15" },
  { label: "30 minutos antes", value: "30" },
  { label: "1 hora antes", value: "60" },
  { label: "2 horas antes", value: "120" },
  { label: "1 dia antes", value: "1440" },
  { label: "1 semana antes", value: "10080" },
];

const RECURRENCE_OPTIONS = [
  { label: "Não repetir", value: "none" },
  { label: "Diariamente", value: "daily" },
  { label: "Semanalmente", value: "weekly" },
  { label: "Mensalmente", value: "monthly" },
  { label: "Anualmente", value: "yearly" },
];

const EventForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [isAllDay, setIsAllDay] = useState(false);
  const [reminder, setReminder] = useState("0");
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && !id) {
      const date = new Date(dateParam);
      setStartDate(format(date, "yyyy-MM-dd"));
    }

    if (id) {
      fetchEvent();
    }
  }, [id, searchParams]);

  const fetchEvent = async () => {
    try {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (eventError) throw eventError;

      setTitle(event.title);
      setDescription(event.description || "");
      setColor(event.color);
      setIsAllDay(event.is_all_day);
      
      const start = new Date(event.start_date);
      setStartDate(format(start, "yyyy-MM-dd"));
      setStartTime(format(start, "HH:mm"));
      setEndTime(format(new Date(event.end_date), "HH:mm"));

      // Fetch reminders
      const { data: reminders, error: reminderError } = await supabase
        .from("reminders")
        .select("*")
        .eq("event_id", id);

      if (reminderError) throw reminderError;
      
      if (reminders && reminders.length > 0) {
        setReminder(reminders[0].minutes_before.toString());
      }

      // Fetch recurrence rules
      if (event.is_recurring) {
        const { data: recurrenceRules, error: recurrenceError } = await supabase
          .from("recurrence_rules")
          .select("*")
          .eq("event_id", id)
          .single();

        if (recurrenceError) {
          console.error("Error fetching recurrence:", recurrenceError);
        } else if (recurrenceRules) {
          setRecurrence(recurrenceRules.frequency);
          if (recurrenceRules.end_date) {
            setRecurrenceEndDate(format(new Date(recurrenceRules.end_date), "yyyy-MM-dd"));
          }
        }
      }
    } catch (error: any) {
      toast.error("Erro ao carregar evento");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startDateTime = isAllDay
        ? new Date(`${startDate}T00:00:00`)
        : new Date(`${startDate}T${startTime}`);
      
      const endDateTime = isAllDay
        ? new Date(`${startDate}T23:59:59`)
        : new Date(`${startDate}T${endTime}`);

      const eventData = {
        title,
        description: description || null,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        color,
        is_all_day: isAllDay,
        is_recurring: recurrence !== "none",
        user_id: user?.id,
      };

      let eventId = id;

      if (id) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", id);

        if (error) throw error;

        // Delete existing reminders and recurrence rules
        await supabase.from("reminders").delete().eq("event_id", id);
        await supabase.from("recurrence_rules").delete().eq("event_id", id);
      } else {
        // Create new event
        const { data, error } = await supabase
          .from("events")
          .insert([eventData])
          .select()
          .single();

        if (error) throw error;
        eventId = data.id;
      }

      // Add recurrence rule if selected
      if (recurrence !== "none" && eventId) {
        const recurrenceData: any = {
          event_id: eventId,
          frequency: recurrence,
          interval: 1,
        };

        if (recurrenceEndDate) {
          recurrenceData.end_date = new Date(recurrenceEndDate).toISOString();
        }

        const { error: recurrenceError } = await supabase
          .from("recurrence_rules")
          .insert([recurrenceData]);

        if (recurrenceError) throw recurrenceError;
      }

      // Add reminder if selected
      if (reminder !== "0" && eventId) {
        const { error: reminderError } = await supabase
          .from("reminders")
          .insert([{
            event_id: eventId,
            minutes_before: parseInt(reminder),
          }]);

        if (reminderError) throw reminderError;
      }

      toast.success(id ? "Evento atualizado!" : "Evento criado!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao salvar evento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">
                {id ? "Editar Evento" : "Novo Evento"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião com cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Adicione mais detalhes sobre o evento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="all-day">Dia inteiro</Label>
                <Switch
                  id="all-day"
                  checked={isAllDay}
                  onCheckedChange={setIsAllDay}
                />
              </div>

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Início</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Término</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-3">
                  {EVENT_COLORS.map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() => setColor(colorOption.value)}
                      className="relative"
                    >
                      <div
                        className="w-10 h-10 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: colorOption.value }}
                      />
                      {color === colorOption.value && (
                        <div className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder">Lembrete</Label>
                <Select value={reminder} onValueChange={setReminder}>
                  <SelectTrigger id="reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence">Repetir</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger id="recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {RECURRENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value === "none" && "🚫 "}
                        {option.value === "daily" && "📅 "}
                        {option.value === "weekly" && "📆 "}
                        {option.value === "monthly" && "🗓️ "}
                        {option.value === "yearly" && "🎂 "}
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recurrence !== "none" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    🔄 Este evento se repetirá automaticamente
                  </p>
                )}
              </div>

              {recurrence !== "none" && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence-end">Repetir até (opcional)</Label>
                  <Input
                    id="recurrence-end"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    min={startDate}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para repetir indefinidamente
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/")}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventForm;
