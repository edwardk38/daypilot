/* ================= v0.2: Dump → Clean-up → Plan it → Horizon / Now ================= */
const TYPES = {task:"Task",assignment:"Assignment",habit:"Habit",goal:"Goal",event:"Event",idea:"Someday idea"};
const DOW = ["S","M","T","W","T","F","S"];
const DOWL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/* ---------------- State ---------------- */
// Older saves are read from the app's earlier storage names, so nothing on a device is lost.
const KEY = "daypilot-v1", OLDKEYS = ["passport-planner-v02", "passport-planner-v01"];
const fresh = () => ({v:2, items:[], energy:"steady", hoursMin:0, starts:{}});
// Fields from the removed travel theme (miles, earned, location, visited, stamps) may still be in old saves.
// Nothing reads them anymore; they're left in place, untouched.
function migrate(o){
  if(!o) return fresh();
  if(o.v===1){
    const n = Object.assign(fresh(), {energy:o.energy||"steady", hoursMin:o.hoursMin||0});
    n.items = (o.items||[]).map(i => i.status==="done"
      ? {id:i.id, raw:i.title, title:i.title, type:"task", minutes:i.minutes||20, status:"done", doneAt:i.doneAt, created:i.created}
      : {id:i.id, raw:i.title, title:i.title, type:"unplanned", status:"open", created:i.created});
    o = n;
  }
  if(o.v!==2) return fresh();
  // Dumped, not-yet-planned items used to be type "ticket".
  (o.items||[]).forEach(i => { if(i.type==="ticket") i.type = "unplanned"; });
  o.items = o.items || [];
  backfillStarts(o);
  return o;
}
function load(){
  for(const k of [KEY, ...OLDKEYS]){ try{ const r = localStorage.getItem(k); if(r) return migrate(JSON.parse(r)); }catch(e){} }
  return fresh();
}
let S = load();
let tab = "now", horView = "shelf", focus = null, ov = null;
let saveTimer = null, dbRef = null, sampleFn = null, canImages = false;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
  clearTimeout(saveTimer);
  if(dbRef) saveTimer = setTimeout(()=>{ dbRef.set(JSON.parse(JSON.stringify(S))).catch(()=>{}); }, 700);
}
(async function connect(){
  if(!window.claude || !window.claude.use) return;
  try{
    const [db, user, sample] = await Promise.all([claude.use("db"), claude.use("user"), claude.use("sample")]);
    if(sample){ sampleFn = sample; try{ const l = await sample.limits(); canImages = !!(l && l.images); }catch(e){} }
    if(db && user){
      const id = await user.id();
      if(id){
        dbRef = db.doc("data/users/" + id + "/state");
        const snap = await dbRef.get();
        if(snap.exists && snap.data()){ S = migrate(JSON.parse(JSON.stringify(snap.data()))); try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
        if(!snap.exists || (snap.data()||{}).v!==2) dbRef.set(JSON.parse(JSON.stringify(S))).catch(()=>{});
      }
    }
  }catch(e){}
  const rr = () => { if(!document.getElementById("ov") && !document.getElementById("scrim")) render(); else if(ov) renderOv(); };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", rr, {once:true}); else rr();
})();

/* ---------------- Helpers ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Math.random().toString(36).slice(2,10);
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove("show"),2600); }
function todayStr(d){ d = d || new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
const itemById = id => S.items.find(i=>i.id===id);
function dayStat(){ const t=todayStr(); S.day=S.day||{}; if(!S.day[t]){ S.day[t]={steps:0,habits:0,min:0}; const ks=Object.keys(S.day).sort(); while(ks.length>60) delete S.day[ks.shift()]; } return S.day[t]; }
function logDone(kind){ const d=dayStat(); if(kind==="step") d.steps++; if(kind==="habit") d.habits++; markStart(); }

/* ---------------- Start streak ----------------
   A day counts with one focus session of 2+ minutes or any check-off (S.starts[date] = 1).
   Planned rest days neither count nor break it. One free miss per Sunday–Saturday week; a second
   miss in the same week ends it. Today is never a miss until it's over. */
function markStart(date){ S.starts = S.starts || {}; S.starts[date || todayStr()] = 1; }
function streakCalc(starts, restDays, today){
  const days = Object.keys(starts||{}).filter(d=>d<=today).sort(); if(!days.length) return {current:0, best:0};
  const rest = restDays||[]; let cur=0, best=0, wk=null, misses=0;
  for(let d=days[0]; d<=today; d=shiftDay(d,1)){
    const dt = new Date(d+"T12:00:00"), sun = shiftDay(d, -dt.getDay());
    if(sun!==wk){ wk=sun; misses=0; }
    if(starts[d]){ cur++; best=Math.max(best,cur); }
    else if(d===today || rest.includes(dt.getDay())) continue;
    else if(cur>0){ if(misses===0) misses++; else { misses++; cur=0; } }
  }
  return {current:cur, best};
}
function shiftDay(s,n){ const d=new Date(s+"T12:00:00"); d.setDate(d.getDate()+n); return todayStr(d); }
// First run after the pivot: rebuild past days from activity the app already recorded.
function backfillStarts(o){
  if(o.starts) return; const st = {};
  for(const [d,v] of Object.entries(o.day||{})) if(v && (v.steps>0 || v.habits>0 || v.min>=2)) st[d]=1;
  for(const i of o.items||[]){ if(i.doneAt) st[todayStr(new Date(i.doneAt))]=1; for(const d of Object.keys((i.habit||{}).log||{})) st[d]=1; }
  o.starts = st;
}
function addMin(n){ n=Math.max(0,Math.round(n||0)); S.hoursMin+=n; dayStat().min+=n; }
function md(t){
  const lines = esc(t||"").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$)/g,"$1$2").split(/\n/);
  let out = "", inList = false;
  for(const l of lines){
    const m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if(m){ if(!inList){ out += "<ul>"; inList = true; } out += "<li>"+m[1]+"</li>"; }
    else { if(inList){ out += "</ul>"; inList = false; } if(l.trim()) out += "<p>"+l+"</p>"; }
  }
  if(inList) out += "</ul>";
  return out;
}
function daysUntil(d){ return Math.round((new Date(d+"T12:00:00") - new Date(todayStr()+"T12:00:00"))/86400000); }
function dueLabel(d){
  if(!d) return ""; const n = daysUntil(d); const dt = new Date(d+"T12:00:00");
  if(n<0) return "Was due " + dt.toLocaleDateString(undefined,{month:"short",day:"numeric"});
  if(n===0) return "Due today"; if(n===1) return "Due tomorrow";
  if(n<7) return "Due " + dt.toLocaleDateString(undefined,{weekday:"long"});
  return "Due " + dt.toLocaleDateString(undefined,{month:"short",day:"numeric"});
}
function timeLabel(t){ if(!t) return ""; const [h,m]=t.split(":").map(Number); const d=new Date(); d.setHours(h,m,0,0); return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}); }
function weekDates(){ const t=new Date(); const s=new Date(t); s.setDate(t.getDate()-t.getDay()); return [...Array(7)].map((_,k)=>{ const d=new Date(s); d.setDate(s.getDate()+k); return todayStr(d); }); }
/* ---------------- Habits ----------------
   habit.freq: "days" (specific days, the original kind), "count" (perWeek days, any days) or "slots"
   (several times a day: named slots, each checked separately; the day counts once minSlots are done).
   habit.log[date] = true when a day counts. habit.excuse[date] = a "Something came up" note: that day
   is never a miss in any number. Habits have no streaks. */
const freqOf = h => (h && h.freq) || "days";
const slotNeed = h => Math.min((h.slots||[]).length, h.minSlots || (h.slots||[]).length) || 1;
const slotsDone = (h, date) => ((h.slotLog||{})[date||todayStr()]||[]).filter(id=>(h.slots||[]).some(s=>s.id===id));
function onDay(h, date){ return freqOf(h)==="count" || (h.days||[]).includes(new Date(date+"T12:00:00").getDay()); }
function habitStats(it){
  const h = it.habit||{days:[0,1,2,3,4,5,6],log:{}}; const log = h.log||{}, exc = h.excuse||{};
  const wk = weekDates();
  const excusedWk = wk.filter(d=>exc[d] && !log[d] && onDay(h,d)).length;
  const target = freqOf(h)==="count" ? Math.max(0, Math.min(h.perWeek||3, 7-excusedWk)) : Math.max(0, ((h.days||[]).length || 7) - excusedWk);
  const thisWeek = wk.filter(d=>log[d]).length;
  let last30=0, exc30=0; for(let k=0;k<30;k++){ const d=new Date(); d.setDate(d.getDate()-k); const ds=todayStr(d); if(log[ds]) last30++; else if(exc[ds]) exc30++; }
  return {thisWeek, target, last30, of30:30-exc30, total:Object.keys(log).length, wk, log, exc};
}
// Is it on today's list? Count habits show every day until the week's number is reached.
function habitDue(it, date){
  const h = it.habit, t = date||todayStr();
  if(it.status!=="open" || !h || (h.log||{})[t] || (h.skip||{})[t] || (h.excuse||{})[t] || !onDay(h,t)) return false;
  if(freqOf(h)==="count"){ const st = habitStats(it); return st.thisWeek < st.target; }
  return true;
}
// Check off one slot (the next open one unless slotId is given); the day counts once enough are done.
function checkSlot(it, slotId){
  const h = it.habit, t = todayStr(); h.slotLog = h.slotLog||{};
  const done = slotsDone(h, t); const id = slotId || ((h.slots||[]).find(s=>!done.includes(s.id))||{}).id;
  if(!id || done.includes(id)) return false;
  h.slotLog[t] = done.concat(id); markStart();
  if(!(h.log||{})[t] && h.slotLog[t].length >= slotNeed(h)) logHabit(it);
  return true;
}
function uncheckSlot(it, slotId){
  const h = it.habit, t = todayStr(); h.slotLog = h.slotLog||{};
  h.slotLog[t] = slotsDone(h, t).filter(x=>x!==slotId);
  if((h.log||{})[t] && h.slotLog[t].length < slotNeed(h)) delete h.log[t];
}
// Mark a habit done from any button: slot habits check their next slot.
function habitTap(it){ return freqOf(it.habit)==="slots" ? checkSlot(it) : logHabit(it); }
function slotDots(h, date, big){
  const done = slotsDone(h, date);
  return `<span class="sdots${big?" big":""}" aria-label="${done.length} of ${(h.slots||[]).length} done">${(h.slots||[]).map(s=>`<i class="${done.includes(s.id)?"on":""}"></i>`).join("")}</span>`;
}
function freqText(h){
  const f = freqOf(h);
  if(f==="count") return `${h.perWeek||3} day${(h.perWeek||3)===1?"":"s"} a week`;
  if(f==="slots") return (h.slots||[]).map(s=>s.label||"Slot").join(" · ") + ((h.days||[]).length<7 ? " · " + (h.days||[]).map(d=>DOWL[d].slice(0,3)).join(", ") : "");
  return (h.days||[]).length===7 ? "Every day" : (h.days||[]).map(d=>DOWL[d].slice(0,3)).join(", ");
}
// 3+ excuse notes on the same weekday in the last 6 weeks: suggest moving the habit off that day.
function excuseWeekday(it){
  const h = it.habit; if(freqOf(h)==="count" || (h.days||[]).length<2) return null;
  const n = [0,0,0,0,0,0,0];
  for(let k=1;k<=42;k++){ const d=new Date(); d.setDate(d.getDate()-k); if((h.excuse||{})[todayStr(d)]) n[d.getDay()]++; }
  const dow = n.findIndex((c,i)=>c>=3 && (h.days||[]).includes(i) && !(h.keepDay||[]).includes(i));
  return dow<0 ? null : {dow, count:n[dow]};
}
const ICON = {
  now:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>',
  dump:'<path d="M4 13h4l1.5 2.5h5L16 13h4"/><path d="M5 13l2-7h10l2 7v6H5z"/>',
  itin:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  hor:'<path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  back:'<path d="M15 6l-6 6 6 6"/>', close:'<path d="M6 6l12 12M18 6L6 18"/>',
  bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  send:'<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  clip:'<path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  check:'<path d="M5 12l5 5 9-10"/>', bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>', gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', grip:'<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>', chev:'<path d="M6 9l6 6 6-6"/>', doc:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>', bubble:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>', repeat:'<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'
};
const ico = (n,s=22,c="currentColor") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

/* ---------------- What can be done now ---------------- */
function actionables(){
  const out = [];
  for(const it of S.items){
    if(it.status!=="open") continue;
    if(it.type==="task" && (it.pinned || (it.due && daysUntil(it.due)<=0))) out.push({kind:"task", itemId:it.id, title:it.title, minutes:it.minutes||20, due:it.due, at:it.at, feeling:it.feeling, remaining:it.remaining, pinned:!!it.pinned});
    if(it.type==="assignment" || it.type==="goal"){
      const steps = it.steps||[];
      const next = steps.find(s=>!s.done);
      if(!steps.length) out.push({kind:"setup", itemId:it.id, title:`Set up the plan for ${it.title}`, parent:it.title, minutes:5, due:it.due, pinned:!!it.pinned});
      else if(next) out.push({kind:"step", itemId:it.id, stepId:next.id, title:next.title, parent:it.title, minutes:next.minutes||30, due:it.due, feeling:it.feeling, remaining:next.remaining, pinned:!!it.pinned});
    }
  }
  out.forEach(a=>{ if(!a.at && a.kind!=="setup"){ const p=placedAt({kind:a.kind,itemId:a.itemId,stepId:a.stepId}); if(p) a.at=p; } });
  const soon = a => a.due ? daysUntil(a.due) : 99;
  out.sort((a,b)=>{
    const pa=a.remaining!=null, pb=b.remaining!=null; if(pa!==pb) return pa?-1:1;
    if(a.at && b.at && a.at!==b.at) return a.at.localeCompare(b.at);
    const ua=soon(a)<=1, ub=soon(b)<=1; if(ua!==ub) return ua?-1:1;
    if(S.energy==="low") return a.minutes-b.minutes;
    if(S.energy==="peak") return b.minutes-a.minutes;
    const ea=a.feeling==="excited", eb=b.feeling==="excited"; if(ea!==eb) return ea?-1:1;
    return soon(a)-soon(b);
  });
  return out;
}
function habitsToday(){
  const d = new Date().getDay(), t = todayStr();
  return S.items.filter(i=>i.type==="habit" && habitDue(i, t))
    .sort((a,b)=>(a.habit.time||"99").localeCompare(b.habit.time||"99"));
}

