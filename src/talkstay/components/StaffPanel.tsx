import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, Upload, FileSpreadsheet, Download, Mail } from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";
import LiveShareCard from "@/talkstay/components/LiveShareCard";

interface StaffRow {
  id: string;
  email: string;
  name: string | null;
  department_key: string | null;
  role: string;
  status: string;
}

interface HotelDept {
  key: string;
  display_name: string;
  is_active: boolean;
}

type BulkRow = { name?: string; email: string; departmentKey?: string | null; role?: string };

const ALL_DEPTS = "__all__";
const SAMPLE_CSV = `name,email,department,role
Sarah Campbell,sarah@hotel.com,bar,staff
Helen Park,helen@hotel.com,housekeeping,staff
James Wright,james@hotel.com,front_desk,manager
`;

const FALLBACK_DEPT_KEYS = new Set(DEPARTMENTS.map((d) => d.key));

const isExcelFile = (file: File) =>
  /\.(xlsx|xls|xlsm)$/i.test(file.name)
  || /spreadsheet|excel|ms-excel/i.test(file.type);

/** First sheet → CSV text so Excel and CSV share one parser. */
async function excelFileToCsv(file: File): Promise<string> {
  // Lazy-load SheetJS so the ops dashboard doesn't pay ~300kb until import.
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("That workbook has no sheets.");
  const sheet = wb.Sheets[sheetName];
  // Prefer the densest sheet if the first is a cover tab.
  let best = sheet;
  let bestRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).length;
  for (const name of wb.SheetNames.slice(1)) {
    const s = wb.Sheets[name];
    const n = XLSX.utils.sheet_to_json(s, { header: 1 }).length;
    if (n > bestRows) { best = s; bestRows = n; }
  }
  return XLSX.utils.sheet_to_csv(best);
}

