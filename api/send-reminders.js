// GET /api/send-reminders — called every 5 minutes by a scheduler (see README: Reminders).
// Protected by CRON_SECRET. Sends a push for anything starting in the next 5 minutes:
// habits with a set time, timed tasks, and blocks placed in Itinerary.
import webpush from "web-push";

const H = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
const localNow = tz => { const d = new Date(new Date().toLocaleString("en-US", { timeZone: tz })); return d; };
const ymd = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const toMin = s => { const [h,m] = s.split(":").map(Number); return h*60+m; };

function dueSoon(state, now){
  const t = ymd(now), mins = now.getHours()*60 + now.getMinutes(), dow = now.getDay(), out = [];
  const soon = s => { const m = toMin(s); return m >= mins && m < mins + 5; };
  for(const it of state.items || []){
    if(it.status !== "open") continue;
    if(it.type === "habit" && it.habit && it.habit.time && (it.habit.days||[]).includes(dow) && !(it.habit.log||{})[t] && soon(it.habit.time))
      out.push({ tag: `h:${it.id}:${t}`, title: it.title, body: `Time for ${it.title}. Even ${it.habit.minimum||10} minutes counts.` });
    if(it.type === "task" && it.at && it.due === t && soon(it.at))
      out.push({ tag: `t:${it.id}:${t}`, title: it.title, body: "You planned this for now. Start, swap, or push it." });
  }
  for(const p of (state.plan || {})[t] || []){
    if(p.proposed || !soon(p.start)) continue;
    const it = (state.items||[]).find(i => i.id === p.ref.itemId); if(!it) continue;
    const step = p.ref.stepId && (it.steps||[]).find(s => s.id === p.ref.stepId);
    out.push({ tag: `p:${p.ref.itemId}:${p.ref.stepId||""}:${t}:${p.start}`, title: step ? step.title : it.title, body: "You planned this for now. Start, swap, or push it." });
  }
  return out;
}

export default async function handler(req, res){
  if(req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:you@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const subs = await (await fetch(`${process.env.SUPABASE_URL}/rest/v1/push_subs?select=*`, { headers: H })).json();
  const byUser = {}; for(const s of subs) (byUser[s.user_id] = byUser[s.user_id] || []).push(s);
  let sent = 0;
  for(const [uid, list] of Object.entries(byUser)){
    const rows = await (await fetch(`${process.env.SUPABASE_URL}/rest/v1/app_state?user_id=eq.${uid}&select=data`, { headers: H })).json();
    const state = rows[0] && rows[0].data; if(!state) continue;
    const now = localNow(state.tz || list[0].tz || "UTC");
    for(const msg of dueSoon(state, now)){
      for(const s of list){
        try{ await webpush.sendNotification(s.subscription, JSON.stringify(msg)); sent++; }
        catch(e){ if(e.statusCode === 404 || e.statusCode === 410) await fetch(`${process.env.SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE", headers: H }); }
      }
    }
  }
  return res.status(200).json({ sent });
}
