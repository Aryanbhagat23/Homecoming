import { createClient } from "@supabase/supabase-js";

// ---- email provider (isolated: swap Resend/SendGrid here without touching the rest) ----
async function sendEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DRY RUN] Would email ${to}: ${subject}`);
    return true; // pretend success so the pipeline can be tested without a key
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: "Homecoming <onboarding@resend.dev>", to: [to], subject, text }),
  });
  if (!res.ok) console.log("Resend error:", res.status, await res.text());
  return res.ok;
}

// ---- scheduled job: find due, unsent email reminders and send them ----
export default async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: due } = await supabase
    .from("reminders")
    .select("id, remind_at, notify_email, plan_items ( payload, category )")
    .eq("channel", "email").eq("sent", false)
    .lte("remind_at", new Date().toISOString())
    .limit(20);

  console.log(`Reminder check: ${due?.length || 0} due`);

  for (const r of due || []) {
    if (!r.notify_email) continue;
    const item = r.plan_items;
    const name = item?.payload?.name || item?.payload?.title || item?.payload?.watch_for || "your care plan";
    const ok = await sendEmail({
      to: r.notify_email,
      subject: `Homecoming reminder: ${name}`,
      text: `This is your reminder about: ${name}\n\n${item?.payload?.plain_language || ""}\n\nOpen your care plan: https://homecoming-care.netlify.app\n\n— Homecoming. This is a reminder you set, not medical advice.`,
    });
    if (ok) await supabase.from("reminders").update({ sent: true }).eq("id", r.id);
  }
  return new Response("ok");
};

export const config = { schedule: "*/5 * * * *" };