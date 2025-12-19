// supabase/functions/delete-account/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten later to your domain(s)
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, any>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing Authorization header" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: "Missing required environment variables" });
    }

    // ✅ Client with user's JWT (identifies caller)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: "Invalid session" });
    }

    const userId = userData.user.id;

    // ✅ Admin client (service role)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // ✅ OPTIONAL: cleanup your app tables first
    // Update table/column names to match your DB schema.
    //
    // Examples you might have:
    // - bookings.userId or bookings.user_id
    // - profiles.id or profiles.user_id
    // - reviews.user_id
    //
    // Tip: Delete child tables first to satisfy FK constraints.
    const cleanupErrors: string[] = [];

    // Example cleanup (EDIT THESE):
    // 1) bookings
    {
      const { error } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("userId", userId);
      if (error) cleanupErrors.push(`bookings: ${error.message}`);
    }

    // 2) profiles (if you have one)
    // {
    //   const { error } = await supabaseAdmin
    //     .from("profiles")
    //     .delete()
    //     .eq("id", userId); // or eq("user_id", userId)
    //   if (error) cleanupErrors.push(`profiles: ${error.message}`);
    // }

    // ✅ Delete auth user (Supabase Auth)
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    // If already deleted, treat as success (idempotent)
    if (delErr) {
      // Some environments return "User not found" if already deleted
      const msg = delErr.message?.toLowerCase() || "";
      if (!msg.includes("not found")) {
        return json(400, {
          error: delErr.message,
          cleanupErrors: cleanupErrors.length ? cleanupErrors : undefined,
        });
      }
    }

    return json(200, {
      ok: true,
      cleanupErrors: cleanupErrors.length ? cleanupErrors : undefined,
    });
  } catch (e: any) {
    return json(500, { error: e?.message || "Unknown error" });
  }
});
