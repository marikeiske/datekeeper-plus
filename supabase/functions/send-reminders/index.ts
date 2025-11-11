import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingReminder {
  reminder_id: string;
  event_id: string;
  event_title: string;
  event_start_date: string;
  event_description: string | null;
  user_email: string;
  minutes_before: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting reminder notification check...");

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending reminders using the database function
    const { data: pendingReminders, error: fetchError } = await supabase
      .rpc("get_pending_reminders");

    if (fetchError) {
      console.error("Error fetching pending reminders:", fetchError);
      throw fetchError;
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      console.log("No pending reminders found");
      return new Response(
        JSON.stringify({ message: "No pending reminders", count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${pendingReminders.length} pending reminder(s)`);

    const results = [];

    for (const reminder of pendingReminders as PendingReminder[]) {
      try {
        const eventDate = new Date(reminder.event_start_date);
        const formattedDate = eventDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const formattedTime = eventDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const timeBeforeText = 
          reminder.minutes_before < 60 
            ? `${reminder.minutes_before} minutos`
            : reminder.minutes_before < 1440
            ? `${reminder.minutes_before / 60} hora(s)`
            : `${reminder.minutes_before / 1440} dia(s)`;

        // Send email using Resend
        const emailResponse = await resend.emails.send({
          from: "CalendárioApp <onboarding@resend.dev>",
          to: [reminder.user_email],
          subject: `🔔 Lembrete: ${reminder.event_title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                📅 Lembrete de Evento
              </h1>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #1f2937;">${reminder.event_title}</h2>
                ${reminder.event_description ? `<p style="color: #6b7280;">${reminder.event_description}</p>` : ''}
                <p style="margin: 10px 0;"><strong>📅 Data:</strong> ${formattedDate}</p>
                <p style="margin: 10px 0;"><strong>🕐 Horário:</strong> ${formattedTime}</p>
                <p style="margin: 10px 0;"><strong>⏰ Lembrete:</strong> ${timeBeforeText} antes</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Este é um lembrete automático do seu CalendárioApp. Não responda a este email.
              </p>
            </div>
          `,
        });

        console.log("Email sent successfully:", emailResponse);

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from("reminders")
          .update({ notification_sent: true })
          .eq("id", reminder.reminder_id);

        if (updateError) {
          console.error("Error updating reminder status:", updateError);
          throw updateError;
        }

        results.push({
          reminder_id: reminder.reminder_id,
          event_title: reminder.event_title,
          user_email: reminder.user_email,
          status: "sent",
        });

      } catch (error) {
        console.error(`Error processing reminder ${reminder.reminder_id}:`, error);
        results.push({
          reminder_id: reminder.reminder_id,
          event_title: reminder.event_title,
          user_email: reminder.user_email,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("Reminder processing complete:", results);

    return new Response(
      JSON.stringify({
        message: "Reminders processed",
        count: pendingReminders.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
