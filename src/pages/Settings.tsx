import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, RefreshCw, Moon, Sun, Download, Bell } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [testingNotifications, setTestingNotifications] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    holidaysCount: 0,
    pendingReminders: 0,
  });
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    fetchStats();
    
    // Detect system theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const fetchStats = async () => {
    try {
      // Total events
      const { count: totalCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      // Upcoming events
      const now = new Date().toISOString();
      const { count: upcomingCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .gte("start_date", now);

      // Holidays count
      const { count: holidaysCount } = await supabase
        .from("holidays")
        .select("*", { count: "exact", head: true })
        .eq("country", "BR");

      // Pending reminders count
      const { count: pendingCount } = await supabase
        .from("reminders")
        .select("*, events!inner(*)", { count: "exact", head: true })
        .eq("notification_sent", false)
        .eq("events.user_id", user?.id);

      setStats({
        totalEvents: totalCount || 0,
        upcomingEvents: upcomingCount || 0,
        holidaysCount: holidaysCount || 0,
        pendingReminders: pendingCount || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const syncHolidays = async () => {
    setSyncing(true);
    try {
      // Fetch holidays from Nager.Date API
      const response = await fetch("https://date.nager.at/api/v3/PublicHolidays/2025/BR");
      const holidays = await response.json();

      // Insert holidays into database
      const holidaysData = holidays.map((holiday: any) => ({
        date: holiday.date,
        name: holiday.localName,
        country: "BR",
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("holidays")
        .upsert(holidaysData, { onConflict: "date,country" });

      if (error) throw error;

      toast.success(`${holidays.length} feriados sincronizados!`);
      fetchStats();
    } catch (error: any) {
      toast.error("Erro ao sincronizar feriados");
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    toast.success(`Tema ${newTheme === "dark" ? "escuro" : "claro"} ativado`);
  };

  const testNotifications = async () => {
    setTestingNotifications(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-reminders", {
        body: {},
      });

      if (error) throw error;

      toast.success(`Teste concluído! ${data?.count || 0} notificações processadas`);
      fetchStats();
    } catch (error: any) {
      toast.error("Erro ao testar notificações");
      console.error(error);
    } finally {
      setTestingNotifications(false);
    }
  };

  const installPWA = () => {
    toast.info("Para instalar: toque no botão de compartilhar e selecione 'Adicionar à Tela Inicial'");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Configurações</h1>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
            <CardDescription>Resumo da sua agenda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total de eventos</span>
              <span className="text-2xl font-bold text-primary">{stats.totalEvents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Eventos futuros</span>
              <span className="text-2xl font-bold text-accent">{stats.upcomingEvents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Feriados sincronizados</span>
              <span className="text-2xl font-bold text-success">{stats.holidaysCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lembretes pendentes</span>
              <span className="text-2xl font-bold text-warning">{stats.pendingReminders}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle>Notificações Automáticas</CardTitle>
            <CardDescription>
              Sistema de lembretes por email configurado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Sistema ativo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Os lembretes configurados nos seus eventos serão enviados automaticamente por email.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={testNotifications}
              disabled={testingNotifications}
              className="w-full"
              variant="outline"
            >
              <Bell className={`h-4 w-4 mr-2 ${testingNotifications ? "animate-pulse" : ""}`} />
              {testingNotifications ? "Processando..." : "Testar Notificações Agora"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Clique para processar lembretes pendentes imediatamente
            </p>
          </CardContent>
        </Card>

        {/* Holidays Sync Card */}
        <Card>
          <CardHeader>
            <CardTitle>Feriados Nacionais</CardTitle>
            <CardDescription>
              Sincronize os feriados brasileiros automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={syncHolidays}
              disabled={syncing}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar Feriados"}
            </Button>
          </CardContent>
        </Card>

        {/* Theme Card */}
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Personalize o tema do app</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={toggleTheme} className="w-full" variant="outline">
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Ativar Tema Escuro
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Ativar Tema Claro
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Install PWA Card */}
        <Card>
          <CardHeader>
            <CardTitle>Instalar App</CardTitle>
            <CardDescription>
              Adicione o CalendárioApp à sua tela inicial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={installPWA} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Instalar na Tela Inicial
            </Button>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{user?.id.slice(0, 8)}...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