/* ---------------- Render shell ---------------- */
function render(){
  const m = $("#main");
  if(tab==="now") m.innerHTML = viewNow();
  else if(tab==="dump") m.innerHTML = viewDump();
  else if(tab==="hor") m.innerHTML = viewHorizon();
  else if(tab==="itin") m.innerHTML = viewItinerary();
  renderTabs();
  if(tab==="itin") afterItinRender();
}
function renderTabs(){
  const T = [["now","Now","now"],["itin","Itinerary","itin"],["dump","Dump","dump"],["hor","Horizon","hor"]];
  $("#tabs").innerHTML = T.map(([k,l,i]) => `<button data-tab="${k}" ${tab===k?'aria-current="page"':''}>${ico(i)}${l}</button>`).join("");
}

/* ---------------- Now ---------------- */
const SCENES = {"low": "<svg width=\"390\" height=\"190\" viewBox=\"0 0 390 190\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\" class=\"scene\">\n<rect width=\"390\" height=\"190\" fill=\"#F6E7D3\"></rect>\n<circle cx=\"270\" cy=\"92\" r=\"34\" fill=\"#F4C48E\"></circle>\n<g class=\"drift\" style=\"animation-duration:30s\"><ellipse cx=\"90\" cy=\"38\" rx=\"24\" ry=\"8\" fill=\"#FFFFFF\" opacity=\".7\"></ellipse></g>\n<rect y=\"98\" width=\"390\" height=\"50\" fill=\"#A9CBDD\"></rect>\n<g class=\"wave\" stroke=\"#E2EFF5\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M30 112 h30 M120 120 h40 M220 110 h26 M300 124 h36 M60 134 h24 M170 138 h30\"></path></g>\n<path d=\"M-20 150 Q195 128 410 150 V190 H-20z\" fill=\"#EBD6B2\"></path>\n<path d=\"M300 172 L312 112\" stroke=\"#8A6A4A\" stroke-width=\"3\"></path>\n<path d=\"M276 118 Q312 92 348 108 Z\" fill=\"#E4826B\"></path><path d=\"M300 112 Q312 96 324 104\" stroke=\"#F4A48F\" stroke-width=\"2\" fill=\"none\"></path>\n<g><rect x=\"150\" y=\"166\" width=\"62\" height=\"9\" rx=\"3\" fill=\"#3B5BA9\"></rect>\n  <rect x=\"158\" y=\"161\" width=\"34\" height=\"8\" rx=\"4\" fill=\"#C68A5E\"></rect>\n  <rect x=\"164\" y=\"160\" width=\"14\" height=\"9\" rx=\"3\" fill=\"#C8432B\"></rect>\n  <circle cx=\"198\" cy=\"165\" r=\"5\" fill=\"#C68A5E\"></circle><path d=\"M192 161 q6 -7 12 0 z\" fill=\"#E9C46A\"></path></g>\n<g><rect x=\"222\" y=\"172\" width=\"62\" height=\"9\" rx=\"3\" fill=\"#E9C46A\"></rect>\n  <rect x=\"230\" y=\"167\" width=\"34\" height=\"8\" rx=\"4\" fill=\"#F0C8A0\"></rect>\n  <rect x=\"236\" y=\"166\" width=\"14\" height=\"9\" rx=\"3\" fill=\"#2C7A6E\"></rect>\n  <circle cx=\"270\" cy=\"171\" r=\"5\" fill=\"#F0C8A0\"></circle></g>\n</svg>", "steady": "<svg width=\"390\" height=\"190\" viewBox=\"0 0 390 190\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\" class=\"scene\">\n<rect width=\"390\" height=\"190\" fill=\"#DFE8F1\"></rect>\n<g class=\"drift\"><ellipse cx=\"70\" cy=\"40\" rx=\"26\" ry=\"9\" fill=\"#FFFFFF\" opacity=\".8\"></ellipse><ellipse cx=\"88\" cy=\"34\" rx=\"16\" ry=\"8\" fill=\"#FFFFFF\" opacity=\".8\"></ellipse></g>\n<g class=\"drift\" style=\"animation-duration:26s\"><ellipse cx=\"250\" cy=\"28\" rx=\"20\" ry=\"7\" fill=\"#FFFFFF\" opacity=\".7\"></ellipse></g>\n<circle cx=\"300\" cy=\"52\" r=\"24\" fill=\"#F2D4A4\"></circle>\n<path d=\"M0 120 Q90 92 190 112 T390 104 V190 H0z\" fill=\"#B9CFC0\"></path>\n<g fill=\"#7FA48E\"><circle cx=\"40\" cy=\"104\" r=\"16\"></circle><circle cx=\"62\" cy=\"98\" r=\"20\"></circle><circle cx=\"330\" cy=\"98\" r=\"18\"></circle><circle cx=\"352\" cy=\"104\" r=\"14\"></circle></g>\n<g fill=\"#6B5A48\"><rect x=\"60\" y=\"112\" width=\"4\" height=\"12\"></rect><rect x=\"329\" y=\"110\" width=\"4\" height=\"12\"></rect></g>\n<path d=\"M0 158 Q130 132 230 150 T390 140 V190 H0z\" fill=\"#A7C2AE\"></path>\n<path d=\"M-10 176 Q140 146 250 162 T400 150\" stroke=\"#EDE4D3\" stroke-width=\"16\" fill=\"none\" stroke-linecap=\"round\"></path>\n<g class=\"bob\"><g transform=\"translate(214 160) scale(1 1)\">\n  <circle cx=\"0\" cy=\"-31\" r=\"5\" fill=\"#C68A5E\"></circle>\n  <path d=\"M0 -26 L2 -12\" stroke=\"#C8432B\" stroke-width=\"6\" stroke-linecap=\"round\"></path>\n  <path d=\"M1 -22 L-6 -16 M1 -22 L8 -19\" stroke=\"#C68A5E\" stroke-width=\"2.4\" stroke-linecap=\"round\"></path>\n  <path d=\"M2 -12 L-5 -2 L-9 -1 M2 -12 L8 -4 L12 -6\" stroke=\"#34415E\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"></path>\n</g></g>\n<g class=\"bob2\"><g transform=\"translate(240 156) scale(1 1)\">\n  <circle cx=\"0\" cy=\"-31\" r=\"5\" fill=\"#F0C8A0\"></circle>\n  <path d=\"M0 -26 L2 -12\" stroke=\"#3B5BA9\" stroke-width=\"6\" stroke-linecap=\"round\"></path>\n  <path d=\"M1 -22 L-6 -16 M1 -22 L8 -19\" stroke=\"#F0C8A0\" stroke-width=\"2.4\" stroke-linecap=\"round\"></path>\n  <path d=\"M2 -12 L-5 -2 L-9 -1 M2 -12 L8 -4 L12 -6\" stroke=\"#34415E\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"></path>\n</g></g>\n</svg>", "peak": "<svg width=\"390\" height=\"190\" viewBox=\"0 0 390 190\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\" class=\"scene\">\n<rect width=\"390\" height=\"190\" fill=\"#D9E6F4\"></rect>\n<circle cx=\"70\" cy=\"44\" r=\"20\" fill=\"#F5D08F\"></circle>\n<g class=\"drift\" style=\"animation-duration:22s\"><ellipse cx=\"150\" cy=\"36\" rx=\"22\" ry=\"7\" fill=\"#FFFFFF\" opacity=\".8\"></ellipse></g>\n<path d=\"M-20 190 L80 112 L170 190 Z\" fill=\"#A3B6CD\"></path>\n<path d=\"M120 190 L280 18 L420 190 Z\" fill=\"#7F96B6\"></path>\n<path d=\"M262 38 L280 18 L298 38 L288 44 L276 40 Z\" fill=\"#F2F5F9\"></path>\n<path d=\"M170 190 L205 150 L188 130 L226 98 L214 80 L262 48 L276 26\" stroke=\"#FFFFFF\" stroke-width=\"2\" stroke-dasharray=\"4 4\" fill=\"none\" stroke-linecap=\"round\"></path>\n<path d=\"M280 18 V2\" stroke=\"#14213D\" stroke-width=\"2\"></path><path class=\"pennant\" d=\"M281 3 h14 l-4 5 l4 5 h-14z\" fill=\"#C8432B\"></path>\n<g class=\"step\"><g transform=\"translate(212 134)\">\n  <rect x=\"-9\" y=\"-27\" width=\"7\" height=\"12\" rx=\"2\" fill=\"#2C7A6E\"></rect>\n  <circle cx=\"1\" cy=\"-32\" r=\"4.5\" fill=\"#C68A5E\"></circle>\n  <path d=\"M0 -27 L-1 -14\" stroke=\"#C8432B\" stroke-width=\"6\" stroke-linecap=\"round\"></path>\n  <path d=\"M-1 -14 L-5 -3 M-1 -14 L4 -5 L6 -3\" stroke=\"#34415E\" stroke-width=\"2.6\" stroke-linecap=\"round\" fill=\"none\"></path>\n  <path d=\"M1 -22 L8 -14 L10 -2\" stroke=\"#6B7A90\" stroke-width=\"1.6\" stroke-linecap=\"round\" fill=\"none\"></path>\n</g></g>\n<g class=\"step\"><g transform=\"translate(238 102)\">\n  <rect x=\"-9\" y=\"-27\" width=\"7\" height=\"12\" rx=\"2\" fill=\"#B86A12\"></rect>\n  <circle cx=\"1\" cy=\"-32\" r=\"4.5\" fill=\"#F0C8A0\"></circle>\n  <path d=\"M0 -27 L-1 -14\" stroke=\"#3B5BA9\" stroke-width=\"6\" stroke-linecap=\"round\"></path>\n  <path d=\"M-1 -14 L-5 -3 M-1 -14 L4 -5 L6 -3\" stroke=\"#34415E\" stroke-width=\"2.6\" stroke-linecap=\"round\" fill=\"none\"></path>\n  <path d=\"M1 -22 L8 -14 L10 -2\" stroke=\"#6B7A90\" stroke-width=\"1.6\" stroke-linecap=\"round\" fill=\"none\"></path>\n</g></g>\n</svg>"};
function timedToday(){
  const t=todayStr(), dow=new Date().getDay(); const out=[];
  const hr = s => { if(!s) return null; const [h,m]=s.split(":").map(Number); return h+m/60; };
  for(const i of S.items){
    if(i.type==="habit" && i.status==="open" && freqOf(i.habit)==="slots" && onDay(i.habit,t)){ const dn=slotsDone(i.habit,t); (i.habit.slots||[]).filter(s=>s.time).forEach(s=>out.push({h:hr(s.time), label:i.title+" · "+(s.label||"Slot"), kind:"habit", done:dn.includes(s.id), id:i.id})); }
    else if(i.type==="habit" && i.status==="open" && onDay(i.habit,t) && i.habit.time && !(i.habit.excuse||{})[t]){ out.push({h:hr(i.habit.time), label:i.title, kind:"habit", done:!!(i.habit.log||{})[t], id:i.id}); }
    if(i.type==="event" && i.status==="open" && i.event && i.event.date===t && i.event.time){ out.push({h:hr(i.event.time), label:i.title, kind:"event", done:false, id:i.id}); }
    if(i.type==="task" && i.at && i.due===t){ out.push({h:hr(i.at), label:i.title, kind:"task", done:i.status==="done", id:i.id}); }
  }
  for(const p of ((S.plan||{})[t]||[])){ if(p.proposed) continue; const inf=refTitle(p.ref); if(inf) out.push({h:hr(p.start), label:inf.title, kind:p.ref.kind=="habit"?"habit":"task", done:inf.done, id:p.ref.itemId}); }
  return out.filter(x=>x.h!=null).sort((a,b)=>a.h-b.h);
}
function dayStrip(){
  const items = timedToday(); if(!items.length) return "";
  const groups=[]; for(const x of items){ const g=groups[groups.length-1]; if(g && x.h-g.end<1){ g.items.push(x); g.end=x.h; } else groups.push({start:x.h,end:x.h,items:[x]}); }
  const now=new Date(); const nh=now.getHours()+now.getMinutes()/60;
  const s0=Math.min(7, Math.floor(items[0].h)), s1=Math.max(22, Math.ceil(items[items.length-1].h));
  const pct=h=>Math.max(2,Math.min(98,(h-s0)/(s1-s0)*100));
  const fmtH=h=>{ const d=new Date(); d.setHours(Math.floor(h), Math.round((h%1)*60),0,0); return d.toLocaleTimeString(undefined,{hour:"numeric",minute: (h%1)?"2-digit":undefined}); };
  const col={habit:"var(--blue)",event:"var(--muted)",task:"var(--gem)"};
  let lastLab = -100;
  const showLab = p => { if(p-lastLab < 15) return false; lastLab = p; return true; };
  let marks = groups.map((g,k)=>{ const mid=(g.start+g.end)/2; const allDone=g.items.every(x=>x.done);
    if(g.items.length>1) return `<button class="sdot grp" data-strip="${k}" style="left:${pct(mid)}%;${allDone?"background:#B3C2DA":""}" aria-label="${g.items.length} plans, ${fmtH(g.start)} to ${fmtH(g.end)}">${g.items.length}${showLab(pct(mid))?`<span>${fmtH(g.start).replace(/\s?[AP]M/,"")}–${fmtH(g.end)}</span>`:""}</button>`;
    const x=g.items[0]; return `<button class="sdot" data-strip="${k}" style="left:${pct(x.h)}%;background:${x.done?"#B3C2DA":col[x.kind]}" aria-label="${esc(x.label)} at ${fmtH(x.h)}">${x.done?ico("check",9,"#fff"):""}${showLab(pct(x.h))?`<span>${fmtH(x.h)}</span>`:""}</button>`; }).join("");
  const nowMark = nh>=s0 && nh<=s1 ? `<div class="snow" style="left:${pct(nh)}%"><i></i><span>Now</span></div>` : "";
  let open = "";
  if(stripOpen>=0 && groups[stripOpen]) open = `<div class="fact" style="margin-top:6px;display:flex;flex-direction:column;gap:4px">${groups[stripOpen].items.map(x=>`<span class="small"${x.done?' style="color:var(--muted);text-decoration:line-through"':""}><b>${fmtH(x.h)}</b> · ${esc(x.label)}</span>`).join("")}</div>`;
  return `<div class="card" style="gap:8px;padding:12px 14px 14px"><div class="row" style="justify-content:space-between"><b>Your day</b><button class="btn text" data-tab="itin" style="min-height:28px;padding:0;color:var(--blue);font-size:12px">Open Itinerary</button></div><div class="strip"><div class="sline"></div><div class="sdone" style="width:${pct(Math.min(Math.max(nh,s0),s1))}%"></div>${marks}${nowMark}</div>${open}</div>`;
}
function streakChip(){
  const {current, best} = streakCalc(S.starts, S.restDays, todayStr());
  const [big, small] = current ? [`${current} day${current===1?"":"s"}`, "start streak"] : best ? ["Start a new one today", `Best: ${best} day${best===1?"":"s"}`] : ["Start today", "start streak"];
  return `<div class="nh-streak" role="status" aria-label="${current?`Start streak: ${big}`:`${big}. ${small}`}"><b>${big}</b><span>${small}</span></div>`;
}
function headerNow(){
  const lab = {low:"Low",steady:"Steady",peak:"Peak"}[S.energy];
  const date = new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  let menu = "";
  if(energyMenu) menu = `<div class="emenu" role="menu">${[["low","Low energy","Small steps first, a recharge built in"],["steady","Steady","Your normal plan"],["peak","Peak","Big steps first, more of the day"]].map(([k,l,s])=>`<button role="menuitemradio" aria-checked="${S.energy===k}" data-energy="${k}"><b>${l}</b><span>${s}</span></button>`).join("")}</div>`;
  return `<div class="nowhero"><div class="scenewrap">${SCENES[S.energy]}</div>
    <div class="nh-title"><h1>Now</h1><span>${date}</span></div>
    ${streakChip()}
    <button class="nh-chip left" data-emenu aria-expanded="${energyMenu}" aria-label="Energy today: ${lab}. Change">Energy · ${lab} ${ico("chev",14)}</button>
    ${menu}</div>`;
}
function viewNow(){
  const list = actionables(), habits = habitsToday();
  const t = todayStr(); const ds = (S.day||{})[t] || {steps:0,habits:0,min:0};
  let b = "";
  // sleep check-in: mornings, once a day
  const hr = new Date().getHours();
  if(hr < 12 && !(S.sleep||{})[t]) b += `<div class="card" style="gap:8px;padding:12px 14px"><b>How'd you sleep?</b><div class="row" style="gap:6px">${[["rough","Rough"],["okay","Okay"],["good","Good"]].map(([k,l])=>`<button class="chipbtn" data-sleep="${k}" style="flex:1;text-align:center">${l}</button>`).join("")}</div></div>`;
  if(S.sleepHint===t && S.energy!=="low") b += `<div class="understand"><span style="flex:1">Short night. Want a lighter day? Small steps first, with a recharge built in.</span><button class="chipbtn on" data-energy="low" style="flex-shrink:0;min-height:34px">Low energy</button></div>`;
  const picks = list.filter(a=>a.pinned), rest = list.filter(a=>!a.pinned);
  const order = picks.concat(rest);
  if(focus){
    const info = refInfo(focus.ref);
    if(info){ const R=26, C=2*Math.PI*R, r=remainingNow(), frac=Math.min(1,Math.max(0,1-r/focus.total));
      b += `<div class="nextcard active"><div class="tmain"><span class="label" style="color:#8FD3AE">Active${info.sub&&info.sub!=="Task"?" · "+esc(info.sub):""}</span><h2>${esc(info.title)}</h2><div class="row" style="gap:12px"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" fill="none" stroke="#2A3A5E" stroke-width="6"/><circle id="activeArc" cx="32" cy="32" r="${R}" fill="none" stroke="#8FD3AE" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(C*frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div><span id="activeTime" style="font-size:28px;font-weight:700;font-variant-numeric:tabular-nums">${fmt(Math.max(r,-5999))}</span><br><span class="tiny" style="color:#A9B6D4">${r>=0?"left":"over"} · ${focus.running?"running":"paused"}</span></div></div></div>
      <div class="tstub" style="border-color:#2F416B"><button class="btn" data-fopen style="background:#8FD3AE;color:#14213D;min-height:42px;width:76px">Open</button><button class="btn" data-ftoggle-card style="background:transparent;border:1.5px solid #3A4C78;color:#fff;min-height:38px;width:76px;font-size:13px">${focus.running?"Pause":"Resume"}</button><button class="btn" data-fdonecard style="background:transparent;border:1.5px solid #3A4C78;color:#fff;min-height:38px;width:76px;font-size:13px">Done</button></div></div>`; }
  } else if(order.length){
    const top = order[0];
    b += `<div class="nextcard"><div class="tmain"><span class="label">${top.pinned?"Your pick":top.kind==="setup"?"Planning step":"Up next"}${top.parent&&top.kind!=="setup"?" · "+esc(top.parent):""}</span><h2>${esc(top.title)}</h2>${top.kind==="setup"?`<span class="small" style="color:var(--ink2)">Share the instructions or describe it, and the app builds the steps with you.</span>`:""}<div class="tags">${actChips(top)}</div></div>
      <div class="tstub">${top.kind==="setup"?`<button class="btn coral" data-open="${top.itemId}" style="min-height:46px">Plan it</button>`:`<button class="btn coral" ${actAttr(top)} style="min-height:46px">Start</button><button class="btn text" data-lowsheet style="min-height:32px;font-size:12px;padding:0">Not feeling it</button>`}</div></div>`;
  }
  b += dayStrip();
  // deck
  const deck = [];
  if(!focus) order.slice(1).forEach(a=>deck.push({lab:a.pinned?"Your pick":a.due&&daysUntil(a.due)<=1?dueLabel(a.due):a.parent?esc(a.parent):"Task", col:a.pinned?"var(--coral)":"var(--amber)", title:a.title, meta:`${a.minutes} min`, attr:a.kind==="setup"?`data-open="${a.itemId}"`:actAttr(a)}));
  else order.filter(a=>!isActive({kind:a.kind, itemId:a.itemId, stepId:a.stepId})).forEach(a=>deck.push({lab:a.pinned?"Your pick":"Up next", col:"var(--coral)", title:a.title, meta:`${a.minutes} min`, attr:`data-open="${a.itemId}"`}));
  habits.forEach(h=>{ const r=(h.habit.routine||{})[new Date().getDay()];
    if(freqOf(h.habit)==="slots"){ const dn=slotsDone(h.habit,t), nx=(h.habit.slots||[]).find(s=>!dn.includes(s.id))||{};
      deck.push({lab:(nx.time?timeLabel(nx.time)+" · ":"")+"Habit", col:"var(--blue)", title:h.title, meta:`${slotDots(h.habit,t)} ${esc(nx.label||"")}`, attr:`data-hstart="${h.id}"`, done:h.id}); return; }
    deck.push({lab:(h.habit.time?timeLabel(h.habit.time)+" · ":"")+"Habit", col:"var(--blue)", title:h.title+(r?" · "+r:""), meta:`${h.habit.minimum||10} min`, attr:`data-hstart="${h.id}"`, done:h.id}); });
  if(deck.length) b += `<div class="row" style="justify-content:space-between"><b>Also on deck</b><span class="tiny muted">${deck.length>2?"swipe":""}</span></div><div class="deck">${deck.map(c=>`<div class="dcard"><button ${c.attr} class="dbody"><span style="color:${c.col}">${c.lab}</span><b>${esc(c.title)}</b><em>${c.meta}</em></button>${c.done?`<button class="dcheck" data-hdone="${c.done}" aria-label="Mark ${esc(c.title)} done">${ico("check",14)}</button>`:""}</div>`).join("")}</div>`;
  // done for today
  if(!focus && !order.length && !habits.length){
    const anyPlanned = S.items.some(i=>i.type!=="unplanned");
    if(anyPlanned && (ds.steps||ds.habits)){
      b += `<div class="donecard"><span class="tiny" style="color:#8FD3AE;font-weight:700">Done for today</span><b style="font-size:20px;line-height:1.25">That's everything on today's plan.</b><div class="row" style="gap:6px">${[[ds.steps,"steps"],[ds.habits,"habits"],[(ds.min/60).toFixed(1),"hrs focused"]].map(([a,l])=>`<div class="dstat"><b>${a}</b><span>${l}</span></div>`).join("")}</div><span style="color:#E3E8F4;font-size:14px;line-height:1.45">This time is yours. Resting is part of the plan, and it counts. Rest refreshes most when you step away from work in your head too.</span></div>`;
      const opts = [];
      S.items.filter(i=>i.type==="habit"&&i.status==="open"&&!(i.habit.log||{})[t]).slice(0,2).forEach(h=>opts.push({t:h.title, s:"A habit · not scheduled today", attr:`data-hstart="${h.id}"`}));
      S.items.filter(i=>i.type==="idea"&&i.status==="open").slice(0,1).forEach(i=>opts.push({t:"Think about: "+i.title, s:"From your Someday ideas", attr:`data-open="${i.id}"`}));
      S.items.filter(i=>(i.type==="assignment"||i.type==="goal")&&i.status==="open").slice(0,1).forEach(i=>opts.push({t:"Get ahead on "+i.title, s:"Optional", attr:`data-open="${i.id}"`}));
      if(opts.length) b += `<div class="row" style="justify-content:space-between"><b>If you feel like it</b><span class="tiny muted">optional, all of it</span></div><div class="card" style="padding:4px 4px;gap:0">${opts.map(o=>`<button class="pick" ${o.attr} style="border-radius:12px"><span class="grow"><span class="t">${esc(o.t)}</span><span class="m">${o.s}</span></span></button>`).join("")}</div>`;
    } else {
      const unplanned = S.items.filter(i=>i.type==="unplanned").length, tasks = S.items.filter(i=>i.type==="task"&&i.status==="open").length;
      b += `<div class="empty">${unplanned?`<h2>${unplanned} thing${unplanned>1?"s":""} waiting in Clean-up</h2><p class="muted small" style="margin:0">Plan one and it can show up here.</p><button class="btn coral" data-hor="shelf">Go to Clean-up</button>`
        : tasks?`<h2>Nothing picked for now</h2><p class="muted small" style="margin:0">You have ${tasks} task${tasks>1?"s":""}. Add one to Now when you're ready.</p><button class="btn coral" data-hor="task">Open Tasks</button>`
        :`<h2>Nothing planned yet</h2><p class="muted small" style="margin:0">Dump whatever's on your mind. You'll plan it on the Shelf, then it shows up here.</p><button class="btn coral" data-tab="dump">Go to Dump</button>`}</div>`;
    }
  }
  const events = S.items.filter(i=>i.type==="event" && i.status==="open" && i.event && i.event.date===t);
  if(events.length) b += `<div class="evnote">${ico("itin",18)}<span>${events.map(e=>`<b>${e.event.time?esc(timeLabel(e.event.time)):"Today"}</b> · ${esc(e.title)}${e.feeling==="excited"?" · evening kept free":""}`).join("<br>")}</span></div>`;
  return headerNow() + `<div class="pad">${b}</div>`;
}
function lowSheet(){
  const kinds = [["sleepy","Sleepy","Heavy eyes, foggy head",["A 10-minute walk outside: daylight and movement wake you up","A 10 to 20 minute nap with an alarm (before mid-afternoon)","Quick movement: stretch and 20 jumping jacks"]],
    ["drained","Drained","Running on empty",["Do the smallest possible piece, then take a real break","Water and a real snack (sugar tends to make the dip worse)"]],
    ["bored","Bored","Can't make myself care",["Change the scene: new spot, new playlist","Make it a game: race a 10-minute timer"]],
    ["overwhelmed","Overwhelmed","Too much at once",["Cyclic sighing for 5 minutes: two breaths in through the nose, one long breath out","Write the one next action on paper; ignore the rest"]],
    ["down","Low mood","Just feeling down",["Something gentle first, like a short walk","Message a friend, or work alongside someone"]]];
  const el=document.createElement("div"); el.className="scrim"; el.id="scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Not feeling it"><div class="grab"></div><b style="font-size:20px">What kind of low is it?</b><span class="small muted" style="margin-top:-6px">One tap. It changes what helps.</span><div class="typegrid">${kinds.map(([k,l,s])=>`<button class="typecard" data-lowkind="${k}" style="--c:var(--blue)"><b>${l}</b><span>${s}</span></button>`).join("")}<button class="typecard" data-fivemin style="--c:var(--coral)"><b>Just start</b><span>A 5-minute promise</span></button></div><div id="lowTips"></div></div>`;
  $("#app").appendChild(el);
  el.querySelectorAll("[data-lowkind]").forEach(btn=>btn.addEventListener("click",()=>{ const k=kinds.find(x=>x[0]===btn.dataset.lowkind); $("#lowTips").innerHTML=`<div class="card" style="gap:8px;background:var(--bg)"><b>${k[1]}: try one</b>${k[3].map(t=>`<span class="small">· ${esc(t)}</span>`).join("")}<button class="btn coral" data-fivemin style="margin-top:4px">Then start with 5 minutes</button></div>`; }));
}
let stripOpen = -1, energyMenu = false;
function isActive(ref){ return focus && focus.ref.itemId===ref.itemId && (focus.ref.stepId||null)===(ref.stepId||null) && focus.ref.kind===ref.kind; }
function actAttr(a){ return a.kind==="setup" ? `data-open="${a.itemId}"` : `data-go-task="${a.itemId}" data-step="${a.stepId||""}"`; }
function actChips(a){
  let c0 = a.at ? `<span class="chip blue">${timeLabel(a.at)}</span>` : "";
  let c = c0 + (a.remaining!=null ? `<span class="chip blue">Paused · ${Math.ceil(a.remaining/60)} min left</span>` : `<span class="chip">${a.minutes} min</span>`);
  if(a.due) c += `<span class="chip due">${dueLabel(a.due)}</span>`;
  if(a.feeling==="excited") c += `<span class="chip exc">Excited</span>`;
  if(a.feeling==="scary") c += `<span class="chip scary">Feels scary</span>`;
  return c;
}

/* ---------------- Dump ---------------- */
function viewDump(){
  const recent = S.items.slice().sort((a,b)=>b.created-a.created).slice(0,8);
  return `<div class="pad" style="padding-top:20px">
    <div><h1>Dump</h1><p class="muted" style="margin:4px 0 0">One thought per dump. Get it out of your head; plan it later.</p></div>
    <div class="card">
      <label for="dumpIn" class="tiny muted" style="font-weight:600">What's on your mind?</label>
      <input id="dumpIn" class="dump" type="text" enterkeyhint="done" autocomplete="off" placeholder="One thought, any way you'd say it…">
      <button class="btn coral" id="dumpBtn">Dump it</button>
      <span class="tiny muted">Saved exactly as you wrote it, straight to Clean-up on the Shelf.</span>
    </div>
    ${recent.length?`<b>Recently dumped</b>`:""}
    ${recent.map(i=>`<div class="item"><div class="top"><span class="title">${esc(i.type==="unplanned"?i.raw:i.title)}</span>${i.type==="unplanned"?`<button class="btn text" data-plan="${i.id}" style="min-height:36px;padding:0 6px;color:var(--blue)">Plan it</button>`:""}<button class="iconbtn" data-dumpdel="${i.id}" aria-label="Delete ${esc(i.type==="unplanned"?i.raw:i.title)}" style="width:36px;height:36px">${ico("trash",18)}</button></div><span class="tiny muted">${i.type==="unplanned"?"In Clean-up":"Planned · "+TYPES[i.type]+(i.status==="done"?" · done":"")}</span></div>`).join("")}
  </div>`;
}
function doDump(){
  const inp = $("#dumpIn"); const text = inp.value.replace(/\s+/g," ").trim(); if(!text){ inp.focus(); return; }
  S.items.push({id:uid(), raw:text.slice(0,200), title:text.slice(0,200), type:"unplanned", status:"open", created:Date.now()});
  save(); inp.value=""; toast("Dumped to Clean-up"); render(); const n=$("#dumpIn"); if(n) n.focus();
}

/* ---------------- Horizon ---------------- */
function viewHorizon(){
  const seg = [["task","Tasks"],["assignment","Assignments"],["goal","Goals"],["habit","Habits"],["shelf","Shelf"]].map(([k,l])=>`<button data-hor="${k}" aria-pressed="${horView===k}">${l}</button>`).join("");
  let body = "";
  if(horView==="shelf") body = viewShelf();
  else if(horView==="habit") body = viewHabits();
  else if(horView==="task") body = viewTasks();
  else body = viewProjects(horView);
  return `<div class="pad" style="padding-top:20px;padding-bottom:4px"><h1>Horizon</h1><div class="seg" style="gap:2px">${seg.replace(/<button /g,'<button style="font-size:13px;padding:0 2px" ')}</div></div><div class="pad" style="padding-top:6px">${body}</div>`;
}
function viewShelf(){
  const unplanned = S.items.filter(i=>i.type==="unplanned").sort((a,b)=>b.created-a.created);
  const ideas = S.items.filter(i=>i.type==="idea" && i.status==="open");
  const done = S.items.filter(i=>i.status==="done" && i.type!=="unplanned").sort((a,b)=>(b.doneAt||"").localeCompare(a.doneAt||"")).slice(0,8);
  const row = (i, label, sub, attr) => `<div class="item" style="flex-direction:row;align-items:center"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-weight:600">${esc(label)}</span><span class="tiny muted">${sub}</span></div><button class="btn ink" ${attr} style="min-height:38px;padding:0 14px;font-size:13px">Plan it</button></div>`;
  const when = i => new Date(i.created).toLocaleDateString(undefined,{month:"short",day:"numeric"});
  return `<div class="row" style="justify-content:space-between"><b>Clean-up${unplanned.length?" · "+unplanned.length:""}</b><span class="tiny muted">Everything you dump lands here</span></div>
    ${unplanned.length?unplanned.map(i=>row(i,i.raw,"Dumped "+when(i),`data-plan="${i.id}"`)).join(""):`<p class="small muted" style="margin:0">Nothing to clean up. Dump a thought and it lands here.</p>`}
    <div class="row" style="justify-content:space-between;margin-top:6px"><b>Someday ideas</b><span class="tiny muted">Develop them over time</span></div>
    ${ideas.length?ideas.map(i=>{ const rd=i.readiness||[]; const clear=rd.filter(r=>(r.state||"").toLowerCase().startsWith("clear")).length; return row(i,i.title, rd.length?`${clear} of ${rd.length} parts clear`:"Not thought through yet", `data-open="${i.id}"`); }).join(""):`<p class="small muted" style="margin:0">Ideas you want to develop live here.</p>`}
    <div class="row" style="justify-content:space-between;margin-top:6px"><b>Completed</b><span class="tiny muted">Kept forever</span></div>
    ${done.length?done.map(i=>`<button class="item" data-open="${i.id}" style="flex-direction:row;align-items:center;border:none;text-align:left;width:100%"><span style="color:var(--green)">${ico("check",20)}</span><div style="flex:1"><span style="font-weight:600">${esc(i.title)}</span><br><span class="tiny muted">${TYPES[i.type]||"Task"}${i.doneAt?" · done "+new Date(i.doneAt).toLocaleDateString(undefined,{month:"short",day:"numeric"}):""}</span></div></button>`).join(""):`<p class="small muted" style="margin:0">Finished assignments, goals and tasks collect here.</p>`}`;
}
function routeHTML(steps){
  if(!steps.length) return "";
  const n = steps.length, cur = steps.findIndex(s=>!s.done); const c = cur<0?n:cur;
  return `<div style="display:flex;gap:4px">${steps.map((s,k)=>`<div style="flex:1;height:6px;border-radius:3px;background:${k<c?"var(--blue)":k===c?"var(--coral)":"var(--line)"}"></div>`).join("")}</div>`;
}
function viewProjects(type){
  const items = S.items.filter(i=>i.type===type && i.status==="open").sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  const name = type==="assignment"?"assignments":"goals";
  if(!items.length) return `<div class="empty"><h2>No ${name} yet</h2><p class="muted small" style="margin:0">Dump one, then plan it on the Shelf as ${type==="assignment"?"an assignment":"a goal"}.</p><button class="btn coral" data-tab="dump">Go to Dump</button></div>`;
  return items.map(i=>{
    const steps = i.steps||[]; const next = steps.find(s=>!s.done); const done = steps.filter(s=>s.done).length;
    return `<button class="card" data-open="${i.id}" style="border:none;text-align:left;width:100%">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><span style="font-size:17px;font-weight:700">${esc(i.title)}</span>${i.due?`<span class="chip due">${dueLabel(i.due)}</span>`:""}</div>
      ${steps.length?routeHTML(steps)+`<span class="small muted">${done} of ${steps.length} steps · ${((i.minutesLogged||0)/60).toFixed(1)} hrs invested</span>`+(next?`<span class="small"><b>Next:</b> ${esc(next.title)} · ${next.minutes||30} min</span>`:"")
        :`<div style="border:1.5px dashed var(--line);border-radius:12px;padding:10px 12px"><b class="small">No plan yet</b><br><span class="tiny muted">Tap to share the instructions or describe it, and build the steps.</span></div>`}
    </button>`;
  }).join("");
}
function viewTasks(){
  const ts = S.items.filter(i=>i.type==="task" && i.status==="open");
  if(!ts.length) return `<div class="empty"><h2>No tasks yet</h2><p class="muted small" style="margin:0">Dump things like "buy eggs" or "dishes at 9 pm," then plan them as tasks.</p><button class="btn coral" data-tab="dump">Go to Dump</button></div>`;
  const today = ts.filter(i=>i.due && daysUntil(i.due)<=0).sort((a,b)=>(a.at||"99").localeCompare(b.at||"99"));
  const later = ts.filter(i=>i.due && daysUntil(i.due)>0).sort((a,b)=>a.due.localeCompare(b.due));
  const any = ts.filter(i=>!i.due).sort((a,b)=>a.created-b.created);
  const row = i => `<div class="item" style="flex-direction:row;align-items:center;gap:8px;padding:8px 8px 8px 6px"><button class="iconbtn" data-taskcheck="${i.id}" aria-label="Mark ${esc(i.title)} done"><span class="checkcirc"></span></button><button data-open="${i.id}" style="border:none;background:none;text-align:left;flex:1;min-width:0;display:flex;flex-direction:column;padding:0"><span style="font-weight:600">${esc(i.title)}</span><span class="tiny muted">${i.at?timeLabel(i.at)+" · ":""}${i.due?dueLabel(i.due)+" · ":""}${i.minutes||20} min${i.noTime?" · no set time":""}</span></button>${i.pinned?`<button class="chipbtn on" data-pin="${i.id}" style="min-height:34px">On Now</button>`:`<button class="chipbtn" data-pin="${i.id}" style="min-height:34px">Add to Now</button>`}</div>`;
  const sec = (t,arr) => arr.length ? `<div class="row" style="justify-content:space-between;margin-top:4px"><b>${t}</b><span class="tiny muted">${arr.length}</span></div>`+arr.map(row).join("") : "";
  return sec("Today", today) + sec("Coming up", later) + sec("Anytime", any);
}
function viewHabits(){
  const hs = S.items.filter(i=>i.type==="habit" && i.status==="open");
  if(!hs.length) return `<div class="empty"><h2>No habits yet</h2><p class="muted small" style="margin:0">Dump something like "meditate every morning," then plan it as a habit.</p><button class="btn coral" data-tab="dump">Go to Dump</button></div>`;
  const t = todayStr();
  return hs.map(h=>{ const st = habitStats(h), hb = h.habit, doneToday = st.log[t], slots = freqOf(hb)==="slots";
    return `<div class="card"><button data-open="${h.id}" style="border:none;background:none;text-align:left;padding:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:17px;font-weight:700">${esc(h.title)}</span><span class="tiny muted">${esc(freqText(hb))}${!slots&&hb.time?" · "+timeLabel(hb.time):""} · ${hb.minimum||10} min</span></button>
      <div class="row" style="align-items:baseline;gap:6px"><b style="font-size:26px">${st.thisWeek} of ${st.target}</b><span class="small muted">this week</span></div>
      ${weekDots(hb, st, t)}
      <div class="row" style="gap:8px"><div class="fact" style="flex:1;padding:8px 10px"><b>${st.last30} of ${st.of30}</b><br><span class="tiny muted">last 30 days</span></div><div class="fact" style="flex:1;padding:8px 10px"><b>${st.total}</b><br><span class="tiny muted">days in total</span></div></div>
      ${slots && onDay(hb,t) && !doneToday ? `<div class="row" style="gap:8px">${slotDots(hb,t,true)}<span class="small muted">${slotsDone(hb,t).length} of ${(hb.slots||[]).length} today · counts at ${slotNeed(hb)}</span></div>` : ""}
      ${doneToday?`<span class="small" style="color:var(--green);font-weight:600">${ico("check",16)} Done today</span>`:(st.exc[t]?"":`<button class="btn ghost" data-hdone="${h.id}">${slots?`Check off ${esc((((hb.slots||[]).find(s=>!slotsDone(hb,t).includes(s.id)))||{}).label||"next")}`:"Mark done today"}</button>`)}
      ${excuseRow(h)}
    </div>`; }).join("");
}
function weekDots(h, st, t){
  return `<div style="display:flex">${st.wk.map((d,k)=>{ const on=st.log[d], ex=!on&&st.exc[d];
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:28px;height:28px;border-radius:50%;${on?"background:var(--blue)":ex?"background:var(--line)":d===t?"border:2px dashed var(--coral)":"background:var(--bg)"};display:flex;align-items:center;justify-content:center;color:var(--muted)"${ex?` title="Something came up"`:""}>${on?ico("check",14,"#fff"):ex?"–":""}</div><span class="tiny muted">${DOW[k]}</span></div>`; }).join("")}</div>`;
}
// "Something came up": on a habit's day, or the next morning for yesterday.
function excuseRow(it){
  const h = it.habit, t = todayStr(), y = shiftDay(t,-1), exc = h.excuse||{}, log = h.log||{};
  if(exc[t]) return `<div class="row small muted" style="gap:8px"><span style="flex:1">Something came up today: ${esc(exc[t])}</span><button class="btn text" data-unexcuse="${it.id}" data-day="${t}" style="min-height:32px;padding:0;font-size:13px">Remove</button></div>`;
  const out = [];
  if(onDay(h,t) && !log[t]) out.push(`<button class="btn text" data-excuse="${it.id}" data-day="${t}" style="min-height:36px;padding:0;align-self:flex-start">Something came up</button>`);
  if(new Date().getHours()<12 && onDay(h,y) && !log[y] && !exc[y] && (it.plannedAt||0) < new Date(t+"T00:00:00").getTime()) out.push(`<button class="btn text" data-excuse="${it.id}" data-day="${y}" style="min-height:36px;padding:0;align-self:flex-start">Something came up yesterday?</button>`);
  return out.length ? `<div class="row" style="gap:16px;flex-wrap:wrap">${out.join("")}</div>` : "";
}
function excuseSheet(it, day){
  const el=document.createElement("div"); el.className="scrim"; el.id="scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Something came up"><div class="grab"></div><b style="font-size:20px">Something came up${day===todayStr()?"":" yesterday"}</b><span class="small muted" style="margin-top:-6px">${esc(it.title)} · this day won't count as a miss.</span><input id="excIn" class="dump" maxlength="80" placeholder="One line, for you" style="background:var(--bg)"><button class="btn coral" data-excsave="${it.id}" data-day="${day}">Save</button></div>`;
  $("#app").appendChild(el); $("#excIn").focus();
}
/* ---------------- Overlays: Plan it and item pages ---------------- */
function openOv(kind, id){ ov = {kind, id}; renderOv(); }
function closeOv(){ ov = null; const o=$("#ov"); if(o) o.remove(); render(); }
function closeOverlay(){ const s=$("#scrim"); if(s) s.remove(); const o=$("#ov"); if(o) o.remove(); render(); }
function ovShell(title, sub, inner){
  let el = $("#ov");
  if(!el){ el = document.createElement("div"); el.className="overlay"; el.id="ov"; el.style.background="var(--bg)"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); $("#app").appendChild(el); }
  el.setAttribute("aria-label", title);
  const keep = el.scrollTop;
  el.innerHTML = `<div style="position:sticky;top:0;z-index:2;background:var(--surface);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:6px;padding:10px 12px"><button class="iconbtn" data-ovclose aria-label="Back">${ico("back")}</button><div style="flex:1;min-width:0"><span class="tiny muted">${esc(sub)}</span><br><b style="font-size:17px">${esc(title)}</b></div></div><div class="pad" style="padding-top:14px;padding-bottom:28px">${inner}</div>`;
  el.scrollTop = keep;
}
function renderOv(){
  if(!ov) return; const it = itemById(ov.id); if(!it){ closeOv(); return; }
  if(ov.kind==="plan") renderPlan(it); else renderItem(it);
}

