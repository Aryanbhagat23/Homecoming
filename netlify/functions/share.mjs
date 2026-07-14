import { createClient } from "@supabase/supabase-js";

export default async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    return Response.json({ error: "Invalid link" }, { status: 400 });
  }

  // Service role client: server-side only, bypasses RLS for this one controlled lookup
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: circle } = await supabase
    .from("care_circles").select("id, name").eq("share_token", token).single();
  if (!circle) return Response.json({ error: "Invalid link" }, { status: 404 });

  const { data: items } = await supabase
    .from("plan_items")
    .select("id, category, payload, confirmed_at")
    .eq("circle_id", circle.id).eq("active", true)
    .order("confirmed_at", { ascending: false });

  return Response.json({ name: circle.name, items: items || [] });
};