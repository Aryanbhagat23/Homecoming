// HOMECOMING — extraction service (Netlify Function)
// POST /.netlify/functions/extract  { pages: [{ page: 1, text: "..." }, ...] }
// Returns: { items: [...] } — span-grounded, confidence-tagged candidate items.
//
// Env var required in Netlify: ANTHROPIC_API_KEY
// SAFETY DESIGN:
//  - Every item MUST carry a source_snippet copied verbatim from the input; we verify
//    it actually appears in the page text, otherwise the item is dropped (anti-hallucination gate).
//  - Category whitelist. Anything else the model returns is discarded.
//  - The model is instructed to restructure and cite ONLY — never to add medical advice.

const CATEGORIES = new Set(["medication", "appointment", "task", "warning"]);

const SYSTEM_PROMPT = `You are an information-extraction engine inside Homecoming, a caregiver app.
You receive text from a hospital discharge packet, split by page.
Extract ONLY these item types: medication, appointment, task, warning.

Rules — these are strict:
1. Every item must include "source_page" (integer) and "source_snippet": an EXACT, verbatim substring
   (max ~200 chars) copied from that page's text that the item is derived from. Never paraphrase the snippet.
2. Restructure and simplify what the document says. NEVER add medical advice, dosing suggestions,
   or interpretations that are not in the document.
3. "plain_language" fields must be a faithful simplification a stressed non-medical family member
   can understand. If the document is ambiguous about something important (dose, timing, date),
   set "confidence": "low" and describe the ambiguity in "review_note".
4. Output ONLY valid JSON. No markdown, no preamble.

JSON output shape:
{
  "items": [
    {
      "category": "medication",
      "confidence": "high" | "low",
      "review_note": "only when confidence is low — what the caregiver should double-check",
      "source_page": 4,
      "source_snippet": "exact text from the document",
      "payload": {
        // medication: { "name", "dose", "schedule", "is_new": bool, "is_stopped": bool, "plain_language" }
        // appointment: { "with", "specialty", "when_text", "date_iso_if_clear", "location", "plain_language" }
        // task: { "title", "when_text", "plain_language" }
        // warning: { "watch_for", "action_in_document", "plain_language" }
      }
    }
  ]
}`;

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

 let pages, image;
  try {
    const body = await req.json();
    pages = body.pages;
    image = body.image; // { media_type, data } base64, optional
    if (!image && (!Array.isArray(pages) || pages.length === 0)) throw new Error("no input");
  } catch {
    return Response.json({ error: "Body must be { pages } or { image }" }, { status: 400 });
  }

  const docText = (pages || [])
    .map((p) => `--- PAGE ${p.page} ---\n${p.text}`)
    .join("\n\n");

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: image
            ? [
                { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
                { type: "text", text: "This is a photo of a discharge document. Extract items as instructed. If the image is a handwritten note, set confidence to \"low\" for every item because handwriting is easy to misread." },
              ]
            : docText,
        }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return Response.json({ error: "AI service error", detail }, { status: 502 });
    }

    const data = await resp.json();
    const rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return Response.json({ error: "Model returned non-JSON output" }, { status: 502 });
    }

    // ---- Anti-hallucination gate ----
    const pageMap = new Map((pages || []).map((p) => [Number(p.page), p.text]));
    const items = (parsed.items || []).filter((item) => {
      if (!CATEGORIES.has(item.category)) return false;
      if (image) return true; // image input: no page text to ground against
      const pageText = pageMap.get(Number(item.source_page));
      if (!pageText || !item.source_snippet) return false;
      const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
      return norm(pageText).includes(norm(item.source_snippet));
    });

    const dropped = (parsed.items || []).length - items.length;
    return Response.json({ items, dropped_ungrounded: dropped });
  } catch (err) {
    return Response.json({ error: "Extraction failed", detail: String(err) }, { status: 500 });
  }
};