/** Parse CSV or paste lines: name,email,department,role (header optional). */
function parseStaffRoster(raw: string): { rows: BulkRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["Nothing to import."] };

  const splitLine = (line: string): string[] => {
    // Minimal CSV: commas + optional quotes
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cells.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells.map((c) => c.replace(/^"|"$/g, "").trim());
  };

  const headerMatch = (h: string, ...keys: string[]) =>
    keys.some((k) => h === k || h.replace(/[_\s]+/g, " ") === k || h.includes(k));

  let start = 0;
  let cols = { name: 0, email: 1, department: 2, role: 3, first: -1, last: -1 };
  const header = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  if (header.some((h) => h.includes("email") || h.includes("e-mail"))) {
    cols = {
      name: header.findIndex((h) =>
        headerMatch(h, "name", "full name", "full_name", "employee", "employee name", "staff name", "colleague")),
      email: header.findIndex((h) =>
        headerMatch(h, "email", "e-mail", "email address", "e-mail address", "work email")),
      department: header.findIndex((h) =>
        headerMatch(h, "department", "dept", "department_key", "team", "outlet", "section")),
      role: header.findIndex((h) =>
        headerMatch(h, "role", "access", "job title", "title", "position")),
      first: header.findIndex((h) => headerMatch(h, "first name", "firstname", "given name")),
      last: header.findIndex((h) => headerMatch(h, "last name", "lastname", "surname", "family name")),
    };
    if (cols.email < 0) cols.email = header.findIndex((h) => h.includes("email") || h.includes("e-mail"));
    start = 1;
  }

  const rows: BulkRow[] = [];
  const seen = new Set<string>();
  for (let i = start; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    // Support "email only" or "name <email>" paste
    let email = cols.email >= 0 ? (cells[cols.email] ?? "") : "";
    let name = cols.name >= 0 ? (cells[cols.name] ?? "") : "";
    if (!name.trim() && (cols.first >= 0 || cols.last >= 0)) {
      name = [cols.first >= 0 ? cells[cols.first] : "", cols.last >= 0 ? cells[cols.last] : ""]
        .map((p) => (p ?? "").trim()).filter(Boolean).join(" ");
    }
    let department = cols.department >= 0 ? (cells[cols.department] ?? "") : "";
    let role = cols.role >= 0 ? (cells[cols.role] ?? "staff") : "staff";

    if (!email && cells.length === 1) {
      const m = cells[0].match(/^(.*?)\s*<([^>]+)>$/);
      if (m) { name = m[1].trim(); email = m[2].trim(); }
      else email = cells[0];
    }
    if (!email && cells.length >= 2) {
      // Fallback positional: name, email, …
      name = cells[0]; email = cells[1];
      department = cells[2] ?? ""; role = cells[3] ?? "staff";
    }

    email = email.trim().toLowerCase();
    if (!email) {
      errors.push(`Line ${i + 1}: missing email`);
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Line ${i + 1}: invalid email (${email})`);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);

    let departmentKey: string | null | undefined = undefined;
    if (department.trim()) {
      const key = department.trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (key === "all" || key === "all_departments") departmentKey = null;
      else if (FALLBACK_DEPT_KEYS.has(key)) departmentKey = key;
      else {
        // Pass through — server accepts hotel custom department keys.
        departmentKey = key || department.trim();
      }
    }

    const roleNorm = String(role || "staff").trim().toLowerCase();
    rows.push({
      email,
      name: name.trim() || undefined,
      departmentKey,
      role: roleNorm === "manager" || roleNorm === "mgr" ? "manager" : "staff",
    });
  }

  return { rows, errors };
}

export default function StaffPanel({ hotel }: { hotel: Hotel }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [depts, setDepts] = useState<HotelDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState<string>(ALL_DEPTS);
  const [role, setRole] = useState("staff");
  const [busy, setBusy] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkReport, setBulkReport] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("talkstay-staff", {
      body: { hotelId: hotel.id, ...body },
    });
    let bodyErr = (data as { error?: string } | null)?.error;
    if (!bodyErr && error) {
      try {
        const parsed = await (error as any)?.context?.json?.();
        if (parsed?.error) bodyErr = String(parsed.error);
      } catch { /* ignore */ }
    }
    if (error || bodyErr) {
      throw new Error(bodyErr || error?.message || "Staff request failed");
    }
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [data, deptRes] = await Promise.all([
        call({ action: "list" }),
        supabase
          .from("ts_departments")
          .select("key, display_name, is_active")
          .eq("hotel_id", hotel.id)
          .order("display_name"),
      ]);
      setStaff(((data as any)?.staff as StaffRow[]) ?? []);
      const rows = ((deptRes.data ?? []) as HotelDept[]);
      // Prefer active departments; if empty fall back to built-in list.
      const active = rows.filter((d) => d.is_active);
      setDepts(active.length ? active : DEPARTMENTS.map((d) => ({
        key: d.key, display_name: d.display_name, is_active: true,
      })));
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't load staff");
      setStaff([]);
      setDepts(DEPARTMENTS.map((d) => ({ key: d.key, display_name: d.display_name, is_active: true })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hotel.id]);

  const deptOptions = useMemo(() => {
    const map = new Map(depts.map((d) => [d.key, d.display_name]));
    // Ensure currently assigned keys still appear even if inactive.
    for (const s of staff) {
      if (s.department_key && !map.has(s.department_key)) {
        map.set(s.department_key, s.department_key.replace(/_/g, " "));
      }
    }
    return [...map.entries()]
      .map(([key, display_name]) => ({ key, display_name }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [depts, staff]);

  const parsedPreview = useMemo(() => parseStaffRoster(bulkText), [bulkText]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter a staff email first.");
      return;
    }
    setBusy(true);
    try {
      const data = await call({
        action: "invite",
        email: email.trim(),
        name: name.trim() || null,
        departmentKey: dept === ALL_DEPTS ? null : dept,
        role,
      });
      const res = data as any;
      if (res?.emailSent || res?.invited) {
        toast.success(`Invite email sent to ${res.email}.`);
      } else if (res?.emailError) {
        toast.warning(`${res.email} was added to staff, but email failed: ${res.emailError}`);
      } else {
        toast.success(`${res.email} added to staff.`);
      }
      setEmail(""); setName("");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to invite");
    } finally {
      setBusy(false);
    }
  };

  const runBulk = async () => {
    const { rows, errors } = parseStaffRoster(bulkText);
    if (!rows.length) {
      toast.error(errors[0] ?? "No valid rows to import.");
      return;
    }
    if (rows.length > 100) {
      toast.error("Max 100 staff per import. Split the list and try again.");
      return;
    }
    setBulkBusy(true);
    setBulkReport(null);
    try {
      const data = await call({ action: "invite_bulk", rows });
      const res = data as any;
      const invited = res.invited ?? 0;
      const added = res.added ?? 0;
      const failed = res.failed ?? 0;
      const failLines = ((res.results ?? []) as any[])
        .filter((r) => !r.ok)
        .slice(0, 8)
        .map((r) => `${r.email}: ${r.error}`)
        .join("\n");
      setBulkReport(
        `Processed ${res.total} · ${invited} invite email${invited === 1 ? "" : "s"} sent · ${added} existing account${added === 1 ? "" : "s"} linked` +
        (failed ? ` · ${failed} failed` : "") +
        (errors.length ? `\nParse notes: ${errors.slice(0, 5).join("; ")}` : "") +
        (failLines ? `\n${failLines}` : ""),
      );
      toast.success(
        failed
          ? `Imported with ${failed} error${failed === 1 ? "" : "s"} — check the summary.`
          : `Team onboarded: ${invited} invited, ${added} linked.`,
      );
      setBulkText("");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Bulk import failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const onRosterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      let text: string;
      if (isExcelFile(file)) {
        text = await excelFileToCsv(file);
      } else {
        text = await file.text();
      }
      setBulkText(text);
      setBulkOpen(true);
      const preview = parseStaffRoster(text);
      toast.message(`Loaded ${file.name}`, {
        description: preview.rows.length
          ? `${preview.rows.length} staff ready to invite — review, then send.`
          : "Check the columns match name / email / department / role.",
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't read that file. Try .xlsx, .xls, or CSV.");
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "talkstay-staff-import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (row: StaffRow) => {
    if (!confirm(`Remove ${row.email}?`)) return;
    try {
      await call({ action: "remove", staffId: row.id });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't remove");
    }
  };

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const resendInvite = async (row: StaffRow) => {
    if (!row.email || row.email === "(unknown)") {
      toast.error("No email on this staff account.");
      return;
    }
    setResendingId(row.id);
    try {
      const data = await call({ action: "resend_invite", staffId: row.id });
      toast.success(`Invitation email resent to ${(data as any)?.email ?? row.email}.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't resend invitation email");
    } finally {
      setResendingId(null);
    }
  };

  const update = async (row: StaffRow, patch: { name?: string; role?: string; departmentKey?: string | null }) => {
    setSavingId(row.id);
    try {
      await call({ action: "update", staffId: row.id, ...patch });
      setStaff((prev) => prev.map((s) => s.id === row.id ? {
        ...s,
        ...(patch.name !== undefined ? { name: patch.name || null } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        ...(patch.departmentKey !== undefined ? { department_key: patch.departmentKey } : {}),
      } : s));
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const saveName = (row: StaffRow) => {
    const next = (drafts[row.id] ?? row.name ?? "").trim();
    if (next === (row.name ?? "")) return;
    update(row, { name: next });
  };

  return (
    <div className="space-y-5">
      <LiveShareCard hotel={hotel} />

      <form onSubmit={invite} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah" className="w-36" />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourproperty.com" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Department</label>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPTS}>All departments</SelectItem>
              {deptOptions.map((d) => <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={busy} className="bg-violet-600 hover:bg-violet-700">
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
          Invite staff
        </Button>
      </form>

      <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bulk import (CSV / Excel)</p>
            <p className="text-xs text-muted-foreground">
              Columns: name, email, department, role — max 100 per import. Each person gets an invite email.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onRosterFile}
          />
          <Button type="button" size="sm" variant="outline" onClick={downloadSample}>
            <Download className="mr-1 h-3.5 w-3.5" /> Sample CSV
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" /> Upload roster
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={() => setBulkOpen((o) => !o)}
          >
            {bulkOpen || bulkText.trim() ? "Hide paste" : "Or paste rows"}
          </Button>
        </div>

        {(bulkOpen || !!bulkText.trim()) && (
          <div className="mt-3 space-y-3">
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={6}
              placeholder={SAMPLE_CSV.trim()}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {bulkText.trim()
                  ? `${parsedPreview.rows.length} ready${parsedPreview.errors.length ? ` · ${parsedPreview.errors.length} line issue(s)` : ""}`
                  : "Upload a roster or paste rows to preview."}
              </p>
              <Button type="button" size="sm" disabled={bulkBusy || !parsedPreview.rows.length} onClick={runBulk}>
                {bulkBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
                Send {parsedPreview.rows.length || ""} invite{parsedPreview.rows.length === 1 ? "" : "s"}
              </Button>
            </div>
            {parsedPreview.rows.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-xl border bg-background/70 text-xs">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted/80 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5">Name</th>
                      <th className="px-3 py-1.5">Email</th>
                      <th className="px-3 py-1.5">Department</th>
                      <th className="px-3 py-1.5">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreview.rows.slice(0, 40).map((r) => (
                      <tr key={r.email} className="border-t">
                        <td className="px-3 py-1">{r.name || "—"}</td>
                        <td className="px-3 py-1">{r.email}</td>
                        <td className="px-3 py-1">{r.departmentKey ?? "All"}</td>
                        <td className="px-3 py-1 capitalize">{r.role ?? "staff"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedPreview.rows.length > 40 && (
                  <p className="border-t px-3 py-1.5 text-muted-foreground">…and {parsedPreview.rows.length - 40} more</p>
                )}
              </div>
            )}
            {bulkReport && (
              <pre className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">{bulkReport}</pre>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No staff yet. Invite someone above, or upload a roster.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Invite</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const isOwner = s.role === "owner";
                return (
                <tr key={s.id} className="border-t align-middle">
                  <td className="px-4 py-3">
                    <Input
                      className="h-8 w-36"
                      value={drafts[s.id] ?? s.name ?? ""}
                      placeholder="Add name"
                      disabled={isOwner || savingId === s.id}
                      onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                      onBlur={() => saveName(s)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={s.department_key ?? ALL_DEPTS}
                      disabled={isOwner || s.role === "manager" || savingId === s.id}
                      onValueChange={(v) => update(s, { departmentKey: v === ALL_DEPTS ? null : v })}
                    >
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_DEPTS}>All departments</SelectItem>
                        {deptOptions.map((d) => <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <span className="capitalize text-muted-foreground">Owner</span>
                    ) : (
                      <Select value={s.role} disabled={savingId === s.id} onValueChange={(v) => update(s, { role: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {resendingId === s.id ? (
                        <span className="inline-flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
                        </span>
                      ) : savingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          {s.email && s.email !== "(unknown)" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs"
                              title={`Resend invitation to ${s.email}`}
                              aria-label={`Resend invitation to ${s.email}`}
                              onClick={() => resendInvite(s)}
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Resend invite
                            </Button>
                          )}
                          {!isOwner && (
                            <Button size="sm" variant="ghost" onClick={() => remove(s)} aria-label={`Remove ${s.email}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p><strong className="text-foreground">Staff</strong> see only their department's live queue.</p>
        <p className="mt-1">
          <strong className="text-foreground">Manager</strong> is your sub-manager: full access to every
          department's queue and Insights, so they can coordinate the floor while you're away and you can
          check in whenever you like. Promote anyone (e.g. front desk) by switching their role to Manager —
          it takes effect the next time they open the app.
        </p>
        <p className="mt-1">
          <strong className="text-foreground">Bulk import</strong> and single invites send each person a login email
          (set password or magic link). Missed it? Use <strong className="text-foreground">Resend invite</strong> on their row.
        </p>
      </div>
    </div>
  );
}