/* ---- Plan it ---- */
function chipBtn(label, attrs, on){ return `<button ${attrs} aria-pressed="${!!on}" class="chipbtn${on?" on":""}">${esc(label)}</button>`; }
const TYPE_INFO = {
  task:{label:"Task", desc:"One thing to do", col:"var(--coral)", icon:"check"},
  assignment:{label:"Assignment", desc:"Schoolwork with a due date", col:"var(--coral)", icon:"doc"},
  habit:{label:"Habit", desc:"Something to repeat", col:"var(--blue)", icon:"repeat"},
  goal:{label:"Goal", desc:"A bigger thing over time", col:"var(--green)", icon:"hor"},
  event:{label:"Event", desc:"Happens at a set time", col:"var(--muted)", icon:"itin"},
  idea:{label:"Someday idea", desc:"Not ready to plan yet", col:"var(--gem)", icon:"bulb"}
};
function freshDraft(type){ return {step:type?1:0, type:type||null, minutes:null, when:"today", date:"", settime:"none", at:"", due:"", feelVal:2, days:[1,2,3,4,5], freq:"days", perWeek:3, slots:[], minSlots:0, time:"", minimum:10, etime:"", repeat:"no", cls:"", why:"", cap:"", target:"none", source:"", thought:"", more:false}; }
function totalSteps(d){ return !d.type?4 : d.type==="task" ? (d.more?4:2) : (d.type==="event"||d.type==="idea") ? 2 : 4; }
function feelFrom(v){ v=+v; return v<=1?"scary":v>=3?"excited":null; }
function feelLabel(v){ return ["Really scary","A bit scary","Meh","Looking forward to it","Excited"][+v]; }
function planShell(it, inner, footer){
  const d = it.draft; const tot = totalSteps(d);
  const dots = `<div style="display:flex;gap:5px" aria-label="Step ${d.step+1} of ${tot}">${[...Array(tot)].map((_,i)=>`<span style="width:${i===d.step?18:7}px;height:7px;border-radius:4px;background:${i<=d.step?"var(--coral)":"var(--line)"}"></span>`).join("")}</div>`;
  let el = $("#ov");
  if(!el){ el = document.createElement("div"); el.id="ov"; $("#app").appendChild(el); }
  el.className="overlay"; el.style.background="var(--bg)"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Plan it");
  el.innerHTML = `<div style="display:flex;align-items:center;gap:6px;padding:10px 12px;flex-shrink:0"><button class="iconbtn" data-ovclose aria-label="Close">${ico("back")}</button><div style="flex:1;min-width:0"><span class="tiny muted">${d.fromIdea?"Turning an idea into a plan":"Clean-up"}</span><br><b style="font-size:17px">Plan it</b></div>${dots}<span style="width:8px"></span></div>
  <div id="planBody" style="flex:1;overflow-y:auto;padding:0 16px 16px;display:flex;flex-direction:column;gap:14px">${inner}</div>
  <div style="flex-shrink:0;padding:10px 16px 16px;display:flex;gap:8px;background:var(--bg)">${footer}</div>`;
  const l=$("#chatlog"); if(l) l.scrollTop=l.scrollHeight;
}
const btnBack = `<button class="btn ghost" data-pnav="back" style="min-height:52px;background:var(--surface)">Back</button>`;
const btnP = (label, attrs, dis) => `<button class="btn coral" ${attrs} ${dis?"disabled":""} style="flex:1;min-height:52px;font-size:15px;white-space:nowrap;padding:0 12px">${label}</button>`;
const btnS = (label, attrs) => `<button class="btn ghost" ${attrs} style="min-height:52px;background:var(--surface);white-space:nowrap;padding:0 14px;font-size:14px">${label}</button>`;
function chipRow(field, opts, cur){ return `<div class="tags">${opts.map(([v,l])=>`<button class="chipbtn${cur==v?" on":""}" aria-pressed="${cur==v}" data-pf="${field}" data-v="${v}">${l}</button>`).join("")}</div>`; }
function fieldLabel(t, opt){ return `<span style="font-size:14px;font-weight:600">${t}${opt?` <span class="muted" style="font-weight:400">optional</span>`:""}</span>`; }
function feelSlider(d, label){
  return `<div style="display:flex;flex-direction:column;gap:6px"><div class="row" style="justify-content:space-between">${fieldLabel(label||"How does it feel?")}<b class="small" style="color:${+d.feelVal<=1?"var(--coral)":+d.feelVal>=3?"var(--green)":"var(--muted)"}">${feelLabel(d.feelVal)}</b></div>
  <input type="range" min="0" max="4" step="1" value="${d.feelVal}" data-pfin="feelVal" class="feel" aria-label="How does it feel" aria-valuetext="${feelLabel(d.feelVal)}">
  <div class="row tiny muted" style="justify-content:space-between"><span>Really scary</span><span>Meh</span><span>Excited</span></div></div>`;
}
function nameRow(it, d){
  const sug = (it.ai && it.ai.titles && it.ai.titles[d.type]) || it.raw;
  return `<div class="card" style="gap:6px;padding:12px 14px"><label for="nameIn" class="tiny muted" style="font-weight:600">Name${it.ai&&it.ai.titles?" · suggested, tap to change":""}</label><input id="nameIn" class="dump" value="${esc(d.title||sug)}" style="min-height:46px;font-weight:700"></div>`;
}
function renderPlan(it){
  const d = it.draft || (it.draft = freshDraft());
  const T = d.type; let inner = "", footer = "";
  if(sampleFn && !it.ai && !it.aiBusy && !it.aiError) setTimeout(()=>understand(it), 0);
  if(d.step===0){
    inner += `<div class="card" style="gap:4px"><span class="tiny muted">You dumped</span><b style="font-size:18px">${esc(it.raw)}</b></div>`;
    if(sampleFn){
      if(it.aiBusy) inner += `<div class="thinking"><span class="dot3">Reading your note</span></div>`;
      else if(it.ai && it.ai.understanding) inner += `<div class="understand"><span style="flex:1">${esc(it.ai.understanding)}</span>${it.correcting?"":`<button class="chipbtn" data-notquite="${it.id}" style="flex-shrink:0;min-height:34px">Not quite</button>`}</div>${it.correcting?`<div class="row" style="gap:6px"><input id="corrIn" class="dump" placeholder="What did you mean?" style="flex:1;min-height:46px;background:var(--surface)"><button class="btn ink" data-corr="${it.id}" style="min-height:46px">Update</button></div>`:""}`;
    }
    inner += `<b style="font-size:18px;margin-top:4px">What is it?</b><div class="typegrid">${Object.entries(TYPE_INFO).map(([k,t])=>`<button class="typecard${T===k?" on":""}" aria-pressed="${T===k}" data-ptype="${k}" style="--c:${t.col}"><span class="ti">${ico(t.icon,20,t.col)}</span><b>${t.label}</b><span>${t.desc}</span></button>`).join("")}</div>`;
    footer = btnP("Next", `data-pnav="next"`, !T);
  } else if(T==="task"){
    if(d.step===1){
      inner += stepHead(it, "When will you do it?");
      inner += `<div>${fieldLabel("About how long?")}<div style="margin-top:8px">${chipRow("minutes",[[5,"5 min"],[15,"15 min"],[30,"30 min"],[60,"1 hr"],[120,"2 hr"]],d.minutes)}</div></div>`;
      inner += `<div>${fieldLabel("When?")}<div style="margin-top:8px">${chipRow("when",[["today","Today"],["tomorrow","Tomorrow"],["week","This week"],["anytime","Anytime"],["date","Pick a date"]],d.when)}</div>${d.when==="date"?`<input type="date" class="dump" data-pfin="date" value="${esc(d.date)}" style="margin-top:8px">`:""}</div>`;
      inner += `<div>${fieldLabel("Needs a set time?")}<div style="margin-top:8px">${chipRow("settime",[["none","No time needed"],["pick","Pick a time"]],d.settime)}</div>${d.settime==="pick"?`<input type="time" class="dump" data-pfin="at" value="${esc(d.at)}" style="margin-top:8px">`:`<span class="tiny muted" style="display:block;margin-top:6px">It stays a checklist item and never takes a time block.</span>`}</div>`;
      inner += nameRow(it, d);
      footer = btnS("More options", `data-pmore`) + btnP("Add to Tasks", `data-finish="${it.id}"`);
    } else if(d.step===2){ inner += helpStep(it, "task"); footer = btnBack + btnS("Skip", `data-pnav="next"`) + btnP("Next", `data-pnav="next"`); }
    else { inner += sendStep(it, d); footer = btnBack + btnP("Add to Tasks", `data-finish="${it.id}"`); }
  } else if(T==="event"){
    inner += stepHead(it, "When is it?");
    inner += `<div class="row" style="gap:10px;align-items:flex-start"><label style="flex:1">${fieldLabel("Date")}<input type="date" class="dump" data-pfin="date" value="${esc(d.date)}" style="margin-top:8px"></label><label style="flex:1">${fieldLabel("Time",true)}<input type="time" class="dump" data-pfin="etime" value="${esc(d.etime)}" style="margin-top:8px"></label></div>`;
    inner += `<div>${fieldLabel("Repeats?")}<div style="margin-top:8px">${chipRow("repeat",[["no","No"],["weekly","Every week"]],d.repeat)}</div></div>`;
    inner += feelSlider(d, "Looking forward to it?");
    if(+d.feelVal>=3) inner += `<span class="small" style="background:var(--green-soft);color:var(--green);padding:10px 12px;border-radius:12px">Work that day gets planned earlier so your evening stays free.</span>`;
    inner += nameRow(it, d);
    footer = btnBack + btnP("Add to Itinerary", `data-finish="${it.id}"`, !d.date);
  } else if(T==="idea"){
    inner += stepHead(it, "Catch the spark");
    inner += `<span class="small muted" style="margin-top:-8px">No plan needed yet. You can think it through whenever you're ready.</span>`;
    inner += `<label>${fieldLabel("Where did it come from?",true)}<input class="dump" data-pfin="source" value="${esc(d.source)}" placeholder="Paste a link, or name the article, video or conversation" style="margin-top:8px"></label>`;
    inner += `<label>${fieldLabel("First thought, while it's fresh",true)}<textarea class="notes" data-pfin="thought" rows="3" placeholder="What made you want to do this?" style="margin-top:8px;background:var(--surface);box-shadow:0 0 0 1.5px var(--line) inset">${esc(d.thought)}</textarea></label>`;
    inner += nameRow(it, d);
    footer = btnS("Save to Shelf", `data-finish="${it.id}" data-then="shelf"`) + btnP("Think it through", `data-finish="${it.id}" data-then="think"`);
  } else if(T==="assignment"){
    if(d.step===1){
      inner += stepHead(it, "The basics");
      inner += `<label>${fieldLabel("Class",true)}<input class="dump" data-pfin="cls" value="${esc(d.cls)}" placeholder="e.g. PSY 2150" style="margin-top:8px"></label>`;
      inner += `<label>${fieldLabel("Due date")}<input type="date" class="dump" data-pfin="due" value="${esc(d.due)}" style="margin-top:8px"></label>${d.due?`<span class="tiny muted" style="margin-top:-8px">${dueLabel(d.due)}</span>`:""}`;
      inner += feelSlider(d);
      footer = btnBack + btnP("Next", `data-pnav="next"`);
    } else if(d.step===2){
      inner += `<b style="font-size:20px">What does the assignment ask?</b><span class="small muted" style="margin-top:-8px">More detail means a more specific plan. You can skip and add it later.</span>`;
      inner += `<div class="row" style="gap:10px"><label class="bigchoice" style="cursor:pointer">${ico("clip",20,"var(--blue)")}Attach the file<input type="file" id="fileIn" accept=".pdf,.txt,.md${canImages?",image/*":""}" style="display:none"></label><button class="bigchoice" data-focuschat>${ico("bubble",20,"var(--blue)")}Describe it</button></div>`;
      inner += planChat(it, "assignment");
      if((it.steps||[]).length) inner += stepsEditor(it);
      footer = btnBack + btnS("Skip", `data-pnav="next"`) + btnP("Next", `data-pnav="next"`);
    } else { inner += sendStep(it, d); footer = btnBack + btnP("Move to Assignments", `data-finish="${it.id}"`); }
  } else if(T==="habit"){
    if(d.step===1){
      inner += stepHead(it, "How should it fit your week?");
      inner += freqEditor(d);
      if(freqOf(d)!=="slots") inner += `<div>${fieldLabel("What time?")}<div style="margin-top:8px">${chipRow("time",[["","Anytime"],["08:00","Morning"],["19:00","Evening"],["pick","Pick…"]],(["","08:00","19:00"].includes(d.time)?d.time:"pick"))}</div>${!["","08:00","19:00"].includes(d.time)?`<input type="time" class="dump" data-pfin="time" value="${esc(d.time==="pick"?"":d.time)}" style="margin-top:8px">`:""}</div>`;
      inner += `<div>${fieldLabel("Smallest version that counts")}<div style="margin-top:8px">${chipRow("minimum",[[2,"2 min"],[5,"5 min"],[10,"10 min"],[20,"20 min"],[30,"30 min"],[45,"45 min"],[60,"60 min"]],d.minimum)}</div></div>`;
      footer = btnBack + btnP("Next", `data-pnav="next"`, !freqValid(d));
    } else if(d.step===2){ inner += helpStep(it, "habit"); if(it.routine && Object.keys(it.routine).length) inner += routineEditor(it); footer = btnBack + btnP((it.chat||[]).length?"Next":"Skip for now", `data-pnav="next"`); }
    else { inner += sendStep(it, d); footer = btnBack + btnP("Move to Habits", `data-finish="${it.id}"`); }
  } else if(T==="goal"){
    if(d.step===1){
      inner += stepHead(it, "Is it worth it right now?");
      inner += `<span class="small muted" style="margin-top:-8px">Thirty seconds. It keeps your goals realistic.</span>`;
      inner += `<label>${fieldLabel("Why does it matter to you?")}<input class="dump" data-pfin="why" value="${esc(d.why)}" placeholder="One sentence" style="margin-top:8px"></label>`;
      inner += `<div>${fieldLabel("Time you can give it")}<div style="margin-top:8px">${chipRow("cap",[["15 min a day","15 min a day"],["2 hrs a week","2 hrs a week"],["Weekends","Weekends"],["Not sure","Not sure"]],d.cap)}</div></div>`;
      inner += `<div>${fieldLabel("Target date")}<div style="margin-top:8px">${chipRow("target",[["none","No deadline"],["date","Pick a date"]],d.target)}</div>${d.target==="date"?`<input type="date" class="dump" data-pfin="due" value="${esc(d.due)}" style="margin-top:8px">`:""}</div>`;
      footer = btnBack + btnS("Make it a Someday idea", `data-ptype="idea"`) + btnP("Next", `data-pnav="next"`);
    } else if(d.step===2){
      inner += `<b style="font-size:20px">A route to get there</b><span class="small muted" style="margin-top:-8px">${(it.steps||[]).length?"Proposed from your answers. Change anything.":"Build checkpoints from your answers, or skip and add them later."}</span>`;
      if(!(it.steps||[]).length && sampleFn && !it.planBusy) inner += `<button class="btn ink" data-mkplan>Propose checkpoints</button>`;
      if(it.planBusy) inner += `<div class="thinking"><span class="dot3">Building the route</span></div>`;
      if((it.steps||[]).length) inner += stepsEditor(it);
      inner += planChat(it, "goal");
      footer = btnBack + btnP("Next", `data-pnav="next"`);
    } else { inner += sendStep(it, d); footer = btnBack + btnP("Move to Goals", `data-finish="${it.id}"`); }
  }
  planShell(it, inner, footer);
}
/* Habit frequency editor. H is the Plan it draft or a saved habit; both use the same field names. */
function freqValid(H){ const f=freqOf(H); return f==="count" ? true : f==="slots" ? (H.slots||[]).length>0 && (H.days||[]).length>0 : (H.days||[]).length>0; }
const SLOT_PRESETS = {wake:["After waking","Before bed"], meals:["Breakfast","Lunch","Dinner"]};
function freqEditor(H){
  const f = freqOf(H), hfBtn = (field, v, l, on) => `<button class="chipbtn${on?" on":""}" aria-pressed="${on}" data-hf="${field}" data-v="${v}">${l}</button>`;
  let h = `<div>${fieldLabel("How often?")}<div class="tags" style="margin-top:8px">${[["count","Days a week"],["days","Specific days"],["slots","Several times a day"]].map(([v,l])=>hfBtn("freq",v,l,f===v)).join("")}</div></div>`;
  if(f==="count") h += `<div>${fieldLabel("How many days a week?")}<div style="display:flex;gap:5px;margin-top:8px">${[1,2,3,4,5,6,7].map(n=>`<button class="daybtn${(H.perWeek||3)===n?" on":""}" aria-pressed="${(H.perWeek||3)===n}" data-hf="perWeek" data-v="${n}">${n}</button>`).join("")}</div><span class="tiny muted">Any days. It shows on Now until the week's number is reached.</span></div>`;
  if(f!=="count") h += `<div>${fieldLabel(f==="slots"?"On which days?":"Which days?")}<div style="display:flex;gap:5px;margin-top:8px">${DOW.map((l,k)=>`<button data-hfday="${k}" aria-pressed="${(H.days||[]).includes(k)}" aria-label="${DOWL[k]}" class="daybtn${(H.days||[]).includes(k)?" on":""}" style="height:46px">${l}</button>`).join("")}</div><span class="tiny muted">${(H.days||[]).length===7?"Every day":`${(H.days||[]).length} day${(H.days||[]).length===1?"":"s"} a week`}</span></div>`;
  if(f==="slots"){
    const sl = H.slots||[], need = Math.min(sl.length, H.minSlots||sl.length);
    h += `<div style="display:flex;flex-direction:column;gap:8px">${fieldLabel("When in the day?")}<span class="tiny muted" style="margin-top:-4px">Name each one after a routine or a time. Each is checked off on its own.</span>
      ${sl.map(s=>`<div class="row" style="gap:6px"><input class="dump" data-slotlabel="${s.id}" value="${esc(s.label)}" placeholder="e.g. After breakfast" maxlength="30" style="flex:1;min-width:0;min-height:44px;padding:8px 10px"><input type="time" class="dump" data-slottime="${s.id}" value="${esc(s.time||"")}" aria-label="Time for ${esc(s.label||"this one")}, optional" style="width:128px;flex-shrink:0;min-height:44px;padding:8px 6px;font-size:15px"><button class="iconbtn${s.time&&s.remind?" on":""}" data-slotrem="${s.id}" ${s.time?"":"disabled"} aria-pressed="${!!(s.time&&s.remind)}" aria-label="Reminder for ${esc(s.label||"this one")}" title="${s.time?"Reminder":"Set a time to get a reminder"}" style="width:40px;height:40px;${s.time&&s.remind?"color:var(--blue)":"opacity:"+(s.time?1:.4)}">${ico("bell",18)}</button><button class="iconbtn" data-slotdel="${s.id}" aria-label="Remove ${esc(s.label||"this one")}" style="width:36px;height:40px">${ico("close",16)}</button></div>`).join("")}
      <div class="tags">${sl.length<6?`<button class="chipbtn" data-slotadd>+ Add one</button>`:""}${sl.length?"":Object.entries(SLOT_PRESETS).map(([k,v])=>`<button class="chipbtn" data-slotpreset="${k}">${v.join(" · ")}</button>`).join("")}</div></div>`;
    if(sl.length>1) h += `<div>${fieldLabel("The day counts when")}<div class="tags" style="margin-top:8px">${sl.map((_,k)=>k+1).map(n=>hfBtn("minSlots", n, n===sl.length?`All ${n}`:`${n} of ${sl.length}`, need===n)).join("")}</div></div>`;
  }
  return h;
}
function stepHead(it, q){ const t = TYPE_INFO[it.draft.type]; return `<div class="row" style="gap:8px"><span class="chip" style="background:var(--surface);color:${t.col};box-shadow:0 0 0 1.5px var(--line) inset">${t.label}</span><span class="small muted" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.raw)}</span></div><b style="font-size:20px">${q}</b>`; }
function helpStep(it, type){
  let h = `<b style="font-size:20px">Want help with anything?</b><span class="small muted" style="margin-top:-8px">Optional. Skip if you're set.</span>`;
  const starters = (it.ai && it.ai.starters && it.ai.starters[type]) || [];
  if(!(it.chat||[]).length && starters.length) h += `<div style="display:flex;flex-direction:column;gap:8px">${starters.slice(0,4).map((s,k)=>`<button class="starter" data-starter="${k}">${esc(s)}<span class="muted">›</span></button>`).join("")}</div>`;
  h += planChat(it, type, true);
  if(type==="habit" && (it.chat||[]).length && !it.planBusy) h += `<button class="btn ghost" data-mkroutine style="background:var(--surface)">${it.routine&&Object.keys(it.routine).length?"Rebuild the routine":"Turn this into a routine"}</button>`;
  if(it.planBusy) h += `<div class="thinking"><span class="dot3">Building</span></div>`;
  return h;
}
function planChat(it, type, compact){
  const chat = it.chat||[]; let h = "";
  if(it.doc) h += `<div class="row small" style="gap:8px;color:var(--blue)">${ico("clip",18)}<b>${esc(it.doc.name)}</b><span class="tiny muted">attached</span></div>`;
  let log = chat.map(m=>bubble(m.role,m.content)).join("");
  if(it.chatBusy) log += `<div class="bubble ai" id="streamBubble"><span class="dot3">Thinking</span></div>`;
  if(log) h += `<div class="chatlog" id="chatlog" style="max-height:260px">${log}</div>`;
  if(type==="assignment" && (chat.length||it.doc) && !it.planBusy && !(it.steps||[]).length) h += `<button class="btn ghost" data-mkplan style="background:var(--surface)">Make it a plan</button>`;
  if(type==="assignment" && it.planBusy) h += `<div class="thinking"><span class="dot3">Building steps</span></div>`;
  if(sampleFn) h += `<div class="row" style="gap:6px"><input id="chatIn" class="dump" placeholder="${chat.length?"Reply…":type==="assignment"?"Describe it, or ask something…":"Or ask your own…"}" style="flex:1;min-height:46px;background:var(--surface);box-shadow:0 0 0 1.5px var(--line) inset"><button class="iconbtn" data-send aria-label="Send" style="background:var(--ink);color:var(--bg)">${ico("send",18)}</button></div>`;
  else h += `<span class="tiny muted">The chat turns on when the app runs inside Claude.</span>`;
  return h;
}
function sendStep(it, d){
  const t = TYPE_INFO[d.type]; let rows = [];
  if(d.type==="habit") rows = [["How often", freqText(d)]].concat(freqOf(d)==="slots"?[["Counts when", `${slotNeed(d)} of ${(d.slots||[]).length} done`]]:[["Time", d.time&&d.time!=="pick"?timeLabel(d.time):"Anytime"]]).concat([["Minimum", d.minimum+" min"]]).concat(it.routine&&Object.keys(it.routine).length?[["Routine", Object.values(it.routine).slice(0,3).join(" · ")]]:[]);
  if(d.type==="assignment") rows = [["Class", d.cls||"Not set"],["Due", d.due?dueLabel(d.due):"No date"],["Feels", feelLabel(d.feelVal)],["Plan", (it.steps||[]).length?it.steps.length+" steps":"No plan yet; add it from its page"]];
  if(d.type==="goal") rows = [["Why", d.why||"Not set"],["Time", d.cap||"Not set"],["Target", d.target==="date"&&d.due?dueLabel(d.due).replace("Due ",""):"No deadline"],["Route", (it.steps||[]).length?it.steps.length+" checkpoints":"Add later"]];
  if(d.type==="task") rows = [["Takes", (d.minutes||20)+" min"],["When", {today:"Today",tomorrow:"Tomorrow",week:"This week",anytime:"Anytime",date:d.date||"Pick a date"}[d.when]],["Time", d.settime==="pick"&&d.at?timeLabel(d.at):"No time needed"]];
  const where = {habit:(freqOf(d)==="count"?"Shows on Now until the week's number is reached":"Shows on Now on its days")+(freqOf(d)!=="slots"&&d.time&&d.time!=="pick"?" at "+timeLabel(d.time):""), assignment:"Lives in Horizon · Assignments; its next step shows on Now", goal:"Lives in Horizon · Goals", task:"Lives in Horizon · Tasks; add it to Now when you're ready"}[d.type];
  return `<b style="font-size:20px">Here's your ${t.label.toLowerCase()}</b>` + nameRow(it, d) + `<div class="card" style="gap:2px">${rows.map(([k,v])=>`<div class="row" style="justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)"><span class="small muted">${k}</span><b class="small" style="text-align:right;max-width:65%">${esc(v)}</b></div>`).join("")}<span class="tiny muted" style="margin-top:8px">${where}. You dumped: "${esc(it.raw)}"</span></div>`;
}
function planFields(d){ return ""; }
function notesBlock(it){
  return `<div class="card" style="gap:8px"><div class="row" style="justify-content:space-between"><b>Notes</b><span class="tiny muted">${it.notesBusy?'<span class="dot3">Updating</span>':"kept from your chats · edit anytime"}</span></div>
  <textarea class="notes" data-notes="${it.id}" placeholder="Requirements, ideas, decisions… The app adds key points from your chats here." rows="${Math.min(10,Math.max(3,(it.notes||"").split("\n").length+1))}">${esc(it.notes||"")}</textarea></div>`;
}
function chatBlock(it, type){
  const chat = it.chat || [];
  let h = notesBlock(it) + `<div class="card" style="gap:10px"><div class="row" style="justify-content:space-between"><b>Talk it through <span class="tiny muted" style="font-weight:500">· optional</span></b>${chat.length?`<button class="btn text" data-clearchat style="min-height:32px;padding:0;font-size:13px">Clear chat</button>`:""}</div>`;
  if(it.doc) h += `<div class="row small" style="gap:8px;color:var(--blue)">${ico("clip",18)}<b>${esc(it.doc.name)}</b><span class="tiny muted">attached</span></div>`;
  let log = "";
  if(type==="assignment" && !it.doc && !chat.length && !(it.chatArchive||[]).length && !(it.notes||"").trim()) log += bubble("assistant", "Do you have the instructions? Attach the file, or describe the assignment in a sentence or two.");
  if(!chat.length && (it.chatArchive||[]).length) log += `<p class="tiny muted" style="margin:0;text-align:center">Earlier chat cleared from view. It's still remembered.</p>`;
  log += chat.map(m=>bubble(m.role, m.content)).join("");
  if(it.chatBusy) log += `<div class="bubble ai" id="streamBubble"><span class="dot3">Thinking</span></div>`;
  if(log) h += `<div class="chatlog" id="chatlog">${log}</div>`;
  const starters = (it.ai && it.ai.starters && it.ai.starters[type]) || [];
  if(!chat.length && !it.chatBusy && type!=="assignment" && starters.length) h += `<div class="tags">${starters.slice(0,4).map((s,k)=>`<button class="chipbtn" data-starter="${k}">${esc(s)}</button>`).join("")}</div>`;
  if(sampleFn){
    h += `<div class="row" style="gap:6px">${type==="assignment"||type==="goal"?`<label class="iconbtn" style="border:1.5px solid var(--line);cursor:pointer" aria-label="Attach a file">${ico("clip",20)}<input type="file" id="fileIn" accept=".pdf,.txt,.md${canImages?",image/*":""}" style="display:none"></label>`:""}<input id="chatIn" class="dump" placeholder="${chat.length?"Reply…":"Or start your own…"}" style="flex:1;min-height:44px;background:var(--bg)"><button class="iconbtn" data-send aria-label="Send" style="background:var(--ink);color:var(--bg)">${ico("send",18)}</button></div>`;
    if(type==="assignment"||type==="goal"){
      if((chat.length||it.doc||it.notes) && !it.planBusy) h += `<button class="btn ghost" data-mkplan>${(it.steps||[]).length?"Rebuild the plan":"Make it a plan"}</button>`;
      if(it.planBusy) h += `<div class="thinking"><span class="dot3">Building steps</span></div>`;
      if((it.steps||[]).length && it.type==="unplanned") h += stepsEditor(it);
    }
    if(type==="habit"){
      if(chat.length && !it.planBusy) h += `<button class="btn ghost" data-mkroutine>${it.routine&&Object.keys(it.routine).length?"Rebuild the routine":"Turn this into a routine"}</button>`;
      if(it.planBusy) h += `<div class="thinking"><span class="dot3">Building routine</span></div>`;
      if(it.routine && Object.keys(it.routine).length) h += routineEditor(it);
    }
  } else h += `<span class="tiny muted">The chat turns on when the app runs inside Claude.</span>`;
  return h + `</div>`;
}
function bubble(role, text){ return role==="user" ? `<div class="bubble me">${esc(text)}</div>` : `<div class="bubble ai md">${md(text)}</div>`; }
function stepsEditor(it){
  return `<div style="display:flex;flex-direction:column;gap:6px"><span class="tiny muted" style="font-weight:600">The plan · edit anything</span>${(it.steps||[]).map((s,k)=>`<div class="row" style="gap:6px">${s.done?`<span style="color:var(--green)">${ico("check",18)}</span>`:`<span class="tiny muted" style="width:18px;text-align:center">${k+1}</span>`}<input class="dump" data-stepedit="${s.id}" value="${esc(s.title)}" style="flex:1;min-height:40px;padding:8px 10px;background:var(--bg);font-size:14px"><span class="tiny muted" style="white-space:nowrap">${s.minutes||30}m</span><button class="iconbtn" data-stepdel="${s.id}" aria-label="Remove step" style="width:36px;height:36px">${ico("close",16)}</button></div>`).join("")}<button class="btn text" data-stepadd style="align-self:flex-start;min-height:36px;color:var(--blue)">+ Add a step</button></div>`;
}
function routineEditor(it){
  const days = (it.draft&&it.type==="unplanned"?it.draft.days:(it.habit&&it.habit.days))||[];
  return `<div style="display:flex;flex-direction:column;gap:6px"><span class="tiny muted" style="font-weight:600">Routine · shown in your reminder each day</span>${days.map(d=>`<label class="row small" style="gap:8px"><span style="width:34px;font-weight:600">${DOWL[d].slice(0,3)}</span><input class="dump" data-routine="${d}" value="${esc((it.routine||{})[d]||"")}" style="flex:1;min-height:40px;padding:8px 10px;background:var(--bg);font-size:14px"></label>`).join("")}</div>`;
}

/* ---- AI calls ---- */
function aiFail(e){ const c = e && e.code; return c==="not_granted"?"AI help is off. You can still plan everything by hand.":c==="rate_limited"?"The AI is busy. Try again in a minute.":"The AI couldn't answer just now. Everything else still works."; }
async function understand(it, correction){
  it.aiBusy = true; it.aiError = null; renderOv();
  const prompt = `A person with ADHD jotted this note into a planner app: "${it.raw}".${correction?` They clarified what they meant: "${correction}".`:""}
Reply with only a JSON object:
{"understanding": one short sentence starting "Sounds like you want to", plain words, no assumptions beyond the note,
 "titles": {"task":..,"assignment":..,"habit":..,"goal":..,"event":..,"idea":..} each a clear short name (max 40 characters) if planned as that type,
 "starters": {"task":[..],"assignment":[..],"habit":[..],"goal":[..],"idea":[..]} each 3 or 4 short buttons (max 7 words, first person, like "Build me a workout routine") for what they might want help with first; practical and specific to the note}`;
  try{
    const r = await sampleFn.json(prompt, {modelTier:"quick"});
    if(r && typeof r.understanding==="string"){ it.ai = {understanding:r.understanding.slice(0,200), titles:r.titles||{}, starters:r.starters||{}}; }
    else it.aiError = "Couldn't read that note just now.";
  }catch(e){ it.aiError = aiFail(e); }
  it.aiBusy = false; it.correcting = false; save(); renderOv();
}
function contextFor(it){
  const d = it.type==="unplanned" ? it.draft||{} : it;
  const type = it.type==="unplanned" ? d.type : it.type;
  let ctx = `Item: "${it.type==="unplanned"?it.raw:it.title}" (original note: "${it.raw}"). Type: ${TYPES[type]||type}.`;
  const due = it.type==="unplanned"?d.due:it.due; if(due) ctx += ` Due: ${due}.`;
  const days = it.type==="unplanned"?d.days:(it.habit||{}).days; const time = it.type==="unplanned"?d.time:(it.habit||{}).time; const min = it.type==="unplanned"?d.minimum:(it.habit||{}).minimum;
  if(type==="habit") ctx += ` How often: ${freqText(it.type==="unplanned"?d:(it.habit||{}))}. Time: ${time||"not set"}. Minimum: ${min||10} min.`;
  if((it.steps||[]).length) ctx += ` Current steps: ${it.steps.map(s=>(s.done?"[done] ":"")+s.title).join("; ")}.`;
  if(d.cls||it.cls) ctx += ` Class: ${d.cls||it.cls}.`;
  if(d.why||it.why) ctx += ` Why it matters: ${d.why||it.why}.`;
  if(d.cap||it.cap) ctx += ` Time available: ${d.cap||it.cap}.`;
  const sp = it.spark||{}; if(d.source||sp.source) ctx += ` Source: ${d.source||sp.source}.`;
  if(it.notes) ctx += `\n\nNotes so far:\n${it.notes.slice(0,3000)}`;
  if((it.chatArchive||[]).length){ const a = it.chatArchive.map(m=>(m.role==="user"?"Person: ":"Helper: ")+m.content).join("\n"); ctx += `\n\nEarlier conversation (cleared from view, still remembered):\n${a.slice(-6000)}`; }
  if(it.doc) ctx += `\n\nAttached instructions (${it.doc.name}):\n${it.doc.text.slice(0,12000)}`;
  return {ctx, type};
}
const STYLE = `Style: direct, specific and intelligent, like a sharp planner. No praise, no exclamation marks, no filler, and don't restate what they said. Keep replies under 60 words unless they ask for detail or for a plan or outline. Plain text only: no bold, no headings; for lists use lines starting with "- ". Ask at most one question, and only when it's needed. Never invent facts about the person or their assignment.`;
async function sendChat(text){
  const it = itemById(ov.id); if(!it || !text.trim() || it.chatBusy) return;
  it.chat = it.chat || []; it.chat.push({role:"user", content:text.trim()}); it.chatBusy = true; renderOv();
  const {ctx, type} = contextFor(it);
  const prompt = `You are the planning assistant inside an ADHD planner app. Today is ${new Date().toDateString()}. ${ctx}
${STYLE}
${type==="idea"?"This is an idea they are developing, not planning yet. Ask one sharp question at a time that helps them find their angle, format and what it would involve; offer two directions when useful; do not hand them a plan unless they ask.":((type==="assignment"||type==="goal")&&!(it.steps||[]).length?"Before proposing any plan, ask up to two targeted questions you still need (length, required parts, sources, what's done, their own process) unless the details already answer them.":"")} If they want a plan${type==="habit"?" or routine":""}, outline it briefly; the app has a button that turns this into editable ${type==="habit"?"routine":"steps"}. For exercise, give general guidance and mention checking with a professional only if they bring up an injury or health condition.
Current conversation:
${it.chat.map(m=>(m.role==="user"?"Person: ":"You: ")+m.content).join("\n")}
Write your next reply only.`;
  let reply = "";
  try{
    const r = await sampleFn(prompt, {modelTier:"quick", cache:false, onText:({text})=>{ const b=$("#streamBubble"); if(b){ b.innerHTML = md(text); const l=$("#chatlog"); if(l) l.scrollTop=l.scrollHeight; } }});
    reply = r.text.trim(); it.chat.push({role:"assistant", content:reply});
  }catch(e){ if(e && e.text){ reply=e.text; it.chat.push({role:"assistant", content:e.text}); } toast(aiFail(e)); }
  it.chatBusy = false; save(); renderOv(); const ci=$("#chatIn"); if(ci) ci.focus();
  updateNotes(it, text.trim(), reply);
}
async function updateNotes(it, said, reply){
  if(!sampleFn){ it.notes = ((it.notes||"").trim() + "\n- " + said).trim(); save(); return; }
  it.notesBusy = true; if(ov && ov.id===it.id) renderOv();
  const prompt = `You keep short notes for one item in an ADHD planner: "${it.type==="unplanned"?it.raw:it.title}".
Current notes:
${it.notes||"(none yet)"}
Latest exchange:
Person: ${said}
Assistant: ${reply||"(no reply)"}
Update the notes with anything durable: requirements, deadlines, decisions, the outline or plan, ideas the person shared, constraints. Keep existing points unless the exchange changes them. Drop chit-chat. At most 12 lines, each under 20 words, each starting with "- ". If nothing new is worth keeping, return the current notes unchanged.
Reply with only JSON: {"notes": "the full updated notes"${it.type==="idea"?`, "readiness": [{"label": short part of the idea such as Angle, Format, Research, Outline, "state": "Clear" or "Rough" or "Not started"}] (3 to 5 parts, judged honestly from the conversation)`:""}}`;
  try{ const r = await sampleFn.json(prompt, {modelTier:"quick"}); if(r && typeof r.notes==="string") it.notes = r.notes.trim().slice(0,3000); if(r && Array.isArray(r.readiness)) it.readiness = r.readiness.slice(0,5).map(x=>({label:String(x.label||"").slice(0,30), state:String(x.state||"").slice(0,20)})).filter(x=>x.label); }catch(e){}
  it.notesBusy = false; save(); if(ov && ov.id===it.id) renderOv();
}
async function makePlan(){
  const it = itemById(ov.id); if(!it) return; it.planBusy = true; renderOv();
  const {ctx} = contextFor(it);
  const prompt = `Turn this into a step-by-step plan for an ADHD-friendly planner. Today is ${new Date().toDateString()}. ${ctx}
${(it.chat||[]).length?"Conversation:\n"+it.chat.map(m=>(m.role==="user"?"Person: ":"Helper: ")+m.content).join("\n"):""}
Reply with only JSON: {"steps":[{"title": short concrete action (max 60 characters), "minutes": 10 to 90}]}. Use 3 to 8 steps in order; make the first step small and easy to start. Only include what the information supports; never invent requirements.`;
  try{
    const r = await sampleFn.json(prompt, {modelTier:"default"});
    const steps = (r && Array.isArray(r.steps) ? r.steps : []).slice(0,10).map(s=>({id:uid(), title:String(s.title||"Step").slice(0,80), minutes:Math.min(120,Math.max(5,parseInt(s.minutes)||30)), done:false}));
    if(steps.length){ const kept = (it.steps||[]).filter(s=>s.done); it.steps = kept.concat(steps); toast("Plan ready. Edit anything."); }
    else toast("No steps came back. Add a bit more detail and try again.");
  }catch(e){ toast(aiFail(e)); }
  it.planBusy = false; save(); renderOv();
}
async function makeRoutine(){
  const it = itemById(ov.id); if(!it) return; it.planBusy = true; renderOv();
  const {ctx} = contextFor(it);
  const days = (it.type==="unplanned"?it.draft.days:it.habit.days)||[];
  const prompt = `Make a simple weekly routine for this habit in an ADHD-friendly planner. ${ctx}
Conversation:
${(it.chat||[]).map(m=>(m.role==="user"?"Person: ":"Helper: ")+m.content).join("\n")}
Reply with only JSON: {"routine": {${days.map(d=>`"${d}": "label for ${DOWL[d]}"`).join(", ")}}}. Each label is what to do that day, max 50 characters (for example "Push day: chest, shoulders, triceps"). Use exactly these day keys.`;
  try{
    const r = await sampleFn.json(prompt, {modelTier:"default"});
    if(r && r.routine && typeof r.routine==="object"){ it.routine = {}; days.forEach(d=>{ if(r.routine[d]) it.routine[d]=String(r.routine[d]).slice(0,60); }); if(it.type==="habit") it.habit.routine = it.routine; toast("Routine ready. Edit any day."); }
  }catch(e){ toast(aiFail(e)); }
  it.planBusy = false; save(); renderOv();
}
async function attachFile(file){
  const it = itemById(ov.id); if(!it || !file) return;
  toast("Reading the file…");
  let text = "";
  try{
    if(/\.pdf$/i.test(file.name) || file.type==="application/pdf") text = await pdfText(file);
    else if(file.type.startsWith("image/")){
      if(!canImages) throw new Error("images");
      const r = await sampleFn("Transcribe all the assignment instructions in this image as plain text. Reply with the text only.", {images:[file], modelTier:"quick"});
      text = r.text;
    } else text = await file.text();
  }catch(e){ toast("Couldn't read that file. Try a PDF or text file, or describe it in the chat."); return; }
  text = text.replace(/\s+\n/g,"\n").trim();
  if(!text){ toast("That file looked empty. Try describing it in the chat."); return; }
  it.doc = {name:file.name.slice(0,60), text:text.slice(0,15000)}; save();
  await sendChat("I attached the assignment instructions. What do you see, and what would you ask me before making a plan?");
}
let pdfReady = null;
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function pdfText(file){
  if(!pdfReady){
    const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
    pdfReady = loadScript(base+"pdf.min.js").then(()=>loadScript(base+"pdf.worker.min.js")).then(()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc = base+"pdf.worker.min.js"; });
  }
  await pdfReady;
  const doc = await window.pdfjsLib.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise;
  let out = [];
  for(let p=1; p<=Math.min(doc.numPages, 15); p++){ const pg = await doc.getPage(p); const c = await pg.getTextContent(); out.push(c.items.map(i=>i.str).join(" ")); }
  return out.join("\n\n");
}

/* ---- finish planning ---- */
function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return todayStr(d); }
function finishPlan(it, then){
  const d = it.draft; if(!d || !d.type) return;
  const nameEl = $("#nameIn"); const name = ((nameEl && nameEl.value) || d.title || (it.ai&&it.ai.titles&&it.ai.titles[d.type]) || it.raw).trim();
  if(d.type==="event" && !d.date){ toast("Pick a date for the event first."); return; }
  if(d.type==="habit" && !freqValid(d)){ toast(freqOf(d)==="slots"?"Add at least one time of day.":"Pick at least one day."); return; }
  it.title = name.slice(0,80); it.type = d.type; it.status = "open"; it.plannedAt = Date.now();
  const feeling = feelFrom(d.feelVal);
  if(d.type==="task"){
    it.minutes = parseInt(d.minutes)||20;
    it.due = d.when==="today"?todayStr(): d.when==="tomorrow"?addDays(1): d.when==="week"?addDays(6-new Date().getDay()): d.when==="date"?(d.date||null): null;
    it.at = d.settime==="pick" ? (d.at||"") : ""; it.noTime = d.settime!=="pick"; it.feeling = feeling;
  }
  if(d.type==="assignment"){ it.cls = d.cls||""; it.due = d.due||null; it.feeling = feeling; it.steps = it.steps||[]; it.minutesLogged = it.minutesLogged||0; }
  if(d.type==="goal"){ it.why = d.why||""; it.cap = d.cap||""; it.due = d.target==="date"?(d.due||null):null; it.steps = it.steps||[]; it.minutesLogged = it.minutesLogged||0;
    if(d.why && !(it.notes||"").includes(d.why)) it.notes = ((it.notes||"") + "\n- Why it matters: " + d.why).trim(); }
  if(d.type==="habit"){ const tm = d.time==="pick"?"":d.time, f = freqOf(d);
    it.habit = {freq:f, days:(f==="count"?[0,1,2,3,4,5,6]:d.days.slice().sort()), perWeek:parseInt(d.perWeek)||3, slots:(d.slots||[]).map(s=>({...s, label:(s.label||"").trim()||"Slot"})), minSlots:parseInt(d.minSlots)||0,
      time:f==="slots"?"":(tm||""), minimum:parseInt(d.minimum)||10, log:(it.habit&&it.habit.log)||{}, skip:{}, slotLog:{}, excuse:{}, routine:it.routine||{}}; }
  if(d.type==="event"){ it.event = {date:d.date, time:d.etime||"", repeat:d.repeat}; it.feeling = feeling; }
  if(d.type==="idea"){ it.spark = {source:d.source||"", thought:d.thought||"", date:todayStr()}; if(d.thought && !(it.notes||"").includes(d.thought)) it.notes = ((it.notes||"")+"\n- First thought: "+d.thought).trim(); it.ideaTab = then==="think"?"think":"shape"; }
  delete it.draft;
  it.planned = true;
  save(); toast(`Planned: ${it.title}`);
  if(it.type==="idea" && then==="think"){ ov = {kind:"item", id:it.id}; renderOv(); return; }
  const go = {task:["hor","task"],assignment:["hor","assignment"],goal:["hor","goal"],habit:["hor","habit"],event:["itin"],idea:["hor","shelf"]}[it.type];
  ov = null; const o=$("#ov"); if(o) o.remove(); tab = go[0]; if(go[1]) horView = go[1]; render();
}
/* ---- Item page ---- */
function renderItem(it){
  const type = it.type;
  let h = `<div class="card" style="gap:6px"><label for="renameIn" class="tiny muted" style="font-weight:600">${TYPES[type]||"Item"} · name</label><input id="renameIn" class="dump" data-rename="${it.id}" value="${esc(it.title)}" style="background:var(--bg);font-weight:700"><span class="tiny muted">You dumped: "${esc(it.raw)}"</span></div>`;
  if(it.status==="done") h += `<div class="card" style="background:var(--green-soft);gap:8px"><b style="color:var(--green)">${ico("check",18)} Completed${it.doneAt?" "+new Date(it.doneAt).toLocaleDateString(undefined,{month:"short",day:"numeric"}):""}</b><div class="row" style="gap:8px"><button class="btn ghost" data-reopen="${it.id}" style="flex:1;background:var(--surface)">Reopen</button><button class="btn ghost" data-delitem="${it.id}" style="flex:1;background:var(--surface);color:var(--coral)">Delete forever</button></div></div>`;
  if(type==="habit"){
    const st = habitStats(it), t = todayStr(), hb = it.habit, slots = freqOf(hb)==="slots";
    h += `<div class="row" style="gap:8px">${[[st.thisWeek+" of "+st.target,"this week"],[st.last30+" of "+st.of30,"last 30 days"],[st.total,"in total"]].map(([a,b])=>`<div class="card" style="flex:1;padding:10px;gap:0"><b>${a}</b><span class="tiny muted">${b}</span></div>`).join("")}</div>`;
    const sug = excuseWeekday(it);
    if(sug) h += `<div class="card" style="gap:8px;background:var(--blue-soft)"><span class="small">${sug.count} of your recent "Something came up" notes landed on a ${DOWL[sug.dow]}. Move ${esc(it.title)} off ${DOWL[sug.dow]}s?</span><div class="row" style="gap:8px"><button class="btn ink" data-moveoff="${sug.dow}" style="flex:1;min-height:40px">Move off ${DOWL[sug.dow]}</button><button class="btn ghost" data-keepday="${sug.dow}" style="flex:1;min-height:40px;background:var(--surface)">Keep it</button></div></div>`;
    let today = "";
    if(slots && onDay(hb,t)){ const dn = slotsDone(hb,t);
      today = `<div class="row" style="justify-content:space-between"><b>Today</b><span class="tiny muted">${dn.length} of ${(hb.slots||[]).length} · counts at ${slotNeed(hb)}</span></div>${(hb.slots||[]).map(s=>{ const on=dn.includes(s.id); return `<button class="slotrow${on?" on":""}" data-hslot="${s.id}" aria-pressed="${on}"><i>${on?ico("check",14,"#fff"):""}</i><b>${esc(s.label)}</b><span>${s.time?timeLabel(s.time):""}</span></button>`; }).join("")}${st.log[t]?`<span class="small" style="color:var(--green);font-weight:600">${ico("check",16)} Today counts</span>`:""}`; }
    else if(!slots) today = st.log[t]?`<span class="small" style="color:var(--green);font-weight:600">${ico("check",16)} Done today</span>`:(st.exc[t]?"":`<button class="btn coral" data-hdone="${it.id}">Mark done today</button>`);
    const ex = excuseRow(it);
    if(today || ex) h += `<div class="card" style="gap:8px">${today}${ex}</div>`;
    h += `<div class="card" style="gap:12px"><b>Schedule</b>${freqEditor(hb)}
      ${slots?"":`<label class="tiny muted" style="font-weight:600">Reminder time<input type="time" class="dump" data-htime value="${esc(hb.time)}" style="margin-top:6px;background:var(--bg)"></label>`}
      <div><span class="tiny muted" style="font-weight:600">Minimum</span><div class="tags" style="margin-top:6px">${[2,5,10,20,30,45,60].map(m=>chipBtn(m+" min",`data-hmin="${m}"`,hb.minimum==m)).join("")}</div></div></div>`;
    it.routine = it.habit.routine;
    h += chatBlock(it, "habit");
  } else if(type==="assignment" || type==="goal"){
    const steps = it.steps||[]; const next = steps.find(s=>!s.done);
    h += `<div class="row" style="gap:8px"><div class="card" style="flex:1;padding:10px;gap:0"><b>${it.due?dueLabel(it.due):"No date"}</b><span class="tiny muted">${type==="goal"?"target":"deadline"}</span></div><div class="card" style="flex:1;padding:10px;gap:0"><b>${((it.minutesLogged||0)/60).toFixed(1)} hrs</b><span class="tiny muted">invested</span></div><div class="card" style="flex:1;padding:10px;gap:0"><b>${steps.filter(s=>s.done).length} of ${steps.length}</b><span class="tiny muted">steps</span></div></div>`;
    if(steps.length) h += `<div class="card" style="gap:6px"><b>The plan</b>${steps.map((s,k)=>`<div class="row small" style="gap:10px;${s===next?"font-weight:700":""}${s.done?";color:var(--muted)":""}"><span style="width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;${s.done?"background:var(--blue);color:#fff":s===next?"border:2px solid var(--coral);color:var(--coral)":"border:1.5px solid var(--line);color:var(--muted)"}">${s.done?ico("check",12,"#fff"):k+1}</span><span style="flex:1">${esc(s.title)}</span><span class="tiny muted">${s.minutes||30}m</span></div>`).join("")}<span class="tiny muted">Edit steps in the chat area below.</span></div>`;
    if(next) h += `<div class="card" style="background:var(--coral-soft);gap:8px"><span class="label">Next step</span><b style="font-size:16px">${esc(next.title)} · ${next.minutes||30} min</b><div class="row" style="gap:8px">${isActive({kind:"step",itemId:it.id,stepId:next.id})?`<button class="btn activebtn" data-fopen style="flex:1">Active</button>`:`<button class="btn coral" data-go-task="${it.id}" data-step="${next.id}" style="flex:1">Start now</button>`}<button class="btn ghost" data-pin="${it.id}" style="flex:1;background:var(--surface)">${it.pinned?"On Now ✓":"Add to Now"}</button></div><button class="btn text" data-stepdone="${next.id}" style="min-height:36px;align-self:flex-start;padding:0">Already did it</button>${steps[steps.indexOf(next)+1]?`<span class="tiny" style="color:var(--ink2)">After that: ${esc(steps[steps.indexOf(next)+1].title)}</span>`:""}</div>`;
    else if(steps.length) h += `<div class="card" style="background:var(--green-soft)"><b>Every step is done.</b><button class="btn coral" data-complete="${it.id}">Mark ${type} complete</button></div>`;
    else h += `<div class="card" style="border:1.5px dashed var(--line);background:transparent"><b>No plan yet</b><span class="small muted">Attach the instructions or describe it below, then tap Make it a plan.</span></div>`;
    h += chatBlock(it, type);
    if(steps.length) h += stepsEditor(it);
  } else if(type==="task"){
    h += `<div class="card"><span class="small">${it.at?timeLabel(it.at)+" · ":""}${it.minutes||20} min${it.due?" · "+dueLabel(it.due):""}${it.feeling?" · "+(it.feeling==="scary"?"feels scary":"excited"):""}</span>${it.status==="open"?`<div class="row" style="gap:8px">${isActive({kind:"task",itemId:it.id})?`<button class="btn activebtn" data-fopen style="flex:1">Active</button>`:`<button class="btn coral" data-go-task="${it.id}" data-step="" style="flex:1">Start</button>`}<button class="btn ghost" data-pin="${it.id}" style="flex:1">${it.pinned?"On Now ✓":"Add to Now"}</button></div><button class="btn text" data-taskdone="${it.id}" style="min-height:36px;align-self:flex-start;padding:0">Already did it</button>`:""}</div>`;
    h += chatBlock(it, "task");
  } else if(type==="idea"){
    const sp = it.spark||{};
    h += `<div class="card" style="gap:8px"><span class="tiny muted" style="font-weight:700">The spark${sp.date?" · "+new Date(sp.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}):""}</span><span style="font-size:15px">${esc(sp.thought||it.raw)}</span>${sp.source?(/^https?:\/\//.test(sp.source)?`<a href="${esc(sp.source)}" target="_blank" rel="noopener noreferrer" class="small" style="font-weight:600;word-break:break-all">${ico("link",14)} ${esc(sp.source)}</a>`:`<span class="small" style="color:var(--blue);font-weight:600">${ico("link",14)} ${esc(sp.source)}</span>`):""}</div>`;
    const tabI = it.ideaTab||"shape";
    h += `<div class="seg"><button data-ideatab="shape" aria-pressed="${tabI==="shape"}">Taking shape</button><button data-ideatab="think" aria-pressed="${tabI==="think"}">Think it through</button></div>`;
    if(tabI==="shape"){
      h += `<div class="card" style="gap:8px"><div class="row" style="justify-content:space-between"><b>Your take so far</b><span class="tiny muted">${it.notesBusy?'<span class="dot3">Updating</span>':"built from your thinking · edit"}</span></div><textarea class="notes" data-notes="${it.id}" placeholder="Think it through and your angle, format and open questions collect here." rows="${Math.min(10,Math.max(4,(it.notes||"").split("\n").length+1))}">${esc(it.notes||"")}</textarea></div>`;
      const rd = it.readiness||[];
      h += `<div class="card" style="gap:2px"><b style="padding-bottom:4px">How ready is it?</b>${rd.length?rd.map(r=>{const st=(r.state||"").toLowerCase(); const ok=st.startsWith("clear"), mid=st.startsWith("rough"); return `<div class="row" style="justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)"><span class="small">${esc(r.label)}</span><span class="chip ${ok?"exc":mid?"blue":"due"}">${esc(r.state)}</span></div>`;}).join(""):`<span class="small muted">Talk it through and the app tracks what's clear and what still needs thinking.</span>`}</div>`;
      h += `<div class="row" style="gap:8px"><button class="btn ghost" data-thinktime="${it.id}" style="flex:1;background:var(--surface)">Set aside thinking time</button><button class="btn coral" data-turninto="${it.id}" style="flex:1">Turn it into…</button></div>`;
    } else {
      const chat = it.chat||[];
      let log = (!chat.length?bubble("assistant", it.ai&&it.ai.understanding? "Let's think it through. What pulled you toward this idea in the first place?" : "What pulled you toward this idea in the first place?"):"") + chat.map(m=>bubble(m.role,m.content)).join("");
      if(it.chatBusy) log += `<div class="bubble ai" id="streamBubble"><span class="dot3">Thinking</span></div>`;
      h += `<div class="card" style="gap:10px"><div class="row" style="justify-content:space-between"><b>Think it through</b>${chat.length?`<button class="btn text" data-clearchat style="min-height:32px;padding:0;font-size:13px">Clear chat</button>`:""}</div><div class="chatlog" id="chatlog" style="max-height:380px">${log}</div>${sampleFn?`<div class="row" style="gap:6px"><input id="chatIn" class="dump" placeholder="Keep thinking…" style="flex:1;min-height:46px"><button class="iconbtn" data-send aria-label="Send" style="background:var(--ink);color:var(--bg)">${ico("send",18)}</button></div>`:`<span class="tiny muted">The chat turns on when the app runs inside Claude.</span>`}${it.notesBusy?`<span class="tiny" style="color:var(--green);font-weight:600">Updating "Your take"…</span>`:""}</div>`;
    }
  } else if(type==="event"){
    h += `<div class="card"><b>${it.event?new Date(it.event.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}):""}${it.event&&it.event.time?" · "+timeLabel(it.event.time):""}</b></div>`;
  }
  if(type==="event") h += notesBlock(it);
  if(it.status!=="done") h += `<button class="btn text" data-delitem="${it.id}" style="color:var(--coral)">Delete</button>`;
  ovShell(it.title, TYPES[type]||"Item", h);
  const l=$("#chatlog"); if(l) l.scrollTop=l.scrollHeight;
}
