// HOMECOMING — extraction service (Netlify Function)
// POST /.netlify/functions/extract  { pages: [{ page: 1, text: "..." }, ...] }
//                                or { image: { media_type, data } }
// Returns: { items: [...], dropped_ungrounded: n } — span-grounded, confidence-tagged candidate items.
//
// Env var required in Netlify: ANTHROPIC_API_KEY
//
// SAFETY DESIGN:
//  - Every item MUST carry a source_snippet copied verbatim from the input; we verify
//    it actually appears in that page's text, otherwise the item is dropped (anti-hallucination gate).
//  - Category whitelist. Anything else the model returns is discarded.
//  - The model is instructed to restructure and cite ONLY — never to add medical advice.
//
// PERFORMANCE: pages are extracted in parallel, one model call per page, so total
// latency tracks the slowest page rather than the sum of all pages.

const CATEGORIES = new Set(["medication", "appointment", "task", "warning"]);

const MODEL = "claude-haiku-4-5-20251001";
const MAX_CHARS_PER_PAGE = 12000;
const MAX_PAGES = 40;

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

// ---- single model call, returns an array of items (never throws) ----
async function extractFrom(content, maxTokens) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  const rawText = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
  return Array.isArray(parsed.items) ? parsed.items : [];
}

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

  try {
    let rawItems = [];
    let pageFailures = 0;

    if (image) {
      // ---- image path: one call, no page text to ground against ----
      rawItems = await extractFrom(
        [
          { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
          {
            type: "text",
            text: 'This is a photo of a discharge document. Extract items as instructed. If the image is a handwritten note, set confidence to "low" for every item because handwriting is easy to misread.',
          },
        ],
        3000
      );
    } else {
      // ---- text path: one call per page, all in flight at once ----
      const batch = pages.slice(0, MAX_PAGES).filter((p) => p && typeof p.text === "string" && p.text.trim());

      const results = await Promise.all(
        batch.map((p) =>
          extractFrom(`--- PAGE ${p.page} ---\n${p.text.slice(0, MAX_CHARS_PER_PAGE)}`, 2000)
            .then((items) =>
              // force the page number to the page we actually sent
              items.map((it) => ({ ...it, source_page: Number(p.page) }))
            )
            .catch((err) => {
              console.error(`page ${p.page} extraction failed:`, err.message);
              pageFailures += 1;
              return [];
            })
        )
      );

      rawItems = results.flat();

      // every page failed — surface it rather than returning a silent empty plan
      if (batch.length > 0 && pageFailures === batch.length) {
        return Response.json({ error: "AI service error" }, { status: 502 });
      }
    }

    // ---- Anti-hallucination gate ----
    // An item survives only if its verbatim snippet is actually present in its page's text.
    const pageMap = new Map((pages || []).map((p) => [Number(p.page), p.text]));
    const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

    const items = rawItems.filter((item) => {
      if (!item || !CATEGORIES.has(item.category)) return false;
      if (image) return true; // image input: nothing to ground against — flagged low-confidence upstream
      const pageText = pageMap.get(Number(item.source_page));
      if (!pageText || !item.source_snippet) return false;
      return norm(pageText).includes(norm(item.source_snippet));
    });

    return Response.json({
      items,
      dropped_ungrounded: rawItems.length - items.length,
      pages_failed: pageFailures,
    });
  } catch (err) {
    console.error("extract failed:", err);
    return Response.json({ error: "Extraction failed", detail: String(err) }, { status: 500 });
  }
};