import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, escapeHtml } from "../_shared/email.ts";

const PUBLIC_BASE_URL = "https://talkstay.talkweb.io";
const MAX_BULK = 100;

const DEPT_ALIASES: Record<string, string> = {
  housekeeping: "housekeeping",
  laundry: "laundry",
  kitchen: "kitchen",
  bar: "bar",
  maintenance: "maintenance",
  concierge: "concierge",
  front_desk: "front_desk",
  "front desk": "front_desk",
  frontdesk: "front_desk",
  reception: "front_desk",
  duty_manager: "duty_manager",
  "duty manager": "duty_manager",
  all: "",
  "all departments": "",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizeDept(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  const spaced = String(raw).trim().toLowerCase().replace(/[_-]+/g, " ");
  const hit = DEPT_ALIASES[key] ?? DEPT_ALIASES[spaced];
  if (hit === "") return null;
  if (hit) return hit;
  // Already a known slug?
  if (["housekeeping", "laundry", "kitchen", "bar", "maintenance", "concierge", "front_desk", "duty_manager"].includes(key)) {
    return key;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const { action, hotelId, email, name, departmentKey, role, staffId, slug, rows } = body;

    // ------- public_branding (NO auth) -------
    if (action === "public_branding") {
      const clean = String(slug ?? "").trim().toLowerCase().slice(0, 100);
      if (!clean) return json({ error: "slug required" }, 400);
      const { data: h } = await admin
        .from("ts_hotels").select("name, slug, branding").eq("slug", clean).maybeSingle();
      if (!h) return json({ branding: null });
      const b = (h.branding ?? {}) as Record<string, any>;
      return json({
        branding: {
          name: h.name, slug: h.slug,
          logoUrl: b.logo_url ?? null,
          primaryColor: b.primary_color ?? null,
        },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const caller = userData.user;

    if (!hotelId) return json({ error: "hotelId required" }, 400);

    const { data: hotel } = await admin
      .from("ts_hotels").select("id, user_id, name, slug, branding").eq("id", hotelId).maybeSingle();
    if (!hotel) return json({ error: "Not found" }, 404);
    const isOwner = hotel.user_id === caller.id;
    let isManager = false;
    if (!isOwner) {
      const { data: me } = await admin
        .from("ts_staff").select("role, status")
        .eq("hotel_id", hotelId).eq("user_id", caller.id).eq("status", "active").maybeSingle();
      isManager = me?.role === "manager" || me?.role === "owner";
    }
    if (!isOwner && !isManager) return json({ error: "Forbidden" }, 403);

    const isOwnerRow = async (sid: string) => {
      const { data } = await admin.from("ts_staff").select("user_id").eq("id", sid).eq("hotel_id", hotelId).maybeSingle();
      return !!data && data.user_id === hotel.user_id;
    };
    const normalizeRole = (r: unknown) => {
      const v = String(r ?? "staff").trim().toLowerCase();
      if (v === "owner" && !isOwner) return "manager";
      if (v === "manager" || v === "mgr") return "manager";
      if (v === "owner") return "owner";
      return "staff";
    };

    // Cache Auth users once for bulk lookups (listUsers is expensive per row).
    let emailToUserId: Map<string, string> | null = null;
    const loadEmailIndex = async () => {
      if (emailToUserId) return emailToUserId;
      const map = new Map<string, string>();
      for (let page = 1; page <= 20; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        for (const u of data?.users ?? []) {
          if (u.email) map.set(u.email.toLowerCase(), u.id);
        }
        if (!data?.users || data.users.length < 200) break;
      }
      emailToUserId = map;
      return map;
    };

    const { data: callerStaff } = await admin.from("ts_staff")
      .select("name").eq("hotel_id", hotelId).eq("user_id", caller.id).maybeSingle();
    const inviterName = callerStaff?.name || caller.email || "A manager";

    const inviteOne = async (opts: {
      email: string; name?: string | null; departmentKey?: string | null; role?: string;
    }): Promise<{
      email: string; ok: boolean; invited?: boolean; added?: boolean;
      emailSent?: boolean; emailError?: string; error?: string;
    }> => {
      const cleanEmail = String(opts.email ?? "").trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { email: cleanEmail || "(blank)", ok: false, error: "invalid email" };
      }
      const staffName = (opts.name ? String(opts.name).trim() : "") || null;
      const dept = opts.departmentKey === undefined
        ? null
        : (opts.departmentKey === null ? null : normalizeDept(opts.departmentKey));
      const department_key = dept;
      const redirectTo = `${PUBLIC_BASE_URL}/app?type=invite&property=${encodeURIComponent(hotel.slug ?? "")}`;

      const forceRedirect = (actionLink: string) => {
        try {
          const u = new URL(actionLink);
          u.searchParams.set("redirect_to", redirectTo);
          return u.toString();
        } catch {
          return actionLink;
        }
      };

      const sendInviteEmail = async (actionLink: string): Promise<{ sent: boolean; reason?: string }> => {
        const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
        if (!key) return { sent: false, reason: "Email sending is not configured (RESEND_API_KEY)." };
        if (!actionLink) return { sent: false, reason: "Could not generate invite link." };
        const deptLabel = department_key ? department_key.replace(/_/g, " ") : "";
        const html = renderEmail({
          hotelName: hotel.name ?? "Your hotel",
          logoUrl: (hotel.branding as any)?.logo_url,
          accentColor: (hotel.branding as any)?.primary_color,
          heading: `You've been invited to join ${hotel.name ?? "the"} team`,
          bodyHtml: `
              <p style="margin:0 0 14px;">${escapeHtml(inviterName)} added you to their TalkStay team${deptLabel ? ` (${escapeHtml(deptLabel)})` : ""}. Open the link below to set your password and join the dashboard.</p>
              <p style="margin:0 0 14px;font-size:13px;color:#64748b;">This link opens TalkStay at talkstay.talkweb.io — not the TalkWeb dashboard.</p>`,
          cta: { label: "Open TalkStay & set password", url: forceRedirect(actionLink) },
          footerNote: "If you weren't expecting this, you can safely ignore this email.",
        });
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "TalkStay <notifications@talkweb.io>",
              to: cleanEmail,
              subject: `You've been invited to join ${hotel.name ?? "a property"} on TalkStay`,
              html,
            }),
          });
          if (!r.ok) {
            const t = await r.text().catch(() => "");
            return { sent: false, reason: `Email provider error (${r.status}): ${t.slice(0, 160)}` };
          }
          return { sent: true };
        } catch (e) {
          return { sent: false, reason: e instanceof Error ? e.message : "Email send failed" };
        }
      };

      const index = await loadEmailIndex();
      let userId: string | null = index.get(cleanEmail) ?? null;
      let actionLink = "";
      let isNewUser = false;

      if (!userId) {
        const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
          type: "invite",
          email: cleanEmail,
          options: {
            data: staffName ? { full_name: staffName } : undefined,
            redirectTo,
          },
        });

        if (linkData?.user) {
          userId = linkData.user.id;
          index.set(cleanEmail, userId);
          isNewUser = true;
          actionLink = linkData.properties?.action_link ?? "";
        } else {
          // Often: email already registered in the shared TalkWeb project.
          const msg = (lErr?.message || "").toLowerCase();
          emailToUserId = null;
          const refreshed = await loadEmailIndex();
          userId = refreshed.get(cleanEmail) ?? null;

          if (!userId && (msg.includes("already") || msg.includes("registered") || msg.includes("exists"))) {
            const { data: created } = await admin.auth.admin.createUser({
              email: cleanEmail,
              email_confirm: true,
              user_metadata: staffName ? { full_name: staffName } : undefined,
            });
            userId = created?.user?.id ?? null;
            isNewUser = !!userId;
          }

          if (!userId) {
            return { email: cleanEmail, ok: false, error: lErr?.message ?? "Could not create user" };
          }
        }
      }

      // Always email — including people who already have a TalkWeb/TalkStay account.
      // Previously we only emailed brand-new users, so existing accounts got silent adds.
      if (!actionLink) {
        const { data: mag, error: magErr } = await admin.auth.admin.generateLink({
          type: isNewUser ? "invite" : "magiclink",
          email: cleanEmail,
          options: {
            data: staffName ? { full_name: staffName } : undefined,
            redirectTo,
          },
        });
        actionLink = mag?.properties?.action_link ?? "";
        if (!actionLink && magErr) {
          // Fall back: still try a magic link if invite failed for an existing user.
          const { data: mag2 } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email: cleanEmail,
            options: { redirectTo },
          });
          actionLink = mag2?.properties?.action_link ?? "";
        }
      }

      const mail = await sendInviteEmail(actionLink);

      const { error: sErr } = await admin.from("ts_staff").upsert(
        {
          hotel_id: hotelId,
          user_id: userId,
          department_key,
          role: normalizeRole(opts.role),
          status: "active",
          name: staffName,
        },
        { onConflict: "hotel_id,user_id,department_key" }
      );
      if (sErr) return { email: cleanEmail, ok: false, error: sErr.message };
      return {
        email: cleanEmail,
        ok: true,
        invited: mail.sent,
        added: !isNewUser,
        emailSent: mail.sent,
        emailError: mail.sent ? undefined : mail.reason,
      };
    };

    // ------- list -------
    if (action === "list") {
      const { data: staff } = await admin
        .from("ts_staff")
        .select("id, user_id, department_key, role, status, name, created_at")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: true });

      const rowsOut = await Promise.all(
        (staff ?? []).map(async (s: any) => {
          const { data } = await admin.auth.admin.getUserById(s.user_id);
          return { ...s, email: data?.user?.email ?? "(unknown)" };
        })
      );
      return json({ staff: rowsOut });
    }

    // ------- invite (single) -------
    if (action === "invite") {
      if (!email) return json({ error: "email required" }, 400);
      const result = await inviteOne({ email, name, departmentKey, role });
      if (!result.ok) return json({ error: result.error ?? "Failed" }, 400);
      return json({
        ok: true,
        invited: !!result.invited,
        email: result.email,
        emailSent: !!(result as any).emailSent,
        emailError: (result as any).emailError ?? null,
        added: !!(result as any).added,
      });
    }

    // ------- resend_invite: re-send set-password / magic-link email to existing staff -------
    if (action === "resend_invite") {
      if (!staffId) return json({ error: "staffId required" }, 400);
      const { data: row } = await admin.from("ts_staff")
        .select("id, user_id, name, department_key, role")
        .eq("id", staffId).eq("hotel_id", hotelId).maybeSingle();
      if (!row) return json({ error: "Staff member not found" }, 404);
      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      const staffEmail = authUser?.user?.email?.trim().toLowerCase();
      if (!staffEmail) return json({ error: "No email on this staff account" }, 400);

      const result = await inviteOne({
        email: staffEmail,
        name: name !== undefined ? name : row.name,
        departmentKey: departmentKey !== undefined ? departmentKey : row.department_key,
        role: role !== undefined ? role : row.role,
      });
      if (!result.ok) return json({ error: result.error ?? "Failed to resend" }, 400);
      if (!result.emailSent) {
        return json({
          error: result.emailError ?? "Could not send the invite email",
          email: result.email,
          emailSent: false,
        }, 400);
      }
      return json({
        ok: true,
        email: result.email,
        emailSent: true,
        resent: true,
      });
    }

    // ------- invite_bulk -------
    if (action === "invite_bulk") {
      if (!Array.isArray(rows) || rows.length === 0) {
        return json({ error: "rows required (array of { name?, email, departmentKey?, role? })" }, 400);
      }
      if (rows.length > MAX_BULK) {
        return json({ error: `Max ${MAX_BULK} staff per import. Split your list and try again.` }, 400);
      }

      // De-dupe by email (last wins) so a pasted sheet with duplicates doesn't double-invite.
      const byEmail = new Map<string, { email: string; name?: string | null; departmentKey?: string | null; role?: string }>();
      for (const r of rows) {
        const em = String(r?.email ?? "").trim().toLowerCase();
        if (!em) continue;
        byEmail.set(em, {
          email: em,
          name: r?.name ?? null,
          departmentKey: r?.departmentKey ?? r?.department ?? null,
          role: r?.role ?? "staff",
        });
      }

      const results: { email: string; ok: boolean; invited?: boolean; added?: boolean; error?: string }[] = [];
      for (const row of byEmail.values()) {
        results.push(await inviteOne(row));
      }

      const invited = results.filter((r) => r.ok && r.invited).length;
      const added = results.filter((r) => r.ok && r.added).length;
      const failed = results.filter((r) => !r.ok).length;
      return json({ ok: true, total: results.length, invited, added, failed, results });
    }

    // ------- update -------
    if (action === "update") {
      if (!staffId) return json({ error: "staffId required" }, 400);
      if (!isOwner && (await isOwnerRow(staffId))) return json({ error: "Only the owner can edit the owner." }, 403);
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = (String(name).trim() || null);
      if (role !== undefined) patch.role = normalizeRole(role);
      if (departmentKey !== undefined) {
        patch.department_key = departmentKey == null || departmentKey === ""
          ? null
          : normalizeDept(departmentKey);
      }
      if (Object.keys(patch).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await admin.from("ts_staff").update(patch).eq("id", staffId).eq("hotel_id", hotelId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ------- remove -------
    if (action === "remove") {
      if (!staffId) return json({ error: "staffId required" }, 400);
      if (await isOwnerRow(staffId)) return json({ error: "The owner can't be removed." }, 403);
      const { error } = await admin.from("ts_staff").delete().eq("id", staffId).eq("hotel_id", hotelId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
