import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Clock, AlertTriangle, Send, Calendar } from "lucide-react";

export const TrialReminderManager = () => {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [reminderType, setReminderType] = useState<"day_7" | "day_12" | "expired">("day_7");
  const [schedulerRunning, setSchedulerRunning] = useState(false);

  const handleTestReminder = async () => {
    if (!testEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-trial-reminder', {
        body: {
          email: testEmail,
          reminderType,
          daysRemaining: reminderType === 'day_7' ? 7 : reminderType === 'day_12' ? 2 : undefined
        }
      });

      if (error) {
        throw error;
      }

      toast.success(`Test ${reminderType.replace('_', ' ')} reminder sent to ${testEmail}`);
      setTestEmail("");
    } catch (error) {
      console.error('Error sending test reminder:', error);
      toast.error("Failed to send test reminder");
    } finally {
      setLoading(false);
    }
  };

  const handleRunScheduler = async () => {
    setSchedulerRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('trial-reminder-scheduler', {
        body: { manual: true }
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (result.success) {
        toast.success(
          `Scheduler completed! Sent ${result.totalSent} reminders: ${result.remindersSent.day_7} day-7, ${result.remindersSent.day_12} day-12, ${result.remindersSent.expired} expired`
        );
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error running scheduler:', error);
      toast.error("Failed to run scheduler");
    } finally {
      setSchedulerRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Trial Email Reminder System
          </CardTitle>
          <CardDescription>
            Manage automated email reminders for trial users at different stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Templates Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Day 7</Badge>
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-semibold mb-1">Halfway Reminder</h3>
              <p className="text-sm text-muted-foreground">
                Sent 7 days after trial start. Encourages exploration and highlights remaining features.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive">Day 12</Badge>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-semibold mb-1">Urgency Reminder</h3>
              <p className="text-sm text-muted-foreground">
                Sent 12 days after trial start (2 days left). Creates urgency with special offer.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Expired</Badge>
                <Send className="w-4 h-4" />
              </div>
              <h3 className="font-semibold mb-1">Reactivation Email</h3>
              <p className="text-sm text-muted-foreground">
                Sent when trial expires. Encourages upgrade with special pricing.
              </p>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">Automated Schedule</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The reminder system runs automatically every day at 9:00 AM UTC. It checks for:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc">
              <li>Trials that started 7 days ago (day 7 reminder)</li>
              <li>Trials that started 12 days ago (day 12 reminder)</li>
              <li>Trials that expired yesterday (expiration email)</li>
            </ul>
          </div>

          {/* Test Email Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Email Reminders</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="test-email">Test Email Address</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="reminder-type">Reminder Type</Label>
                <Select value={reminderType} onValueChange={(value: any) => setReminderType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day_7">Day 7 Reminder</SelectItem>
                    <SelectItem value="day_12">Day 12 Reminder</SelectItem>
                    <SelectItem value="expired">Expiration Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleTestReminder} disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </div>
          </div>

          {/* Manual Scheduler Run */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Manual Scheduler Run</h3>
            <p className="text-sm text-muted-foreground">
              Run the scheduler manually to process any pending reminders immediately.
            </p>
            <Button 
              onClick={handleRunScheduler} 
              disabled={schedulerRunning}
              variant="outline"
            >
              {schedulerRunning ? "Running Scheduler..." : "Run Scheduler Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};