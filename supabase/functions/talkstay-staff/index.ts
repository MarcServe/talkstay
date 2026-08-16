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

function normalizeDept(raw: unknown, hotelKeys?: Set<string> | null): string | null {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
  const spaced = String(raw).trim().toLowerCase().replace(/[_-]+/g, " ");
  const hit = DEPT_ALIASES[key] ?? DEPT_ALIASES[spaced];
  if (hit === "") return null;
  if (hit) return hit;
  // Already a known default slug?
  if (["housekeeping", "laundry", "kitchen", "bar", "maintenance", "concierge", "front_desk", "duty_manager"].includes(key)) {
    return key;
  }
  // Custom hotel department (e.g. spa, pool) — keep slug if it exists for this hotel.
  if (hotelKeys?.has(key)) return key;
  // Allow display-name match against hotel keys via simple slug of the raw string.
  if (hotelKeys?.has(key.replace(/[^a-z0-9_]/g, ""))) return key;
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

    // ------- redeem_invite (NO auth): exchange one-time invite token → session -------
    // Admin-generated links are not PKCE-compatible; the SPA redeems token_hash here
    // and then calls setSession so "Join the team" has a real auth session.
    if (action === "redeem_invite") {
      const tokenHash = String(body.token_hash ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const token = String(body.token ?? "").trim();
      if (!tokenHash && !(email && token)) {
        return json({ error: "token_hash or email+token required" }, 400);
      }
      const preferred = String(body.otp_type ?? "invite").toLowerCase();
      const types = [...new Set([
        preferred,
        "invite",
        "magiclink",
        "email",
        "signup",
        "recovery",
      ])];

      const anon = Deno.env.get("SUPABASE_ANON_KEY") || SERVICE_KEY;
      let lastErr = "Invite link invalid or expired";

      for (const type of types) {
        const payload: Record<string, string> = { type };
        if (tokenHash) payload.token_hash = tokenHash;
        else {
          payload.email = email;
          payload.token = token;
        }
        const r = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anon,
            Authorization: `Bearer ${anon}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => ({} as Record<string, unknown>));
        if (r.ok && data?.access_token && data?.refresh_token) {
          return json({
            ok: true,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user ?? null,
          });
        }
        const msg = String((data as any)?.msg || (data as any)?.error_description || (data as any)?.error || "");
        if (msg) lastErr = msg;
      }
      return json({ error: lastErr }, 400);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const caller = userData.user;

    if (!hotelId) return json({ error: "hotelId required" }, 400);

    const { data: hotel } = await admin
      .from("ts_hotels").select("id, user_id, name, slug, branding, default_language").eq("id", hotelId).maybeSingle();
    if (!hotel) return json({ error: "Not found" }, 404);

    // Active + inactive keys so staff can still be assigned to a recently toggled dept.
    const { data: hotelDepts } = await admin
      .from("ts_departments").select("key").eq("hotel_id", hotelId);
    const hotelDeptKeys = new Set(
      ((hotelDepts ?? []) as { key: string }[]).map((d) => String(d.key).toLowerCase()),
    );
    const nd = (raw: unknown) => normalizeDept(raw, hotelDeptKeys);

    const isOwner = hotel.user_id === caller.id;
    let callerStaff: { role: string; status: string; name: string | null; department_key: string | null } | null = null;
    {
      const { data: me } = await admin
        .from("ts_staff").select("role, status, name, department_key")
        .eq("hotel_id", hotelId).eq("user_id", caller.id).eq("status", "active").maybeSingle();
      callerStaff = me ?? null;
    }
    const isDutyManager = callerStaff?.department_key === "duty_manager";
    const isFrontDesk = callerStaff?.department_key === "front_desk";
    // Property manager = Manager + All departments (not Duty Manager).
    const isPropertyManager = !!callerStaff && (
      callerStaff.role === "owner"
      || (callerStaff.role === "manager" && !callerStaff.department_key)
    );
    const isDeptManager = !!callerStaff
      && callerStaff.role === "manager"
      && !!callerStaff.department_key
      && !isDutyManager
      && !isFrontDesk;
    // Owners + property managers manage the full roster. Department managers invite within their team.
    // Duty Manager does not manage staff — they only work the queues.
    const canManageStaff = isOwner || isPropertyManager || isDeptManager;
    // Department staff can log orders and coordinate on tickets; invite/edit stay owner/property/dept manager.
    const OPS_STAFF_ACTIONS = new Set([
      "create_request",
      "open_for_room",
      "add_note",
      "forward_request",
      "assign_handler",
      "list_handlers",
    ]);
    const isActiveStaff = isOwner || !!callerStaff;
    if (!canManageStaff && !(isActiveStaff && OPS_STAFF_ACTIONS.has(String(action)))) {
      return json({ error: "Forbidden" }, 403);
    }

    const canAccessRequestDept = (deptKey: string) => {
      if (isOwner || isPropertyManager) return true;
      if (!callerStaff) return false;
      if (!callerStaff.department_key) return true;
      if (isFrontDesk || isDutyManager) return true;
      if (isDeptManager) return callerStaff.department_key === deptKey;
      return callerStaff.department_key === deptKey;
    };
    const actorLabel = () => callerStaff?.name || caller.email || "staff";

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
        : (opts.departmentKey === null ? null : nd(opts.departmentKey));
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

      /** Prefer a TalkStay deep link with token_hash. Admin generateLink action URLs
       *  redirect with a PKCE ?code= that this browser never started — so
       *  exchangeCodeForSession fails and Join the team shows "Auth session missing". */
      const buildJoinUrl = (hashedToken: string, otpType: string, actionLink: string) => {
        if (hashedToken) {
          const q = new URLSearchParams({
            type: "invite",
            property: hotel.slug ?? "",
            token_hash: hashedToken,
            otp_type: otpType === "magiclink" || otpType === "email" ? "magiclink" : "invite",
            email: cleanEmail,
          });
          return `${PUBLIC_BASE_URL}/app?${q.toString()}`;
        }
        return actionLink ? forceRedirect(actionLink) : "";
      };

      const sendInviteEmail = async (ctaUrl: string): Promise<{ sent: boolean; reason?: string }> => {
        const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
        if (!key) return { sent: false, reason: "Email sending is not configured (RESEND_API_KEY)." };
        if (!ctaUrl) return { sent: false, reason: "Could not generate invite link." };
        const deptLabel = department_key ? department_key.replace(/_/g, " ") : "";
        const html = renderEmail({
          hotelName: hotel.name ?? "Your hotel",
          logoUrl: (hotel.branding as any)?.logo_url,
          accentColor: (hotel.branding as any)?.primary_color,
          heading: `You've been invited to join ${hotel.name ?? "the"} team`,
          bodyHtml: `
              <p style="margin:0 0 14px;">${escapeHtml(inviterName)} added you to their TalkStay team${deptLabel ? ` (${escapeHtml(deptLabel)})` : ""}. Open the link below to set your password and join the dashboard.</p>
              <p style="margin:0 0 14px;font-size:13px;color:#64748b;">This link opens TalkStay at talkstay.talkweb.io — not the TalkWeb dashboard.</p>`,
          cta: { label: "Open TalkStay & set password", url: ctaUrl },
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
      let hashedToken = "";
      let otpType = "invite";
      let isNewUser = false;

      const takeLinkProps = (props: { action_link?: string; hashed_token?: string; verification_type?: string } | null | undefined, fallbackOtp: string) => {
        if (!props) return;
        if (props.action_link) actionLink = props.action_link;
        if (props.hashed_token) {
          hashedToken = props.hashed_token;
          otpType = props.verification_type || fallbackOtp;
        }
      };

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
          takeLinkProps(linkData.properties as any, "invite");
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

      // Always mint a fresh email token for this send/resend. Prefer magiclink for
      // anyone who already had an account — invite tokens often fail once confirmed.
      // Brand-new users created via generateLink(invite) already have hashedToken.
      if (!hashedToken || !isNewUser) {
        const linkType = "magiclink";
        const { data: mag, error: magErr } = await admin.auth.admin.generateLink({
          type: linkType,
          email: cleanEmail,
          options: {
            data: staffName ? { full_name: staffName } : undefined,
            redirectTo,
          },
        });
        takeLinkProps(mag?.properties as any, linkType);
        if (!hashedToken && magErr) {
          const { data: mag2 } = await admin.auth.admin.generateLink({
            type: "invite",
            email: cleanEmail,
            options: {
              data: staffName ? { full_name: staffName } : undefined,
              redirectTo,
            },
          });
          takeLinkProps(mag2?.properties as any, "invite");
        }
      }

      const mail = await sendInviteEmail(buildJoinUrl(hashedToken, otpType, actionLink));

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
      let q = admin
        .from("ts_staff")
        .select("id, user_id, department_key, role, status, name, created_at")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: true });
      if (isDeptManager && callerStaff?.department_key) {
        q = q.eq("department_key", callerStaff.department_key);
      }
      const { data: staff } = await q;

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
      let inviteDept = departmentKey;
      let inviteRole = role;
      if (isDeptManager) {
        inviteDept = callerStaff!.department_key;
        inviteRole = "staff";
      }
      const result = await inviteOne({ email, name, departmentKey: inviteDept, role: inviteRole });
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
      if (isDeptManager) {
        return json({ error: "Department managers invite one person at a time for their own team." }, 403);
      }
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

    // ------- open_for_room: open tickets for a room (duplicate warning) -------
    if (action === "open_for_room") {
      const roomId = String(body.roomId ?? "").trim();
      if (!roomId) return json({ error: "roomId required" }, 400);
      let open: any[] | null = null;
      {
        const full = await admin.from("ts_service_requests")
          .select("id, department_key, summary, summary_staff, status, priority, source, created_at, classification_method")
          .eq("hotel_id", hotelId).eq("room_id", roomId)
          .in("status", ["new", "accepted", "in_progress", "on_the_way", "reopened", "escalated"])
          .order("created_at", { ascending: false })
          .limit(20);
        if (full.error?.message?.includes("source")) {
          const legacy = await admin.from("ts_service_requests")
            .select("id, department_key, summary, summary_staff, status, priority, created_at, classification_method")
            .eq("hotel_id", hotelId).eq("room_id", roomId)
            .in("status", ["new", "accepted", "in_progress", "on_the_way", "reopened", "escalated"])
            .order("created_at", { ascending: false })
            .limit(20);
          open = (legacy.data ?? []).map((r: any) => ({ ...r, source: r.classification_method }));
        } else {
          open = full.data ?? [];
        }
      }
      return json({ ok: true, open: open ?? [] });
    }

    // ------- list_handlers: active staff for "who's handling" picker -------
    if (action === "list_handlers") {
      const { data: rows, error } = await admin.from("ts_staff")
        .select("id, name, department_key, role, user_id")
        .eq("hotel_id", hotelId)
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) return json({ error: error.message }, 400);
      const staff = await Promise.all((rows ?? []).map(async (s: any) => {
        let email: string | null = null;
        try {
          const { data: u } = await admin.auth.admin.getUserById(s.user_id);
          email = u?.user?.email ?? null;
        } catch { /* ignore */ }
        return {
          id: s.id,
          name: s.name || email || "Staff",
          email,
          department_key: s.department_key,
          role: s.role,
          user_id: s.user_id,
        };
      }));
      return json({ ok: true, staff });
    }

    // ------- add_note: internal staff note (not shown to the guest) -------
    if (action === "add_note") {
      const requestId = String(body.requestId ?? "").trim();
      const note = String(body.note ?? "").trim().slice(0, 500);
      const notify = body.notify !== false;
      if (!requestId) return json({ error: "requestId required" }, 400);
      if (!note) return json({ error: "note required" }, 400);

      const { data: req } = await admin.from("ts_service_requests")
        .select("id, hotel_id, department_key, status")
        .eq("id", requestId).eq("hotel_id", hotelId).maybeSingle();
      if (!req) return json({ error: "Request not found" }, 404);
      if (!canAccessRequestDept(req.department_key)) {
        return json({ error: "You don't have access to this request." }, 403);
      }

      const who = actorLabel();
      await admin.from("ts_request_events").insert({
        request_id: requestId,
        status: "staff_note",
        actor_type: "staff",
        actor_id: caller.id,
        note: `${who}: ${note}`,
      });
      await admin.from("ts_service_requests")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (notify) {
        admin.functions.invoke("talkstay-notify", {
          body: { requestId, event: "staff_note", note },
        }).catch(() => {});
      }
      return json({ ok: true });
    }

    // ------- assign_handler: mark who is handling this order -------
    if (action === "assign_handler") {
      const requestId = String(body.requestId ?? "").trim();
      const handlerName = String(body.handlerName ?? "").trim().slice(0, 120);
      const staffRowId = body.staffId ? String(body.staffId).trim() : "";
      if (!requestId) return json({ error: "requestId required" }, 400);

      const { data: req } = await admin.from("ts_service_requests")
        .select("id, hotel_id, department_key, status")
        .eq("id", requestId).eq("hotel_id", hotelId).maybeSingle();
      if (!req) return json({ error: "Request not found" }, 404);
      if (!canAccessRequestDept(req.department_key)) {
        return json({ error: "You don't have access to this request." }, 403);
      }

      let label = handlerName;
      let assignedUserId: string | null = null;
      if (staffRowId) {
        const { data: s } = await admin.from("ts_staff")
          .select("id, name, user_id")
          .eq("id", staffRowId).eq("hotel_id", hotelId).eq("status", "active").maybeSingle();
        if (!s) return json({ error: "Staff member not found" }, 404);
        let email: string | null = null;
        if (!s.name && s.user_id) {
          try {
            const { data: u } = await admin.auth.admin.getUserById(s.user_id);
            email = u?.user?.email ?? null;
          } catch { /* ignore */ }
        }
        label = s.name || email || handlerName || "Staff";
        assignedUserId = s.user_id ?? null;
      }
      if (!label) return json({ error: "Pick a teammate or type a name." }, 400);

      const who = actorLabel();
      await admin.from("ts_service_requests").update({
        assigned_staff_id: assignedUserId,
        updated_at: new Date().toISOString(),
      }).eq("id", requestId);

      await admin.from("ts_request_events").insert({
        request_id: requestId,
        status: "assigned",
        actor_type: "staff",
        actor_id: caller.id,
        note: `${who} marked ${label} as handling`,
      });

      admin.functions.invoke("talkstay-notify", {
        body: { requestId, event: "assigned", note: `${label} is handling this` },
      }).catch(() => {});

      return json({ ok: true, handlerName: label });
    }

    // ------- forward_request: move ticket to another department -------
    if (action === "forward_request") {
      const requestId = String(body.requestId ?? "").trim();
      const toDept = nd(body.departmentKey ?? body.toDepartment);
      const note = String(body.note ?? "").trim().slice(0, 500);
      if (!requestId) return json({ error: "requestId required" }, 400);
      if (!toDept) return json({ error: "departmentKey required" }, 400);

      const { data: req } = await admin.from("ts_service_requests")
        .select("id, hotel_id, department_key, status, needs_triage")
        .eq("id", requestId).eq("hotel_id", hotelId).maybeSingle();
      if (!req) return json({ error: "Request not found" }, 404);
      if (!canAccessRequestDept(req.department_key)) {
        return json({ error: "You don't have access to this request." }, 403);
      }
      if (["completed", "guest_confirmed", "cancelled"].includes(req.status)) {
        return json({ error: "Closed requests can't be forwarded." }, 400);
      }
      if (req.department_key === toDept) {
        return json({ error: "Already with that department." }, 400);
      }

      const DEPT_LABEL: Record<string, string> = {
        housekeeping: "Housekeeping", laundry: "Laundry", kitchen: "Kitchen", bar: "Bar",
        maintenance: "Maintenance", concierge: "Concierge", front_desk: "Front Desk",
        duty_manager: "Duty Manager",
      };
      const fromLabel = DEPT_LABEL[req.department_key] ?? req.department_key;
      const toLabel = DEPT_LABEL[toDept] ?? toDept;
      const who = actorLabel();
      const eventNote = note
        ? `${who} forwarded ${fromLabel} → ${toLabel}: ${note}`
        : `${who} forwarded ${fromLabel} → ${toLabel}`;

      const { error: upErr } = await admin.from("ts_service_requests").update({
        department_key: toDept,
        needs_triage: false,
        assigned_staff_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", requestId);
      if (upErr) return json({ error: upErr.message }, 400);

      await admin.from("ts_request_events").insert({
        request_id: requestId,
        status: "forwarded",
        actor_type: "staff",
        actor_id: caller.id,
        note: eventNote,
      });

      // Alert the receiving team (new-request style + forward banner).
      admin.functions.invoke("talkstay-notify", {
        body: { requestId, event: "forwarded", note: note || `Forwarded from ${fromLabel}` },
      }).catch(() => {});

      return json({ ok: true, department_key: toDept });
    }

    // ------- create_request: staff logs phone / walk-in / front-desk order -------
    if (action === "create_request") {
      const roomId = String(body.roomId ?? "").trim();
      const summary = String(body.summary ?? "").trim().slice(0, 500);
      let dept = nd(body.departmentKey ?? departmentKey);
      const sourceRaw = String(body.source ?? "phone").trim().toLowerCase();
      const SOURCE_OK = new Set(["phone", "walk_in", "front_desk"]);
      const source = SOURCE_OK.has(sourceRaw) ? sourceRaw : "phone";
      const priorityRaw = String(body.priority ?? "normal").trim().toLowerCase();
      const priority = ["low", "normal", "high", "urgent"].includes(priorityRaw) ? priorityRaw : "normal";
      const force = !!body.force; // allow create even when similar open ticket exists

      if (!roomId) return json({ error: "roomId required" }, 400);
      if (!summary) return json({ error: "summary required" }, 400);

      // Department staff may only log to their own team.
      // Owners / property managers / Duty Manager / Front Desk may pick any team.
      if (!isOwner && !isPropertyManager) {
        const coord = isFrontDesk || isDutyManager || !callerStaff?.department_key;
        if (!coord && callerStaff?.department_key) {
          dept = callerStaff.department_key;
        }
      }
      if (!dept) return json({ error: "departmentKey required" }, 400);

      const { data: room } = await admin.from("ts_rooms")
        .select("id, room_number").eq("id", roomId).eq("hotel_id", hotelId).maybeSingle();
      if (!room) return json({ error: "Room not found" }, 404);

      // Duplicate warning — same room + same department still open.
      const { data: openSame } = await admin.from("ts_service_requests")
        .select("id, department_key, summary, summary_staff, status, source, created_at")
        .eq("hotel_id", hotelId).eq("room_id", roomId).eq("department_key", dept)
        .in("status", ["new", "accepted", "in_progress", "on_the_way", "reopened", "escalated"])
        .order("created_at", { ascending: false })
        .limit(8);

      if ((openSame?.length ?? 0) > 0 && !force) {
        return json({
          ok: false,
          duplicate: true,
          error: "This room already has an open order for that team — confirm to log another.",
          open: openSame,
        }, 409);
      }

      const actorLabel = callerStaff?.name || caller.email || "staff";
      const notePrefix =
        source === "phone" ? "Phone order"
        : source === "walk_in" ? "Walk-in order"
        : "Front desk order";

      const baseRow = {
        hotel_id: hotelId,
        room_id: roomId,
        department_key: dept,
        intent: "staff_logged",
        summary,
        summary_staff: summary,
        status: "new",
        priority,
        is_complaint: false,
        is_chargeable: !!body?.isChargeable,
        price: body?.isChargeable && body?.price != null && Number(body.price) >= 0
          ? Number(body.price)
          : null,
        payment_status: body?.isChargeable ? "unpaid" : null,
        guest_language: (hotel as any).default_language || "English",
        session_id: null,
        classification_method: source,
        needs_triage: false,
        assigned_staff_id: caller.id,
      };

      let reqRow: any = null;
      let insErr: { message?: string } | null = null;
      {
        const first = await admin.from("ts_service_requests").insert({ ...baseRow, source })
          .select("id, department_key, summary, status, created_at").single();
        reqRow = first.data;
        insErr = first.error;
        if (insErr?.message?.includes("payment_status")) {
          const { payment_status: _ps, ...withoutPay } = baseRow as any;
          const retry = await admin.from("ts_service_requests").insert({ ...withoutPay, source })
            .select("id, department_key, summary, status, created_at").single();
          reqRow = retry.data;
          insErr = retry.error;
        }
        // Pre-migration: `source` column may not exist yet — retry without it.
        if (insErr?.message?.includes("source")) {
          const { payment_status: _ps, ...withoutPay } = baseRow as any;
          const second = await admin.from("ts_service_requests").insert(withoutPay)
            .select("id, department_key, summary, status, created_at").single();
          reqRow = second.data;
          insErr = second.error;
        }
      }

      if (insErr || !reqRow) return json({ error: insErr?.message ?? "Couldn't create order" }, 400);

      await admin.from("ts_request_events").insert({
        request_id: reqRow.id,
        status: "new",
        actor_type: "staff",
        actor_id: caller.id,
        note: `${notePrefix} logged by ${actorLabel}`,
      });

      // Alert the rest of the team (same path as guest-created tickets).
      admin.functions.invoke("talkstay-notify", { body: { requestId: reqRow.id } }).catch(() => {});

      return json({
        ok: true,
        request: reqRow,
        roomNumber: room.room_number,
      });
    }

    // ------- update -------
    if (action === "update") {
      if (!staffId) return json({ error: "staffId required" }, 400);
      if (!isOwner && (await isOwnerRow(staffId))) return json({ error: "Only the owner can edit the owner." }, 403);
      if (isDeptManager) {
        const { data: target } = await admin.from("ts_staff")
          .select("department_key, role")
          .eq("id", staffId).eq("hotel_id", hotelId).maybeSingle();
        if (!target || target.department_key !== callerStaff?.department_key) {
          return json({ error: "You can only edit staff in your department." }, 403);
        }
        if (role !== undefined && normalizeRole(role) !== "staff") {
          return json({ error: "Department managers can only keep teammates as Staff." }, 403);
        }
        if (departmentKey !== undefined && departmentKey !== callerStaff?.department_key) {
          return json({ error: "Department managers cannot move people to another department." }, 403);
        }
      }
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = (String(name).trim() || null);
      if (role !== undefined) patch.role = normalizeRole(role);
      if (departmentKey !== undefined) {
        patch.department_key = departmentKey == null || departmentKey === ""
          ? null
          : nd(departmentKey);
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
      if (isDeptManager) {
        const { data: target } = await admin.from("ts_staff")
          .select("department_key")
          .eq("id", staffId).eq("hotel_id", hotelId).maybeSingle();
        if (!target || target.department_key !== callerStaff?.department_key) {
          return json({ error: "You can only remove staff in your department." }, 403);
        }
      }
      const { error } = await admin.from("ts_staff").delete().eq("id", staffId).eq("hotel_id", hotelId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ------- bi_brief: polish Insights BI into a short manager narrative -------
    if (action === "bi_brief") {
      const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").replace(/[^\x21-\x7E]/g, "");
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);
      const snapshot = body.snapshot;
      if (!snapshot || typeof snapshot !== "object") return json({ error: "snapshot required" }, 400);
      const branding = (hotel.branding ?? {}) as Record<string, unknown>;
      const property = (branding.property ?? {}) as Record<string, unknown>;
      const system = `You are TalkStay's hotel/Airbnb business intelligence coach.
Write a VERY short manager brief from the JSON snapshot (already filtered).
Rules:
- headline: max 8 words
- summary: one sentence, max 28 words, numbers only from the snapshot
- actions: exactly 3 short imperatives (max 18 words each), tailored to property type/scale/location when present
- Prefer sales language when chargeable volume exists
- Never invent numbers
- Return JSON only: {"headline":"...","summary":"...","actions":["..."]}`;
      const user = JSON.stringify({
        hotel: hotel.name,
        property,
        snapshot,
      });
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          max_tokens: 500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        return json({ error: `AI failed: ${t.slice(0, 200)}` }, 502);
      }
      const data = await resp.json();
      let parsed: { headline?: string; summary?: string; actions?: string[] } = {};
      try {
        parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
      } catch {
        return json({ error: "Bad AI response" }, 502);
      }
      const actions = Array.isArray(parsed.actions)
        ? parsed.actions.map((a) => String(a).trim()).filter(Boolean).slice(0, 6)
        : [];
      return json({
        headline: String(parsed.headline || "").trim() || null,
        summary: String(parsed.summary || "").trim() || null,
        actions,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
