import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Mail, Clock, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FollowUpSettingsProps {
  assistantId: string;
}

export const FollowUpSettings = ({ assistantId }: FollowUpSettingsProps) => {
  const [enabled, setEnabled] = useState(false);
  const [newStatusDays, setNewStatusDays] = useState(3);
  const [contactedStatusDays, setContactedStatusDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (assistantId) {
      loadConfig();
    }
  }, [assistantId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inquiry_follow_up_config")
        .select("*")
        .eq("assistant_id", assistantId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setConfigId(data.id);
        setEnabled(data.enabled);
        setNewStatusDays(data.new_status_days);
        setContactedStatusDays(data.contacted_status_days);
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      const configData = {
        assistant_id: assistantId,
        enabled,
        new_status_days: newStatusDays,
        contacted_status_days: contactedStatusDays,
      };

      if (configId) {
        // Update existing config
        const { error } = await supabase
          .from("inquiry_follow_up_config")
          .update(configData)
          .eq("id", configId);

        if (error) throw error;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from("inquiry_follow_up_config")
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
      }

      toast({
        title: "Settings saved",
        description: "Follow-up settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!assistantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automated Follow-ups</CardTitle>
          <CardDescription>Please select an assistant first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Automated Follow-ups
        </CardTitle>
        <CardDescription>
          Automatically send reminder emails to yourself for inquiries that need attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enabled" className="text-base font-medium">
              Enable Automated Follow-ups
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive reminder emails for inquiries that haven't been followed up
            </p>
          </div>
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Follow-up emails will be sent to your booking notification email address.
                Make sure it's configured in your assistant settings.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newStatusDays" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Days before reminding about "New" inquiries
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="newStatusDays"
                    type="number"
                    min="1"
                    max="30"
                    value={newStatusDays}
                    onChange={(e) => setNewStatusDays(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    days after inquiry is received
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll receive a reminder {newStatusDays} days after an inquiry is created
                  if its status is still "New"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactedStatusDays" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Days before reminding about "Contacted" inquiries
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="contactedStatusDays"
                    type="number"
                    min="1"
                    max="30"
                    value={contactedStatusDays}
                    onChange={(e) => setContactedStatusDays(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    days after last update
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll receive a reminder {contactedStatusDays} days after an inquiry was
                  last updated if its status is still "Contacted"
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Reminders are checked daily automatically</li>
                <li>Only one reminder is sent per inquiry per status</li>
                <li>No reminders are sent for inquiries with scheduled meetings</li>
                <li>Update the inquiry status to stop receiving reminders</li>
              </ul>
            </div>
          </>
        )}

        <Button onClick={saveConfig} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};
