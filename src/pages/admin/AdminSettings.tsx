import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Database, Mail, Globe, Shield, MessageSquare, Loader2 } from "lucide-react";
import { EnvironmentSwitcher } from "@/components/admin/EnvironmentSwitcher";
import { TrialReminderManager } from "@/components/TrialReminderManager";
import { CrawlLimitOverride } from "@/components/admin/CrawlLimitOverride";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneralSettings {
  site_name: string;
  admin_email: string;
  maintenance_mode: boolean;
}

interface DatabaseSettings {
  auto_backup: boolean;
  query_optimization: boolean;
  backup_frequency: number;
}

interface SecuritySettings {
  session_timeout: number;
  rate_limit: number;
  require_2fa: boolean;
}

const DEFAULTS = {
  general: { site_name: 'TalkWeb', admin_email: '', maintenance_mode: false } as GeneralSettings,
  database: { auto_backup: true, query_optimization: true, backup_frequency: 24 } as DatabaseSettings,
  security: { session_timeout: 60, rate_limit: 100, require_2fa: false } as SecuritySettings,
};

async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return data ? (data.value as T) : fallback;
}

async function saveSetting(key: string, value: unknown) {
  return supabase
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

export function AdminSettings() {
  const { toast } = useToast();

  const [general, setGeneral] = useState<GeneralSettings>(DEFAULTS.general);
  const [db, setDb] = useState<DatabaseSettings>(DEFAULTS.database);
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULTS.security);
  const [loadingInit, setLoadingInit] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    Promise.all([
      loadSetting('general', DEFAULTS.general),
      loadSetting('database', DEFAULTS.database),
      loadSetting('security', DEFAULTS.security),
    ]).then(([g, d, s]) => {
      setGeneral(g);
      setDb(d);
      setSecurity(s);
    }).finally(() => setLoadingInit(false));
  }, []);

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    const { error } = await saveSetting('general', general);
    setSavingGeneral(false);
    toast(error
      ? { title: 'Save failed', description: error.message, variant: 'destructive' }
      : { title: 'General settings saved' }
    );
  };

  const handleSaveDb = async () => {
    setSavingDb(true);
    const { error } = await saveSetting('database', db);
    setSavingDb(false);
    toast(error
      ? { title: 'Save failed', description: error.message, variant: 'destructive' }
      : { title: 'Database settings saved' }
    );
  };

  const handleSaveSecurity = async () => {
    setSavingSecurity(true);
    const { error } = await saveSetting('security', security);
    setSavingSecurity(false);
    toast(error
      ? { title: 'Save failed', description: error.message, variant: 'destructive' }
      : { title: 'Security settings saved' }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="trials" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Trial Reminders
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="crawl" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Crawl Settings
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <EnvironmentSwitcher />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input
                    id="site-name"
                    placeholder="TalkWeb"
                    value={general.site_name}
                    onChange={(e) => setGeneral(g => ({ ...g, site_name: e.target.value }))}
                    disabled={loadingInit}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@talkweb.io"
                    value={general.admin_email}
                    onChange={(e) => setGeneral(g => ({ ...g, admin_email: e.target.value }))}
                    disabled={loadingInit}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenance-mode"
                    checked={general.maintenance_mode}
                    onCheckedChange={(checked) => setGeneral(g => ({ ...g, maintenance_mode: checked }))}
                    disabled={loadingInit}
                  />
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                </div>
                <Button size="sm" onClick={handleSaveGeneral} disabled={savingGeneral || loadingInit}>
                  {savingGeneral ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save General Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Admin Feedback
                </CardTitle>
                <CardDescription>Share feedback about the admin interface or system features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Help us improve TalkWeb by sharing your thoughts on the admin experience, feature requests, or any issues you've encountered.
                </p>
                <a href="https://tally.so/r/wLepKy" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Admin Feedback
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trials">
          <TrialReminderManager />
        </TabsContent>

        <TabsContent value="crawl">
          <CrawlLimitOverride />
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Settings
              </CardTitle>
              <CardDescription>Database configuration and optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-backup"
                  checked={db.auto_backup}
                  onCheckedChange={(checked) => setDb(d => ({ ...d, auto_backup: checked }))}
                  disabled={loadingInit}
                />
                <Label htmlFor="auto-backup">Automatic Backups</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="query-optimization"
                  checked={db.query_optimization}
                  onCheckedChange={(checked) => setDb(d => ({ ...d, query_optimization: checked }))}
                  disabled={loadingInit}
                />
                <Label htmlFor="query-optimization">Query Optimization</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="backup-frequency">Backup Frequency (hours)</Label>
                <Input
                  id="backup-frequency"
                  type="number"
                  value={db.backup_frequency}
                  onChange={(e) => setDb(d => ({ ...d, backup_frequency: Number(e.target.value) }))}
                  disabled={loadingInit}
                />
              </div>
              <Button size="sm" onClick={handleSaveDb} disabled={savingDb || loadingInit}>
                {savingDb ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Database Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security policies and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  placeholder="60"
                  value={security.session_timeout}
                  onChange={(e) => setSecurity(s => ({ ...s, session_timeout: Number(e.target.value) }))}
                  disabled={loadingInit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate-limit">Rate Limit (requests per minute)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  placeholder="100"
                  value={security.rate_limit}
                  onChange={(e) => setSecurity(s => ({ ...s, rate_limit: Number(e.target.value) }))}
                  disabled={loadingInit}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="two-factor"
                  checked={security.require_2fa}
                  onCheckedChange={(checked) => setSecurity(s => ({ ...s, require_2fa: checked }))}
                  disabled={loadingInit}
                />
                <Label htmlFor="two-factor">Require Two-Factor Authentication</Label>
              </div>
              <Button size="sm" onClick={handleSaveSecurity} disabled={savingSecurity || loadingInit}>
                {savingSecurity ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
