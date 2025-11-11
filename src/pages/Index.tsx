import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarGrid } from "@/components/Calendar/CalendarGrid";
import { EventList } from "@/components/Calendar/EventList";
import { SearchAndFilters } from "@/components/Calendar/SearchAndFilters";
import { SearchResults } from "@/components/Calendar/SearchResults";
import { WeekView } from "@/components/Calendar/WeekView";
import { Calendar, ChevronLeft, ChevronRight, LogOut, Plus, Settings, CalendarDays } from "lucide-react";
import { format, addMonths, subMonths, startOfDay, endOfDay, isSameDay, parseISO, startOfMonth, endOfMonth, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [eventReminders, setEventReminders] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchHolidays();
      fetchReminders();
    }
  }, [user, currentDate, viewMode]);

  useEffect(() => {
    // Show search results view when filters are active
    const hasActiveFilters = Boolean(searchQuery || selectedColors.length > 0 || dateRange.start || dateRange.end);
    setShowSearchResults(hasActiveFilters);
  }, [searchQuery, selectedColors, dateRange]);

  useEffect(() => {
    // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchEvents = async () => {
    try {
      const rangeStart = viewMode === "month" 
        ? startOfMonth(currentDate)
        : startOfWeek(currentDate, { locale: ptBR });
      
      const rangeEnd = viewMode === "month"
        ? endOfMonth(currentDate)
        : endOfWeek(currentDate, { locale: ptBR });

      // Fetch regular events
      const { data: regularEvents, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_recurring", false)
        .gte("start_date", rangeStart.toISOString())
        .lte("start_date", rangeEnd.toISOString())
        .order("start_date", { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch recurring events using the database function
      const { data: recurringEvents, error: recurringError } = await supabase
        .rpc("get_recurring_events", {
          start_range: rangeStart.toISOString(),
          end_range: rangeEnd.toISOString(),
          p_user_id: user?.id,
        });

      if (recurringError) {
        console.error("Error fetching recurring events:", recurringError);
      }

      // Combine both types of events
      const allEvents = [
        ...(regularEvents || []),
        ...(recurringEvents || []),
      ];

      setEvents(allEvents);
    } catch (error: any) {
      toast.error("Erro ao carregar eventos");
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .eq("country", "BR")
        .order("date", { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar feriados:", error);
    }
  };

  const fetchReminders = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("event_id, minutes_before, events!inner(user_id)")
        .eq("events.user_id", user.id);

      if (!error && data) {
        const remindersMap: Record<string, number> = {};
        data.forEach((r: any) => {
          remindersMap[r.event_id] = r.minutes_before;
        });
        setEventReminders(remindersMap);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
      
      toast.success("Evento excluído com sucesso!");
      fetchEvents();
    } catch (error: any) {
      toast.error("Erro ao excluir evento");
      console.error(error);
    }
  };

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

  const handleColorToggle = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedColors([]);
    setDateRange({ start: "", end: "" });
  };

  const handleNavigatePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNavigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const getDisplayTitle = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    } else {
      const weekStart = startOfWeek(currentDate, { locale: ptBR });
      const weekEnd = endOfWeek(currentDate, { locale: ptBR });
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, "d")} - ${format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
      } else {
        return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
      }
    }
  };

  // Filter events based on search and filters
  const filteredEvents = events.filter(event => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = event.title?.toLowerCase().includes(query);
      const matchesDescription = event.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription) return false;
    }

    // Color filter
    if (selectedColors.length > 0) {
      if (!selectedColors.includes(event.color)) return false;
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      const eventDate = new Date(event.start_date);
      if (dateRange.start && eventDate < new Date(dateRange.start)) return false;
      if (dateRange.end && eventDate > new Date(dateRange.end)) return false;
    }

    return true;
  });

  const selectedDateEvents = filteredEvents.filter(event =>
    isSameDay(new Date(event.start_date), selectedDate)
  );

  const selectedDateHolidays = holidays.filter(holiday =>
    isSameDay(parseISO(holiday.date), selectedDate)
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Calendar className="w-12 h-12 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">CalendárioApp</h1>
                <p className="text-sm text-muted-foreground">Organize sua agenda</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Navigation */}
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search and Filters */}
        <div className="relative">
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedColors={selectedColors}
            onColorToggle={handleColorToggle}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClearFilters={handleClearFilters}
            availableColors={EVENT_COLORS}
          />
          <div className="absolute -top-2 right-0 text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border">
            ⌘K / Ctrl+K
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleNavigatePrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold capitalize text-center">
                {getDisplayTitle()}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="text-xs"
              >
                Hoje
              </Button>
            </div>
            
            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "week")} className="w-full max-w-xs">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="month" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Mensal</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Semanal</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNavigateNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Results count */}
        {(searchQuery || selectedColors.length > 0 || dateRange.start || dateRange.end) && (
          <div className="text-sm text-muted-foreground text-center bg-accent/10 py-2 px-4 rounded-lg">
            {filteredEvents.length === 0 
              ? "Nenhum evento encontrado com os filtros aplicados"
              : `${filteredEvents.length} evento(s) encontrado(s)`
            }
          </div>
        )}

        {/* Calendar Grid or Search Results */}
        <div className="animate-fade-in">
          {showSearchResults ? (
            <SearchResults
              events={filteredEvents}
              onDeleteEvent={handleDeleteEvent}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setCurrentDate(date);
                setShowSearchResults(false);
                handleClearFilters();
              }}
              eventReminders={eventReminders}
            />
          ) : viewMode === "week" ? (
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              onDayClick={setSelectedDate}
              eventReminders={eventReminders}
            />
          ) : (
            <>
              <CalendarGrid
                currentDate={currentDate}
                events={filteredEvents}
                holidays={holidays}
                onDayClick={setSelectedDate}
                selectedDate={selectedDate}
              />

              {/* Events List */}
              <div className="mt-6">
                <EventList
                  events={selectedDateEvents}
                  holidays={selectedDateHolidays}
                  selectedDate={selectedDate}
                  onDeleteEvent={handleDeleteEvent}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-primary"
        onClick={() => navigate(`/events/new?date=${selectedDate.toISOString()}`)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Index;
