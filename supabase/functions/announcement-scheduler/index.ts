// announcement-scheduler (T58): send hr_announcements where status=scheduled and scheduled_at <= now
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const MULTICAST_LIMIT = 500;

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const admin = ctx.supabaseAdmin;
    const nowIso = new Date().toISOString();

    const { data: due, error } = await admin
      .from("hr_announcements")
      .select("id, title, body, image_path, target_type, target_value")
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso);
    if (error) throw error;

    if (!due?.length) {
      return Response.json({ sent: 0 });
    }

    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
    const lineHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${lineToken}`,
    };

    let sent = 0;
    for (const ann of due) {
      let query = admin
        .from("hr_employees")
        .select("line_user_id")
        .eq("status", "active")
        .not("line_user_id", "is", null);

      if (ann.target_type === "department" && ann.target_value) {
        query = query.eq("department", ann.target_value as string);
      }

      const { data: rows, error: empError } = await query;
      if (empError) {
        console.error("targets failed", ann.id, empError);
        continue;
      }

      const targets = (rows ?? []).map((r) => r.line_user_id as string);
      const preview =
        (ann.body as string).length > 200
          ? `${(ann.body as string).slice(0, 197)}...`
          : (ann.body as string);
      const text = `ประกาศ: ${ann.title}\n${preview}`;
      const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
      const imagePath = ann.image_path as string | null;
      const imageUrl =
        supabaseUrl && imagePath
          ? `${supabaseUrl}/storage/v1/object/public/hr-announcements/${imagePath}`
          : null;

      const messages: Array<Record<string, string>> = [];
      if (imageUrl) {
        messages.push({
          type: "image",
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        });
      }
      messages.push({ type: "text", text });

      for (let i = 0; i < targets.length; i += MULTICAST_LIMIT) {
        const chunk = targets.slice(i, i + MULTICAST_LIMIT);
        await fetch(`${lineApiBase}/v2/bot/message/multicast`, {
          method: "POST",
          headers: lineHeaders,
          body: JSON.stringify({
            to: chunk,
            messages,
          }),
        });
      }

      await admin
        .from("hr_announcements")
        .update({ status: "sent", sent_at: nowIso })
        .eq("id", ann.id as string);

      sent += 1;
    }

    return Response.json({ sent });
  }),
};

export default handler;
