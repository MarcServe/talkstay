import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Authorize: caller must own the hotel.
    const { data: hotel } = await admin
      .from("ts_hotels").select("id, user_id").eq("id", hotelId).maybeSingle();
    if (!hotel || hotel.user_id !== caller.id) return json({ error: "Forbidden" }, 403);

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

      let tempPassword: string | undefined;
      if (!userId) {
        // Create the account so they can sign in immediately (no SMTP needed).
        tempPassword = `Stay-${crypto.randomUUID().slice(0, 8)}`;
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: staffName ? { full_name: staffName } : undefined,
        });
        if (cErr || !created?.user) return json({ error: cErr?.message ?? "Could not create user" }, 400);
        userId = created.user.id;
      }

      // Upsert the staff membership (unique on hotel_id,user_id,department_key).
      const { error: sErr } = await admin.from("ts_staff").upsert(
        {
          hotel_id: hotelId,
          user_id: userId,
          department_key: departmentKey || null,
          role: role || "staff",
          status: "active",
          name: staffName,
        },
        { onConflict: "hotel_id,user_id,department_key" }
      );
      if (sErr) return json({ error: sErr.message }, 400);

      return json({ ok: true, created: !!tempPassword, tempPassword, email: cleanEmail });
    }

    // ------- remove -------
    if (action === "remove") {
      if (!staffId) return json({ error: "staffId required" }, 400);
      const { error } = await admin.from("ts_staff").delete().eq("id", staffId).eq("hotel_id", hotelId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
