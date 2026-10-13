// POST /api/ai  — the only place the Claude API key is used.
// Body: { prompt, tier: "quick" | "default", json?: boolean, images?: [{media_type, data(base64)}] }
// Requires a signed-in user (Supabase access token in the Authorization header).
const MODELS = { quick: "claude-haiku-4-5-20251001", default: "claude-sonnet-5-5" };

async function verifyUser(req){
  const auth = req.headers.authorization || "";
  if(!auth.startsWith("Bearer ")) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: process.env.SUPABASE_ANON_KEY } });
  return r.ok ? r.json() : null;
}

export default async function handler(req, res){
  if(req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const user = await verifyUser(req);
  if(!user) return res.status(401).json({ error: "Sign in to use AI features." });
  const { prompt, tier = "default", json = false, images = [] } = req.body || {};
  if(!prompt || typeof prompt !== "string" || prompt.length > 60000) return res.status(400).json({ error: "Missing or oversized prompt." });

  const content = [
    ...images.slice(0, 3).map(im => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } })),
    { type: "text", text: prompt }
  ];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELS[tier] || MODELS.default,
      max_tokens: 1500,
      ...(json ? { system: "Reply with only valid JSON. No code fences, no commentary." } : {}),
      messages: [{ role: "user", content }]
    })
  });
  if(r.status === 429) return res.status(429).json({ error: "The AI is busy. Try again in a minute." });
  if(!r.ok) return res.status(502).json({ error: "The AI couldn't answer just now." });
  const data = await r.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  if(!json) return res.status(200).json({ text });
  try{ return res.status(200).json({ json: JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) }); }
  catch(e){ return res.status(502).json({ error: "The AI returned something unreadable. Try again." }); }
}
