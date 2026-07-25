import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Calendar } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  user_id: string | null;
}

const TIER_OPTIONS = [
  { value: "social", label: "Link" },
  { value: "small_business", label: "Core" },
  { value: "large_business", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
] as const;

const TIER_DISPLAY: Record<string, string> = {
  social: "Link",
  link: "Link",
  small_business: "Core",
  core: "Core",
  starter: "Core",
  large_business: "Pro",
  pro: "Pro",
  professional: "Pro",
  growth: "Pro",
  enterprise: "Enterprise",
  premium: "Enterprise",
};

function getTierBadgeVariant(tier: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!tier) return "outline";
  const mapped = TIER_DISPLAY[tier.toLowerCase()];
  if (mapped === "Enterprise") return "default";
  if (mapped === "Pro") return "default";
  if (mapped === "Core") return "secondary";
  return "outline";
}

interface SubscriberTableProps {
  subscribers: Subscriber[];
  onRefresh: () => void;
}

export function SubscriberTable({ subscribers, onRefresh }: SubscriberTableProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState("small_business");
  const [saving, setSaving] = useState(false);

  const filtered = subscribers.filter((sub) => {
    const matchesSearch = !search || sub.email.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "all" || sub.subscription_tier === tierFilter || 
      (tierFilter === "none" && !sub.subscription_tier);
    return matchesSearch && matchesTier;
  });

  const handleTierChange = async (sub: Subscriber, newTier: string) => {
    const { error } = await supabase
      .from("subscribers")
      .update({ subscription_tier: newTier, updated_at: new Date().toISOString() })
      .eq("id", sub.id);
    if (error) {
      toast.error("Failed to update tier: " + error.message);
    } else {
      toast.success(`Tier updated to ${TIER_DISPLAY[newTier] || newTier}`);
      onRefresh();
    }
  };

  const handleToggleActive = async (sub: Subscriber) => {
    const { error } = await supabase
      .from("subscribers")
      .update({ subscribed: !sub.subscribed, updated_at: new Date().toISOString() })
      .eq("id", sub.id);
    if (error) {
      toast.error("Failed to toggle status: " + error.message);
    } else {
      toast.success(sub.subscribed ? "Subscription deactivated" : "Subscription activated");
      onRefresh();
    }
  };

  const handleDelete = async (sub: Subscriber) => {
    if (!confirm(`Remove subscriber ${sub.email}? This cannot be undone.`)) return;
    const { error } = await supabase.from("subscribers").delete().eq("id", sub.id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Subscriber removed");
      onRefresh();
    }
  };

  const handleSetExpiry = async () => {
    if (!selectedSub) return;
    setSaving(true);
    const { error } = await supabase
      .from("subscribers")
      .update({
        subscription_end: expiryDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSub.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to set expiry: " + error.message);
    } else {
      toast.success(expiryDate ? "Expiry date set" : "Expiry cleared (permanent override)");
      setExpiryDialogOpen(false);
      onRefresh();
    }
  };

  const handleAddSubscriber = async () => {
    if (!newEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("subscribers").insert({
      email: newEmail.trim(),
      subscribed: true,
      subscription_tier: newTier,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to add subscriber: " + error.message);
    } else {
      toast.success("Subscriber added with permanent override");
      setAddDialogOpen(false);
      setNewEmail("");
      setNewTier("small_business");
      onRefresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>All Subscribers</CardTitle>
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Subscriber
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="none">No Tier</SelectItem>
              {TIER_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Stripe ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No subscribers found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.email}</TableCell>
                    <TableCell>
                      <Select
                        value={sub.subscription_tier || ""}
                        onValueChange={(val) => handleTierChange(sub, val)}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue>
                            <Badge variant={getTierBadgeVariant(sub.subscription_tier)}>
                              {TIER_DISPLAY[sub.subscription_tier?.toLowerCase() || ""] || sub.subscription_tier || "None"}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TIER_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={sub.subscribed}
                        onCheckedChange={() => handleToggleActive(sub)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          {sub.subscription_end
                            ? new Date(sub.subscription_end).toLocaleDateString()
                            : "Permanent"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setSelectedSub(sub);
                            setExpiryDate(sub.subscription_end?.split("T")[0] || "");
                            setExpiryDialogOpen(true);
                          }}
                        >
                          <Calendar className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {sub.stripe_customer_id ? sub.stripe_customer_id.slice(0, 18) + "..." : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(sub)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Showing {filtered.length} of {subscribers.length} subscribers
        </p>
      </CardContent>

      {/* Add Subscriber Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscriber</DialogTitle>
            <DialogDescription>
              Create a manual subscription override. No Stripe payment required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubscriber} disabled={saving}>
              {saving ? "Adding..." : "Add Subscriber"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Expiry Dialog */}
      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Subscription Expiry</DialogTitle>
            <DialogDescription>
              Set an expiry date or leave empty for a permanent override for {selectedSub?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to clear expiry (permanent override).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetExpiry} disabled={saving}>
              {saving ? "Saving..." : expiryDate ? "Set Expiry" : "Clear Expiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
