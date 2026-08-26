/* ============ HORNBILL TACTICAL — SHARED APP LAYER ============ */
const { SUPABASE_URL, SUPABASE_ANON_KEY, PHONE } = window.HT_CONFIG;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "ht-auth" },
});
window.sb = sb;

/* ---- Status / source / urgency maps ---- */
const STATUS = {
  submitted:            { label: "Submitted",           color: "#8b929c", emoji: "🟪" },
  received:             { label: "Received",            color: "#5aa9ff", emoji: "🔵" },
  under_investigation:  { label: "Under Investigation", color: "#F5A623", emoji: "🟠" },
  action_required:      { label: "Action Required",     color: "#ff8a3d", emoji: "🟧" },
  resolved:             { label: "Resolved",            color: "#4ade80", emoji: "🟢" },
  closed:               { label: "Closed",              color: "#6b7280", emoji: "⚫" },
};
const STATUS_ORDER = ["submitted","received","under_investigation","action_required","resolved","closed"];
const SOURCE = {
  staff:  { label: "Hornbill Staff",   color: "#8b929c", emoji: "🛡️" },
  client: { label: "Registered Client",color: "#5aa9ff", emoji: "🔵" },
  guest:  { label: "Guest / Public",   color: "#F5A623", emoji: "🟡" },
};
const URGENCY = {
  low:      { label: "Low",      color: "#4ade80" },
  medium:   { label: "Medium",   color: "#F5A623" },
  high:     { label: "High",     color: "#ff8a3d" },
  critical: { label: "Critical", color: "#ff4d4d" },
};
const INCIDENT_TYPES = ["Suspicious Activity","Theft / Burglary","Vandalism","Trespassing","Access Control Issue",
  "Perimeter Breach","Assault / Violence","Armed Robbery","Vehicle Incident","Fire / Safety Hazard",
  "Alarm Activation","Noise Complaint","Medical Emergency","Other"];

function statusBadge(s){const m=STATUS[s]||STATUS.submitted;
  return `<span class="badge" style="color:${m.color};border-color:${m.color}44"><span class="dot" style="background:${m.color}"></span>${m.label}</span>`;}
function sourceBadge(s){const m=SOURCE[s]||SOURCE.guest;
  return `<span class="badge" style="color:${m.color};border-color:${m.color}44">${m.emoji} ${m.label}</span>`;}
function urgencyBadge(u){const m=URGENCY[u]||URGENCY.medium;
  return `<span class="badge" style="color:${m.color};border-color:${m.color}44">${m.label}</span>`;}

