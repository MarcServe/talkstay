import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReminderType = 'day_7' | 'day_12' | 'expired';

interface TrialReminderRequest {
  email: string;
  reminderType: ReminderType;
  daysRemaining?: number;
}

interface SchedulerResult {
  success: boolean;
  remindersSent: {
    day_7: number;
    day_12: number;
    expired: number;
  };
  totalSent: number;
  timestamp: string;
}

export const useTrialReminders = () => {
  const [loading, setLoading] = useState(false);
  const [schedulerRunning, setSchedulerRunning] = useState(false);

  const sendTestReminder = async ({ email, reminderType, daysRemaining }: TrialReminderRequest) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-trial-reminder', {
        body: {
          email,
          reminderType,
          daysRemaining
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error sending trial reminder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const runScheduler = async (): Promise<SchedulerResult> => {
    setSchedulerRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('trial-reminder-scheduler', {
        body: { manual: true }
      });

      if (error) {
        throw error;
      }

      return data as SchedulerResult;
    } catch (error) {
      console.error('Error running scheduler:', error);
      throw error;
    } finally {
      setSchedulerRunning(false);
    }
  };

  const getEmailReminderLogs = async (email?: string) => {
    try {
      let query = supabase
        .from('email_reminder_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching email reminder logs:', error);
      throw error;
    }
  };

  return {
    sendTestReminder,
    runScheduler,
    getEmailReminderLogs,
    loading,
    schedulerRunning
  };
};