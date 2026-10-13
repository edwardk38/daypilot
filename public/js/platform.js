/* Platform layer for the hosted app.
   The app was first built as a Claude artifact, which provides `claude.use("db" | "user" | "sample")`.
   This file provides the same interface on our own stack:
     db     → Supabase table `app_state` (one JSON document per user, protected by row-level security)
     user   → Supabase Auth (email magic link)
     sample → our server function /api/ai, which holds the Claude API key
   If Supabase isn't configured or the user isn't signed in, the app falls back to local-only storage. */
(function(){
  const C = window.APP_CONFIG || {};
  const configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const sb = configured ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  window.SB = sb;
  let sessionP = sb ? sb.auth.getSession().then(r => r.data.session) : Promise.resolve(null);

  async function token(){ const s = await sessionP; return s ? s.access_token : null; }
  async function api(path, body){
    const t = await token();
    const r = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json", ...(t?{Authorization:"Bearer "+t}:{})}, body:JSON.stringify(body)});
    const j = await r.json().catch(()=>({}));
    if(!r.ok){ const e = new Error(j.error || ("HTTP "+r.status)); e.code = r.status===429?"rate_limited":r.status===401?"not_granted":"failed"; throw e; }
    return j;
  }
  async function toB64(file){ const buf = await file.arrayBuffer(); let s=""; const b=new Uint8Array(buf); for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }

  const sample = async (prompt, opts={}) => {
    const images = [];
    for(const f of (opts.images||[])) images.push({media_type:f.type||"image/png", data: await toB64(f)});
    const r = await api("/api/ai", {prompt, tier:opts.modelTier||"default", images});
    if(opts.onText) opts.onText({text:r.text});
    return {text:r.text, truncated:false};
  };
  sample.json = async (prompt, opts={}) => (await api("/api/ai", {prompt, tier:opts.modelTier||"default", json:true})).json;
  sample.limits = async () => ({images:true});

  const user = { id: async () => { const s = await sessionP; return s ? s.user.id : null; } };

  const db = { doc: (path) => ({
    get: async () => {
      const s = await sessionP; if(!s) return {exists:false, data:()=>null};
      const {data, error} = await sb.from("app_state").select("data").eq("user_id", s.user.id).maybeSingle();
      if(error) throw error;
      return {exists: !!data, data: () => data ? data.data : null};
    },
    set: async (obj) => {
      const s = await sessionP; if(!s) return;
      obj.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const {error} = await sb.from("app_state").upsert({user_id: s.user.id, data: obj, updated_at: new Date().toISOString()});
      if(error) throw error;
    }
  })};

  window.claude = { use: async (name) => {
    const s = await sessionP; if(!s) return null;
    return name==="db" ? db : name==="user" ? user : name==="sample" ? sample : null;
  }};

  /* ---- sign-in screen ---- */
  function signInScreen(){
    const el = document.createElement("div"); el.className="overlay"; el.id="signin"; el.style.cssText="background:var(--bg);z-index:60;padding:28px 22px;gap:14px;justify-content:center";
    el.innerHTML = `<h1>Welcome</h1><p class="muted" style="margin:0">Sign in to sync your plans across your phone and laptop. We'll email you a link; no password needed.</p>
      <input id="siEmail" class="dump" type="email" autocomplete="email" placeholder="you@example.com" style="background:var(--surface)">
      <button class="btn coral" id="siGo">Email me a sign-in link</button>
      <button class="btn text" id="siLocal">Use without an account (this device only)</button>
      <span class="tiny muted" id="siMsg"></span>`;
    document.getElementById("app").appendChild(el);
    el.querySelector("#siGo").onclick = async () => {
      const email = el.querySelector("#siEmail").value.trim(); if(!email) return;
      const {error} = await sb.auth.signInWithOtp({email, options:{emailRedirectTo: location.origin}});
      el.querySelector("#siMsg").textContent = error ? "Couldn't send the link: "+error.message : "Check your email for the sign-in link. You can close this tab.";
    };
    el.querySelector("#siLocal").onclick = () => { localStorage.setItem("skipSignIn","1"); el.remove(); };
  }
  if(sb){
    sb.auth.onAuthStateChange((evt) => { if(evt==="SIGNED_IN" && !window.__signedInOnce){ window.__signedInOnce = true; } });
    sessionP.then(s => { if(!s && !localStorage.getItem("skipSignIn")){ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", signInScreen, {once:true}); else signInScreen(); } });
  }

  /* ---- import data from the Claude-artifact version (open the app with #import) ---- */
  function importSheet(){
    if(location.hash!=="#import" || document.getElementById("impTxt")) return;
    const el = document.createElement("div"); el.className="scrim"; el.id="scrim";
    el.innerHTML = `<div class="sheet"><div class="grab"></div><b style="font-size:20px">Bring your data over</b><span class="small muted">In the Claude version, open Itinerary → settings → Export my data, copy the text, and paste it here.</span><textarea class="notes" id="impTxt" rows="8" style="background:var(--surface);box-shadow:0 0 0 1.5px var(--line) inset"></textarea><button class="btn coral" id="impGo">Import</button></div>`;
    document.getElementById("app").appendChild(el);
    el.querySelector("#impGo").onclick = () => {
      try{ const o = JSON.parse(el.querySelector("#impTxt").value); if(!o || !o.v) throw 0; S = migrate(o); save(); if(window.SB) setTimeout(()=>{ try{ dbRef && dbRef.set(JSON.parse(JSON.stringify(S))); }catch(e){} }, 800); el.remove(); history.replaceState(null,"",location.pathname); render(); toast("Imported. Welcome back."); }
      catch(e){ alert("That doesn't look like exported data. Copy the whole text and try again."); }
    };
  }
  window.addEventListener("load", importSheet);
  window.addEventListener("hashchange", importSheet);

  /* ---- notifications ---- */
  window.enableReminders = async function(){
    try{
      if(!("serviceWorker" in navigator) || !("PushManager" in window)) { toast("This browser can't receive reminders. On iPhone, add the app to your Home Screen first."); return; }
      const perm = await Notification.requestPermission(); if(perm!=="granted"){ toast("Reminders stay off. You can turn them on later in Settings."); return; }
      const reg = await navigator.serviceWorker.ready;
      const key = C.VAPID_PUBLIC_KEY; if(!key){ toast("Reminders aren't configured yet (missing VAPID key)."); return; }
      const raw = atob(key.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(key.length/4)*4,"="));
      const sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: Uint8Array.from(raw, c=>c.charCodeAt(0))});
      await api("/api/push-subscribe", {subscription: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone});
      toast("Reminders are on.");
    }catch(e){ toast("Couldn't turn on reminders: "+e.message); }
  };
  document.addEventListener("click", e => { const b = e.target.closest("[data-notify]"); if(b){ const sc=document.getElementById("scrim"); if(sc) sc.remove(); window.enableReminders(); } });

  if("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(()=>{}));
})();
