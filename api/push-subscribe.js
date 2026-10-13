// POST /api/push-subscribe — saves this device's push subscription for the signed-in user.
async function verifyUser(req){
  const auth = req.headers.authorization || "";
  if(!auth.startsWith("Bearer ")) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: process.env.SUPABASE_ANON_KEY } });
  return r.ok ? r.json() : null;
}
export default async function handler(req, res){
  if(req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const user = await verifyUser(req);
  if(!user) return res.status(401).json({ error: "Sign in first." });
  const { subscription, tz } = req.body || {};
  if(!subscription || !subscription.endpoint) return res.status(400).json({ error: "Missing subscription." });
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/push_subs`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ endpoint: subscription.endpoint, user_id: user.id, subscription, tz: tz || "UTC" })
  });
  if(!r.ok) return res.status(500).json({ error: "Couldn't save the subscription." });
  return res.status(200).json({ ok: true });
}