/* ---- Formatting ---- */
const esc = (s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = (n,cur="ZAR")=>(cur==="ZAR"?"R":cur+" ")+Number(n||0).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2});
function fmtDate(d){if(!d)return"—";return new Date(d).toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"});}
function fmtDateTime(d){if(!d)return"—";return new Date(d).toLocaleString("en-ZA",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function timeAgo(d){if(!d)return"";const s=(Date.now()-new Date(d))/1000;
  if(s<60)return"just now";if(s<3600)return Math.floor(s/60)+"m ago";if(s<86400)return Math.floor(s/3600)+"h ago";return Math.floor(s/86400)+"d ago";}

/* ---- Toast ---- */
function toast(msg,type=""){
  let w=document.querySelector(".toast-wrap");
  if(!w){w=document.createElement("div");w.className="toast-wrap";document.body.appendChild(w);}
  const t=document.createElement("div");t.className="toast "+type;t.textContent=msg;w.appendChild(t);
  setTimeout(()=>{t.style.opacity="0";t.style.transition=".4s";setTimeout(()=>t.remove(),400);},3200);
}

/* ---- Edge function caller ---- */
async function callFn(name,body){
  const { data, error } = await sb.functions.invoke(name,{ body });
  if(error){
    let msg="Something went wrong.";
    try{ const ctx=await error.context?.json(); if(ctx?.error) msg=ctx.error; }catch(_){ if(error.message) msg=error.message; }
    return { ok:false, error:msg };
  }
  return data;
}

/* ---- Who am I (role detection via RLS-protected self rows) ---- */
async function whoami(){
  const { data:{ session } } = await sb.auth.getSession();
  if(!session) return null;
  const uid = session.user.id;
  /* 20s timeout prevents infinite hang on Supabase free-tier cold starts */
  const tmout=new Promise((_,r)=>setTimeout(()=>r('db_timeout'),20000));
  try{
    const { data: prof } = await Promise.race([sb.from("profiles").select("*").eq("id",uid).maybeSingle(),tmout]);
    if(prof) return { kind:"staff", user:session.user, profile:prof };
    const { data: cu } = await Promise.race([sb.from("client_users").select("*, clients(*)").eq("id",uid).maybeSingle(),tmout]);
    if(cu) return { kind:"client", user:session.user, clientUser:cu, client:cu.clients };
    return { kind:"unknown", user:session.user };
  }catch(e){ return { kind:"timeout", user:session?.user }; }
}
async function requireRole(kind,loginUrl){
  const me = await whoami();
  if(!me){ location.href=loginUrl; return null; }
  if(me.kind==="timeout") return me; /* let the calling page show a helpful message */
  if(me.kind!==kind){
    if(me.kind==="staff") location.href="console.html";
    else if(me.kind==="client") location.href="portal.html";
    else { await sb.auth.signOut(); location.href=loginUrl; }
    return null;
  }
  return me;
}
async function logout(to){ await sb.auth.signOut(); location.href=to; }

/* ---- Load org branding/company overrides from DB (falls back to config.js silently) ---- */
async function applyOrgSettings(){
  try{
    const { data:s } = await sb.from("org_settings").select("*").eq("id",true).maybeSingle();
    if(!s) return;
    Object.assign(HT_CONFIG.COMPANY,{
      name: s.company_name || HT_CONFIG.COMPANY.name,
      tagline: s.tagline || HT_CONFIG.COMPANY.tagline,
      address: s.address || HT_CONFIG.COMPANY.address,
      email: s.email || HT_CONFIG.COMPANY.email,
      phone: s.phone || HT_CONFIG.COMPANY.phone,
      reg: s.reg_number || HT_CONFIG.COMPANY.reg,
      vat: s.vat_number || HT_CONFIG.COMPANY.vat,
      vatRate: (s.vat_rate ?? HT_CONFIG.COMPANY.vatRate),
      bank: s.bank_details || HT_CONFIG.COMPANY.bank,
    });
  }catch(_){ /* org_settings not reachable (e.g. guest context) — keep config.js defaults */ }
}

/* ---- Client-friendly timeline builder ---- */
function buildTimeline(history){
  // history: [{status,note,created_at}] ordered asc
  const curr = history.length ? history[history.length-1].status : "submitted";
  return history.map((h,i)=>{
    const m=STATUS[h.status]||STATUS.submitted;
    const isLast=i===history.length-1;
    return `<div class="tl-item ${isLast?"current":"done"}">
      <div class="t" style="color:${m.color}">${m.label}</div>
      <div class="d">${fmtDateTime(h.created_at)}</div>
      ${h.note?`<div class="note">${esc(h.note)}</div>`:""}
    </div>`;
  }).join("") || `<div class="empty">No timeline yet.</div>`;
}

/* ---- File -> base64 ---- */
function fileToB64(file){return new Promise((res,rej)=>{const r=new FileReader();
  r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});}

/* ---- QS ---- */
const qs=(k)=>new URLSearchParams(location.search).get(k);

/* ============ INVOICE PDF (jsPDF) ============ */
/* Reads logo + customisation from localStorage (set in Settings → Invoice settings) */
function _invCfg(){try{return JSON.parse(localStorage.getItem("ht_invoice_cfg")||"{}");}catch(_){return{};}}
function _hexRgb(hex){const h=hex.replace("#","");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}

function makeInvoicePdf(inv, client){
  const CO=HT_CONFIG.COMPANY;
  const cfg=_invCfg();
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF({unit:"pt",format:"a4"});
  const W=doc.internal.pageSize.getWidth();
  // Colours — from Settings or defaults
  const gold=cfg.accent?_hexRgb(cfg.accent):[245,166,35];
  const header=cfg.primary?_hexRgb(cfg.primary):[10,11,13];
  const ink=[20,23,27], mute=[120,125,135];
  const footerMsg=cfg.footer_msg||"Thank you for your business.";
  const payTerms=cfg.payment_terms||"";
  const showVat=cfg.show_vat!=="no";

  // Header band
  doc.setFillColor(...header);doc.rect(0,0,W,96,"F");
  doc.setFillColor(...gold);doc.rect(0,96,W,4,"F");

  // Logo if uploaded
  const logoB64=localStorage.getItem("ht_logo_b64");
  let headerTextX=40;
  if(logoB64){
    try{
      const ext=logoB64.startsWith("data:image/png")?"PNG":"JPEG";
      doc.addImage(logoB64,ext,36,14,120,62,undefined,"FAST");
      headerTextX=170;
    }catch(_){}
  }

  doc.setTextColor(...gold);doc.setFont("helvetica","bold");doc.setFontSize(22);
  doc.text(CO.name.toUpperCase(),headerTextX,50);
  doc.setTextColor(200,205,212);doc.setFont("helvetica","normal");doc.setFontSize(9);
  doc.text(cfg.header_sub||CO.tagline,headerTextX,68);
  doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(20);
  doc.text("INVOICE",W-40,50,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(200,205,212);
  doc.text(inv.number||"",W-40,68,{align:"right"});

  // Meta
  let y=140;
  doc.setTextColor(...mute);doc.setFontSize(8);doc.text("BILL TO",40,y);
  doc.text("INVOICE DETAILS",W-220,y);
  doc.setTextColor(...ink);doc.setFontSize(11);doc.setFont("helvetica","bold");
  doc.text(client?.name||"Client",40,y+18);
  doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(80,85,92);
  let cy=y+34;
  [client?.contact_email,client?.contact_phone,client?.address].filter(Boolean).forEach(t=>{doc.text(String(t),40,cy);cy+=13;});
  const meta=[["Issued",fmtDate(inv.issued_date)],["Due",fmtDate(inv.due_date)],["Status",(inv.status||"").toUpperCase()]];
  let my=y+18;doc.setTextColor(80,85,92);
  meta.forEach(([k,v])=>{doc.setFont("helvetica","normal");doc.text(k,W-220,my);doc.setFont("helvetica","bold");doc.setTextColor(...ink);doc.text(String(v),W-40,my,{align:"right"});doc.setTextColor(80,85,92);my+=16;});

  // Payment terms
  let ty=Math.max(cy,my)+24;
  if(payTerms){doc.setTextColor(...mute);doc.setFontSize(8);doc.text(payTerms,40,ty);ty+=16;}

  // Table header
  doc.setFillColor(245,246,248);doc.rect(40,ty,W-80,26,"F");
  doc.setTextColor(...mute);doc.setFontSize(8);doc.setFont("helvetica","bold");
  doc.text("DESCRIPTION",50,ty+17);doc.text("AMOUNT",W-50,ty+17,{align:"right"});
  ty+=26;
  const total=Number(inv.amount||0), rate=CO.vatRate||0, sub=rate&&showVat?total/(1+rate):total, vat=total-sub;
  doc.setTextColor(...ink);doc.setFont("helvetica","normal");doc.setFontSize(10);
  doc.text(inv.description||"Security services",50,ty+20,{maxWidth:W-200});
  doc.text(money(showVat?sub:total,inv.currency),W-50,ty+20,{align:"right"});
  ty+=44;doc.setDrawColor(225,228,232);doc.line(40,ty,W-40,ty);

  // Totals
  let ry=ty+20;doc.setFontSize(10);
  if(showVat&&rate){
    const trows=[["Subtotal",money(sub,inv.currency)],[`VAT (${Math.round(rate*100)}%)`,money(vat,inv.currency)]];
    trows.forEach(([k,v])=>{doc.setTextColor(80,85,92);doc.text(k,W-200,ry);doc.setTextColor(...ink);doc.text(v,W-50,ry,{align:"right"});ry+=18;});
  }
  doc.setFillColor(...header);doc.rect(W-230,ry-2,190,30,"F");
  doc.setTextColor(...gold);doc.setFont("helvetica","bold");doc.setFontSize(12);
  doc.text("TOTAL DUE",W-215,ry+17);doc.text(money(total,inv.currency),W-50,ry+17,{align:"right"});

  // Footer
  const fy=doc.internal.pageSize.getHeight()-90;
  doc.setDrawColor(225,228,232);doc.line(40,fy,W-40,fy);
  doc.setTextColor(...mute);doc.setFont("helvetica","normal");doc.setFontSize(8);
  doc.text(CO.bank,40,fy+18,{maxWidth:W*0.55});
  doc.text([CO.address,`${CO.email} · ${CO.phone}`,`${CO.reg}  ${CO.vat}`].join("\n"),40,fy+34);
  doc.setTextColor(...gold);doc.setFontSize(9);doc.text(footerMsg,W-40,fy+34,{align:"right"});
  return doc;
}
/* ============ CHARTS (Chart.js donut) ============ */
const _charts={};
function donut(canvasId, labels, data, colors){
  if(!window.Chart)return;
  const el=document.getElementById(canvasId);if(!el)return;
  if(_charts[canvasId]){_charts[canvasId].destroy();}
  const has=data.some(v=>v>0);
  _charts[canvasId]=new Chart(el,{type:"doughnut",
    data:{labels, datasets:[{data:has?data:[1], backgroundColor:has?colors:["#262b31"], borderColor:"#0a0b0d", borderWidth:3, hoverOffset:6}]},
    options:{cutout:"64%",responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:"bottom",labels:{color:"#8b929c",font:{family:"Inter",size:11},padding:12,boxWidth:10,usePointStyle:true}},
        tooltip:{enabled:has}},
      animation:{animateScale:true,animateRotate:true,duration:800}}});
}

function viewInvoicePdf(inv,client){const doc=makeInvoicePdf(inv,client);window.open(doc.output("bloburl"),"_blank");}
function downloadInvoicePdf(inv,client){makeInvoicePdf(inv,client).save((inv.number||"invoice")+".pdf");}
function invoicePdfBase64(inv,client){return makeInvoicePdf(inv,client).output("datauristring").split(",")[1];}
