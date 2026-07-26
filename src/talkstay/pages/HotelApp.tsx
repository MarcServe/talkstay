import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, LogOut, Bell } from "lucide-react";
import { enablePush, pushSupported } from "@/talkstay/lib/push";
import AuthPage from "@/talkstay/pages/AuthPage";
import OperationsPanel from "@/talkstay/components/OperationsPanel";
import InsightsPanel from "@/talkstay/components/InsightsPanel";
import RoomsPanel from "@/talkstay/components/RoomsPanel";
import DepartmentsPanel from "@/talkstay/components/DepartmentsPanel";
import KnowledgePanel from "@/talkstay/components/KnowledgePanel";
import StaffPanel from "@/talkstay/components/StaffPanel";
import { createHotel, getMyHotel, type Hotel } from "@/talkstay/lib/hotels";

function CreateHotel({ onCreated }: { onCreated: (h: Hotel) => void }) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const hotel = await createHotel({ name: name.trim(), default_language: language });
      toast.success("Hotel created");
      onCreated(hotel);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create hotel");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold">Create your hotel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This sets up your guest assistant, knowledge base and the 8 service departments.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="hotel-name">Hotel name</Label>
          <Input id="hotel-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Grand Hotel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hotel-lang">Primary language</Label>
          <Input id="hotel-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating…" : "Create hotel"}
        </Button>
      </form>
    </div>
  );
}

export default function HotelApp() {
  const { user, loading } = useAuth();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loadingHotel, setLoadingHotel] = useState(true);

  useEffect(() => {
    if (!user) { setLoadingHotel(false); return; }
    setLoadingHotel(true);
    getMyHotel()
      .then(setHotel)
      .catch((e) => toast.error(e?.message ?? "Failed to load hotel"))
      .finally(() => setLoadingHotel(false));
  }, [user]);

  if (loading || (user && loadingHotel)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">TalkStay</span>
            {hotel && <span className="text-sm text-muted-foreground">· {hotel.name}</span>}
          </div>
          <div className="flex items-center gap-1">
            {hotel && pushSupported() && (
              <Button
                variant="outline" size="sm"
                onClick={async () => {
                  try { await enablePush(hotel.id); toast.success("Alerts enabled on this device."); }
                  catch (e: any) { toast.error(e?.message ?? "Couldn't enable alerts"); }
                }}
              >
                <Bell className="mr-1 h-4 w-4" /> Enable alerts
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {!hotel ? (
          <CreateHotel onCreated={setHotel} />
        ) : (
          <Tabs defaultValue="operations">
            <TabsList>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="rooms">Rooms &amp; QR</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
            </TabsList>
            <TabsContent value="operations" className="mt-6"><OperationsPanel hotel={hotel} /></TabsContent>
            <TabsContent value="insights" className="mt-6"><InsightsPanel hotel={hotel} /></TabsContent>
            <TabsContent value="rooms" className="mt-6"><RoomsPanel hotel={hotel} /></TabsContent>
            <TabsContent value="departments" className="mt-6"><DepartmentsPanel hotel={hotel} /></TabsContent>
            <TabsContent value="knowledge" className="mt-6"><KnowledgePanel hotel={hotel} /></TabsContent>
            <TabsContent value="staff" className="mt-6"><StaffPanel hotel={hotel} /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
