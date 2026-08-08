import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, escapeHtml } from "../_shared/email.ts";

const PUBLIC_BASE_URL = "https://talkstay.talkweb.io";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Identify the caller from their JWT.
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const caller = userData.user;

    const { action, hotelId, email, name, departmentKey, role, staffId } = await req.json();
    if (!hotelId) return json({ error: "hotelId required" }, 400);

    // Authorize: OWNER or an active MANAGER of this hotel may manage staff.
    // (Managers are the "sub-manager" access the owner grants so someone can
    // coordinate while the owner is away.)
    const { data: hotel } = await admin
      .from("ts_hotels").select("id, user_id, name, branding").eq("id", hotelId).maybeSingle();
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

    // Helper: is a given staff row the hotel OWNER's own membership?
    const isOwnerRow = async (sid: string) => {
      const { data } = await admin.from("ts_staff").select("user_id").eq("id", sid).eq("hotel_id", hotelId).maybeSingle();
      return !!data && data.user_id === hotel.user_id;
    };
    // Only owner/manager may exist as roles a non-owner can assign; nobody but the
    // owner can mint another owner.
    const normalizeRole = (r: unknown) => {
      const v = String(r ?? "staff");
      if (v === "owner" && !isOwner) return "manager";
      return ["owner", "manager", "staff"].includes(v) ? v : "staff";
    };

    // ------- list -------
    if (action === "list") {
      const { data: staff } = await admin
        .from("ts_staff")
        .select("id, user_id, department_key, role, status, name, created_at")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: true });

      // Resolve emails via admin (RLS-free).
      const rows = await Promise.all(
        (staff ?? []).map(async (s: any) => {
          const { data } = await admin.auth.admin.getUserById(s.user_id);
          return { ...s, email: data?.user?.email ?? "(unknown)" };
        })
      );
      return json({ staff: rows });
    }

    // ------- invite -------
    if (action === "invite") {
      if (!email) return json({ error: "email required" }, 400);
      const cleanEmail = String(email).trim().toLowerCase();
      const staffName = (name ? String(name).trim() : "") || null;

      // Find existing user by email (paginate a little).
      let userId: string | null = null;
      for (let page = 1; page <= 5 && !userId; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const hit = data?.users?.find((u) => (u.email ?? "").toLowerCase() === cleanEmail);
        if (hit) userId = hit.id;
        if (!data?.users || data.users.length < 200) break;
      }

      let invited = false;
      if (!userId) {
        // New team member: create the account (no password yet) and send them
        // a branded invite link to set their own — never a temp password
        // relayed by whoever invited them.
        const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
          type: "invite",
          email: cleanEmail,
          options: {
            data: staffName ? { full_name: staffName } : undefined,
            // Our own type= marker survives regardless of how Supabase encodes
            // the token — AuthPage/HotelApp use it to force the "set a
            // password" screen instead of dropping the invitee into the app.
            redirectTo: `${PUBLIC_BASE_URL}/app?type=invite`,
          },
        });
        if (lErr || !linkData?.user) return json({ error: lErr?.message ?? "Could not create user" }, 400);
        userId = linkData.user.id;
        invited = true;

        const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
        const actionLink = linkData.properties?.action_link;
        if (key && actionLink) {
          // Who's doing the inviting — their own staff name if set, else email.
          const { data: callerStaff } = await admin.from("ts_staff")
            .select("name").eq("hotel_id", hotelId).eq("user_id", caller.id).maybeSingle();
          const inviterName = callerStaff?.name || caller.email || "A manager";

          const html = renderEmail({
            hotelName: hotel.name ?? "Your hotel",
            logoUrl: hotel.branding?.logo_url,
            accentColor: hotel.branding?.primary_color,
            heading: `You've been invited to join ${hotel.name ?? "the"} team`,
            bodyHtml: `
              <p style="margin:0 0 14px;">${escapeHtml(inviterName)} added you to their TalkStay team${departmentKey ? ` (${escapeHtml(String(departmentKey).replace(/_/g, " "))})` : ""}. Set a password to get started.</p>`,
            cta: { label: "Set your password", url: actionLink },
            footerNote: "If you weren't expecting this, you can safely ignore this email.",
          });
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: "TalkStay <notifications@talkweb.io>", to: cleanEmail, subject: `You've been invited to join ${hotel.name ?? "a"} on TalkStay`, html }),
          }).catch(() => {});
        }
      }

      // Upsert the staff membership (unique on hotel_id,user_id,department_key).
      const { error: sErr } = await admin.from("ts_staff").upsert(
        {
          hotel_id: hotelId,
          user_id: userId,
          department_key: departmentKey || null,
          role: normalizeRole(role),
          status: "active",
          name: staffName,
        },
        { onConflict: "hotel_id,user_id,department_key" }
      );
      if (sErr) return json({ error: sErr.message }, 400);

      return json({ ok: true, invited, email: cleanEmail });
    }

    // ------- update (edit name / role / department) -------
    if (action === "update") {
      if (!staffId) return json({ error: "staffId required" }, 400);
      // The owner's own membership can only be edited by the owner.
      if (!isOwner && (await isOwnerRow(staffId))) return json({ error: "Only the owner can edit the owner." }, 403);
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = (String(name).trim() || null);
      if (role !== undefined) patch.role = normalizeRole(role);
      if (departmentKey !== undefined) patch.department_key = departmentKey || null;
      if (Object.keys(patch).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await admin.from("ts_staff").update(patch).eq("id", staffId).eq("hotel_id", hotelId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ------- remove -------
    if (action === "remove") {
      if (!staffId) return json({ error: "staffId required" }, 400);
      // Nobody can remove the owner's membership; managers can't be removed by managers.
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
