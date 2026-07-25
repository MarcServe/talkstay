import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, CalendarX, Clock, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { logWorkspaceAction } from "@/components/WorkspaceAuditLog";

interface Props { assistantId: string; }

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BookingWindow {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_min: number;
  capacity: number;
  active: boolean;
  specific_date: string | null;
}

interface Blackout {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

export function BookingWindowsManager({ assistantId }: Props) {
  const [useWindows, setUseWindows] = useState(false);
  const [windows, setWindows] = useState<BookingWindow[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [loading, setLoading] = useState(true);

  // Live preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSlots, setPreviewSlots] = useState<Record<string, Array<{ start_time: string; end_time: string }>>>({});

  // New window form
  const [nwMode, setNwMode] = useState<'recurring' | 'specific'>('recurring');
  const [nwWeekday, setNwWeekday] = useState("1");
  const [nwSpecificDate, setNwSpecificDate] = useState("");
  const [nwStart, setNwStart] = useState("09:00");
  const [nwEnd, setNwEnd] = useState("17:00");
  const [nwSlot, setNwSlot] = useState("60");

  // New blackout form
  const [boStart, setBoStart] = useState("");
  const [boEnd, setBoEnd] = useState("");
  const [boReason, setBoReason] = useState("");

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 13);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: { assistantId, startDate: fmt(start), endDate: fmt(end) },
      });
      if (error) throw error;
      setPreviewSlots((data as any)?.availableSlots || {});
    } catch (e: any) {
      console.error('Preview load failed:', e);
      setPreviewSlots({});
    } finally {
      setPreviewLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: w }, { data: b }] = await Promise.all([
      supabase.from("assistants").select("use_booking_windows").eq("id", assistantId).maybeSingle(),
      supabase.from("booking_windows").select("*").eq("assistant_id", assistantId).order("weekday").order("start_time"),
      supabase.from("booking_blackouts").select("*").eq("assistant_id", assistantId).order("start_at"),
    ]);
    setUseWindows(!!(a as any)?.use_booking_windows);
    setWindows((w as any) || []);
    setBlackouts((b as any) || []);
    setLoading(false);
    loadPreview();
  };

  useEffect(() => { load(); }, [assistantId]);

  const toggleUseWindows = async (val: boolean) => {
    setUseWindows(val);
    const { error } = await supabase.from("assistants").update({ use_booking_windows: val } as any).eq("id", assistantId);
    if (error) { toast.error("Failed to update setting"); setUseWindows(!val); }
    else {
      toast.success(val ? "Booking windows enabled" : "Reverted to business hours");
      logWorkspaceAction({ assistantId, action: "booking.mode_change", metadata: { use_booking_windows: val } });
    }
  };

  const addWindow = async () => {
    if (nwMode === 'specific' && !nwSpecificDate) {
      toast.error("Pick a specific date");
      return;
    }
    const weekdayForRow = nwMode === 'specific'
      ? new Date(`${nwSpecificDate}T00:00:00`).getDay()
      : Number(nwWeekday);

    // If adding a Specific date, detect any existing recurring window for that
    // same weekday — otherwise customers will still be able to book every other
    // matching weekday (e.g. every Friday). Offer to remove the recurring rule
    // so the specific date is genuinely the ONLY open day for that weekday.
    if (nwMode === 'specific') {
      const conflictingRecurring = windows.filter(
        (w) => !w.specific_date && w.weekday === weekdayForRow && w.active
      );
      if (conflictingRecurring.length > 0) {
        const ok = confirm(
          `A recurring ${WEEKDAYS[weekdayForRow]} window already exists. ` +
          `If you keep it, customers will still be able to book every other ${WEEKDAYS[weekdayForRow]}.\n\n` +
          `OK = remove the recurring ${WEEKDAYS[weekdayForRow]} rule so only ${nwSpecificDate} is open.\n` +
          `Cancel = keep both (the specific date AND every recurring ${WEEKDAYS[weekdayForRow]}).`
        );
        if (ok) {
          const { error: delErr } = await supabase
            .from("booking_windows")
            .delete()
            .eq("assistant_id", assistantId)
            .eq("weekday", weekdayForRow)
            .is("specific_date", null);
          if (delErr) { toast.error(delErr.message); return; }
        }
      }
    }

    const { error } = await supabase.from("booking_windows").insert({
      assistant_id: assistantId,
      weekday: weekdayForRow,
      specific_date: nwMode === 'specific' ? nwSpecificDate : null,
      start_time: nwStart,
      end_time: nwEnd,
      slot_duration_min: Number(nwSlot),
      capacity: 1,
      active: true,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(nwMode === 'specific' ? "Date-specific window added" : "Recurring window added");
    if (nwMode === 'specific') setNwSpecificDate("");
    logWorkspaceAction({ assistantId, action: "booking.window_add", metadata: { mode: nwMode, weekday: weekdayForRow, date: nwMode === 'specific' ? nwSpecificDate : null, start: nwStart, end: nwEnd } });
    load();
  };

  const removeWindow = async (id: string) => {
    const { error } = await supabase.from("booking_windows").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    logWorkspaceAction({ assistantId, action: "booking.window_remove", targetId: id });
    load();
  };

  const removeRecurringForWeekday = async (weekday: number) => {
    if (!confirm(`Delete all recurring ${WEEKDAYS[weekday]} windows? Specific-date windows are kept.`)) return;
    const { error } = await supabase
      .from("booking_windows")
      .delete()
      .eq("assistant_id", assistantId)
      .eq("weekday", weekday)
      .is("specific_date", null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Recurring ${WEEKDAYS[weekday]} windows removed`);
    load();
  };

  const removeAllRecurring = async () => {
    if (!confirm("Delete ALL recurring weekday windows? Specific-date windows are kept.")) return;
    const { error } = await supabase
      .from("booking_windows")
      .delete()
      .eq("assistant_id", assistantId)
      .is("specific_date", null);
    if (error) { toast.error(error.message); return; }
    toast.success("All recurring windows removed");
    load();
  };

  const removeAllSpecific = async () => {
    if (!confirm("Delete ALL one-off (specific-date) windows? Recurring weekday windows are kept.")) return;
    const { error } = await supabase
      .from("booking_windows")
      .delete()
      .eq("assistant_id", assistantId)
      .not("specific_date", "is", null);
    if (error) { toast.error(error.message); return; }
    toast.success("All one-off windows removed");
    load();
  };

  const toggleWindowActive = async (w: BookingWindow) => {
    const { error } = await supabase.from("booking_windows").update({ active: !w.active } as any).eq("id", w.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const addBlackout = async () => {
    if (!boStart || !boEnd) { toast.error("Pick start and end"); return; }
    const { error } = await supabase.from("booking_blackouts").insert({
      assistant_id: assistantId,
      start_at: new Date(boStart).toISOString(),
      end_at: new Date(boEnd).toISOString(),
      reason: boReason || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Blackout added");
    setBoStart(""); setBoEnd(""); setBoReason("");
    load();
  };

  const removeBlackout = async (id: string) => {
    const { error } = await supabase.from("booking_blackouts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const blockDay = async (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const start = new Date(d.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(d.setHours(23, 59, 59, 999)).toISOString();
    const { error } = await supabase.from("booking_blackouts").insert({
      assistant_id: assistantId, start_at: start, end_at: end, reason: "Day blocked",
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Day blocked");
    load();
  };

  // Block a date range. mode = 'thisWeek' | 'nextWeek' | 'thisMonth' | 'nextMonth'
  const blockRange = async (mode: 'thisWeek' | 'nextWeek' | 'thisMonth' | 'nextMonth') => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let reason: string;

    if (mode === 'thisWeek') {
      // From now → end of Sunday this week
      start = new Date(now);
      const day = start.getDay(); // 0=Sun..6=Sat
      const daysUntilSunday = (7 - day) % 7; // 0 if Sunday
      end = new Date(now);
      end.setDate(end.getDate() + daysUntilSunday);
      end.setHours(23, 59, 59, 999);
      reason = 'Fully booked this week';
    } else if (mode === 'nextWeek') {
      // Next Mon → next Sun
      const day = now.getDay();
      const daysUntilNextMon = ((8 - day) % 7) || 7;
      start = new Date(now);
      start.setDate(start.getDate() + daysUntilNextMon);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      reason = 'Fully booked next week';
    } else if (mode === 'thisMonth') {
      start = new Date(now);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      reason = 'Fully booked this month';
    } else {
      start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
      reason = 'Fully booked next month';
    }

    const { error } = await supabase.from('booking_blackouts').insert({
      assistant_id: assistantId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      reason,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(reason);
    load();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Booking Windows
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define bookable windows — recurring per weekday, or for one specific date.
            When enabled, customers can only book within these windows. When disabled, your existing Business Hours apply.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-md border">
            <div>
              <Label className="font-medium">Use booking windows</Label>
              <p className="text-xs text-muted-foreground">Override Business Hours with the windows below.</p>
            </div>
            <Switch checked={useWindows} onCheckedChange={toggleUseWindows} />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={nwMode === 'recurring' ? 'default' : 'outline'}
              onClick={() => setNwMode('recurring')}
            >
              Recurring weekday
            </Button>
            <Button
              type="button"
              size="sm"
              variant={nwMode === 'specific' ? 'default' : 'outline'}
              onClick={() => setNwMode('specific')}
            >
              Specific date
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-5 items-end">
            <div className="space-y-1">
              <Label>{nwMode === 'specific' ? 'Date' : 'Weekday'}</Label>
              {nwMode === 'specific' ? (
                <Input
                  type="date"
                  value={nwSpecificDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setNwSpecificDate(e.target.value)}
                />
              ) : (
                <Select value={nwWeekday} onValueChange={setNwWeekday}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <Label>Start</Label>
              <Input type="time" value={nwStart} onChange={e => setNwStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input type="time" value={nwEnd} onChange={e => setNwEnd(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Slot (min)</Label>
              <Input type="number" min={5} step={5} value={nwSlot} onChange={e => setNwSlot(e.target.value)} />
            </div>
            <Button onClick={addWindow}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>

          {(() => {
            if (nwMode !== 'specific' || !nwSpecificDate) return null;
            const wd = new Date(`${nwSpecificDate}T00:00:00`).getDay();
            const conflicts = windows.filter(w => !w.specific_date && w.weekday === wd && w.active);
            if (conflicts.length === 0) return null;
            return (
              <div className="p-3 rounded-md border border-amber-500/40 bg-amber-500/10 text-sm flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-amber-700 dark:text-amber-300">
                    Heads up: a recurring {WEEKDAYS[wd]} window already exists.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Customers will still be able to book every other {WEEKDAYS[wd]}. Remove the recurring rows if you only want this one date open.
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => removeRecurringForWeekday(wd)}>
                  Remove recurring {WEEKDAYS[wd]}
                </Button>
              </div>
            );
          })()}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Your windows</h4>
              {windows.length > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={removeAllRecurring}>Clear all recurring</Button>
                  <Button size="sm" variant="ghost" onClick={removeAllSpecific}>Clear all one-off</Button>
                </div>
              )}
            </div>

            {windows.length === 0 && (
              <p className="text-sm text-muted-foreground">No windows yet — add a recurring weekday OR a specific date.</p>
            )}

            {(() => {
              const recurring = windows.filter(w => !w.specific_date);
              const specific = windows.filter(w => !!w.specific_date);
              const renderRow = (w: BookingWindow) => {
                const isSpecific = !!w.specific_date;
                const dateLabel = isSpecific
                  ? new Date(`${w.specific_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                  : `Every ${WEEKDAYS[w.weekday]}`;
                return (
                  <div key={w.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Badge variant={w.active ? "default" : "secondary"}>{dateLabel}</Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${isSpecific ? 'border-primary/50 text-primary' : 'border-muted-foreground/30 text-muted-foreground'}`}
                      >
                        {isSpecific ? 'one-off' : 'recurring'}
                      </Badge>
                      <span className="text-sm">{w.start_time.slice(0,5)} – {w.end_time.slice(0,5)}</span>
                      <span className="text-xs text-muted-foreground">{w.slot_duration_min}m slots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={w.active} onCheckedChange={() => toggleWindowActive(w)} />
                      <Button variant="ghost" size="icon" onClick={() => removeWindow(w.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              };
              return (
                <>
                  {recurring.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Recurring weekly</div>
                      {recurring.map(renderRow)}
                    </div>
                  )}
                  {specific.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Specific dates (one-off)</div>
                      {specific.map(renderRow)}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarX className="w-5 h-5 text-destructive" />
            Calendar Blackouts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Block specific date/time ranges (holidays, off-site, busy days). These are removed from available slots.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => blockDay(0)}>Block today</Button>
            <Button variant="outline" size="sm" onClick={() => blockDay(1)}>Block tomorrow</Button>
            <Button variant="outline" size="sm" onClick={() => blockRange('thisWeek')}>Block this week</Button>
            <Button variant="outline" size="sm" onClick={() => blockRange('nextWeek')}>Block next week</Button>
            <Button variant="outline" size="sm" onClick={() => blockRange('thisMonth')}>Block this month</Button>
            <Button variant="outline" size="sm" onClick={() => blockRange('nextMonth')}>Block next month</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-4 items-end">
            <div className="space-y-1">
              <Label>Start</Label>
              <Input type="datetime-local" value={boStart} onChange={e => setBoStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input type="datetime-local" value={boEnd} onChange={e => setBoEnd(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input value={boReason} onChange={e => setBoReason(e.target.value)} placeholder="Holiday" />
            </div>
            <Button onClick={addBlackout}><Plus className="w-4 h-4 mr-1" />Add blackout</Button>
          </div>

          <div className="space-y-2">
            {blackouts.length === 0 && <p className="text-sm text-muted-foreground">No blackouts.</p>}
            {blackouts.map(b => (
              <div key={b.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="text-sm">
                  <div>{new Date(b.start_at).toLocaleString()} → {new Date(b.end_at).toLocaleString()}</div>
                  {b.reason && <div className="text-xs text-muted-foreground">{b.reason}</div>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeBlackout(b.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Live Availability Preview
            <Button variant="ghost" size="sm" className="ml-auto" onClick={loadPreview} disabled={previewLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${previewLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Exactly what customers will see for the next 14 days. Green = slots available, red = blocked / no availability.
          </p>
        </CardHeader>
        <CardContent>
          {previewLoading ? (
            <p className="text-sm text-muted-foreground">Loading preview…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const key = d.toISOString().slice(0, 10);
                const slots = previewSlots[key] || [];
                const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
                const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const available = slots.length > 0;
                return (
                  <div
                    key={key}
                    className={`p-2 rounded-md border text-center ${
                      available
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-destructive/30 bg-destructive/5'
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">{dayLabel}</div>
                    <div className="text-sm font-semibold">{dateLabel}</div>
                    <div className={`text-xs mt-1 ${available ? 'text-primary' : 'text-destructive'}`}>
                      {available ? `${slots.length} slot${slots.length === 1 ? '' : 's'}` : 'Unavailable'}
                    </div>
                    {available && (
                      <div className="text-[10px] text-muted-foreground mt-1 truncate">
                        {slots[0].start_time}{slots.length > 1 ? `…${slots[slots.length - 1].start_time}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
