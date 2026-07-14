import { GUIDANCE } from "./guidance.mjs";

const SYSTEM_PROMPT = `You are a supportive assistant for family caregivers. Answer ONLY using the guidance passages provided. Rules:
- Use only information from the passages. Never add medical advice of your own.
- Be warm, plain-language, and brief (under 150 words).
- After each point, cite the passage id in brackets, like [meds-1].
- Never diagnose, never suggest changing medications or doses.
- If the passages don't cover the question, say exactly that and suggest asking the care team, pharmacist, or the Eldercare Locator (1-800-677-1116). Do not answer from general knowledge.
- write in plain text only. No markdown, no asterisks, no emojis.;`

export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "POST only" }, { status: 405 });

  let question;
  try {
    ({ question } = await req.json());
    if (!question || question.length > 500) throw new Error();
  } catch {
    return Response.json({ error: "Body must be { question } under 500 chars" }, { status: 400 });
  }

  // Retrieval: stem-prefix word matching, ignoring short filler words
  const stem = (w) => w.slice(0, 6);
  const words = (question.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length >= 4);
  const scored = GUIDANCE.map((g) => {
    const hayStems = new Set(((g.topic + " " + g.text).toLowerCase().match(/[a-z]+/g) || [])
      .filter((h) => h.length >= 4).map(stem));
    const score = words.reduce((s, w) => s + (hayStems.has(stem(w)) ? 1 : 0), 0);
    return { g, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored.filter((s) => s.score >= 2).slice(0, 3).map((s) => s.g);
  if (top.length === 0) {
    return Response.json({ answer: "I don't have trusted guidance on that yet. Please ask the care team or pharmacist — or call the Eldercare Locator at 1-800-677-1116 for local help.", sources: [] });
  }

  const passages = top.map((g) => `[${g.id}] (${g.source})\n${g.text}`).join("\n\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Guidance passages:\n\n${passages}\n\nCaregiver's question: ${question}` }],
    }),
  });

  if (!res.ok) return Response.json({ error: "AI request failed" }, { status: 502 });
  const data = await res.json();
  const answer = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");

  // Only return sources actually cited in the answer
  const sources = top.filter((g) => answer.includes(`[${g.id}]`))
    .map((g) => ({ id: g.id, source: g.source, url: g.url }));

  return Response.json({ answer, sources });
};