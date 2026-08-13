const express=require("express");
const path=require("path");
const app=express();
const PORT=process.env.PORT||3000;

let instances=[
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de"
];

const state=new Map();
const normalize=u=>String(u??"").trim().replace(/\/+$/,"");
function validUrl(u){try{const x=new URL(u);return x.protocol==="http:"||x.protocol==="https:"}catch{return false}}
instances=[...new Set(instances.map(normalize).filter(validUrl))];

function st(u){if(!state.has(u))state.set(u,{ok:true,failures:0,lastCheck:0});return state.get(u)}
function ordered(){return [...instances].sort((a,b)=>{const A=st(a),B=st(b);return A.ok!==B.ok?(A.ok?-1:1):A.failures-B.failures})}

async function requestJson(instance,apiPath,timeout=8000){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(normalize(instance)+apiPath,{signal:c.signal,headers:{"User-Agent":"Vidora/1.1","Accept":"application/json"}});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer)}
}

async function failover(apiPath){
  let last=new Error("Keine Invidious-Instanz erreichbar.");
  for(const instance of ordered()){
    try{
      const data=await requestJson(instance,apiPath);
      const s=st(instance);s.ok=true;s.failures=0;s.lastCheck=Date.now();
      return {data,instance};
    }catch(e){
      last=e;const s=st(instance);s.ok=false;s.failures++;s.lastCheck=Date.now();
    }
  }
  throw last;
}

app.use(express.json({limit:"100kb"}));

app.get("/api/instances",(req,res)=>res.json({
  instances:instances.map(url=>({url,...st(url)})),activeOrder:ordered()
}));

app.post("/api/instances",async(req,res)=>{
  try{
    const url=normalize(req.body?.url);
    if(!url)return res.status(400).json({error:"Bitte eine Invidious-URL eingeben."});
    if(!validUrl(url))return res.status(400).json({error:"Ungültige URL. Beispiel: https://inv.nadeko.net"});
    if(instances.includes(url))return res.status(409).json({error:"Diese Instanz ist bereits vorhanden."});

    instances.push(url);st(url);
    let reachable=true,warning=null;
    try{
      await requestJson(url,"/api/v1/search?q=test&type=video&page=1",5000);
      st(url).ok=true;st(url).failures=0;st(url).lastCheck=Date.now();
    }catch(e){
      reachable=false;warning=`Instanz gespeichert, aber aktuell nicht erreichbar: ${e.message}`;
      st(url).ok=false;st(url).failures=1;st(url).lastCheck=Date.now();
    }
    res.status(201).json({ok:true,added:url,reachable,warning});
  }catch(e){
    console.error(e);
    res.status(500).json({error:"Instanz konnte nicht hinzugefügt werden.",details:e.message});
  }
});

app.delete("/api/instances",(req,res)=>{
  const url=normalize(req.body?.url);
  if(!instances.includes(url))return res.status(404).json({error:"Instanz nicht gefunden."});
  if(instances.length<=1)return res.status(400).json({error:"Mindestens eine Instanz muss vorhanden sein."});
  instances=instances.filter(x=>x!==url);state.delete(url);
  res.json({ok:true,instances});
});

app.post("/api/instances/check",async(req,res)=>{
  const url=normalize(req.body?.url);
  if(!instances.includes(url))return res.status(404).json({error:"Instanz nicht gefunden."});
  try{
    await requestJson(url,"/api/v1/search?q=test&type=video&page=1",6000);
    st(url).ok=true;st(url).failures=0;st(url).lastCheck=Date.now();
    res.json({ok:true,url});
  }catch(e){
    st(url).ok=false;st(url).failures++;st(url).lastCheck=Date.now();
    res.status(502).json({error:e.message});
  }
});

app.get("/api/search",async(req,res)=>{
  const q=String(req.query.q||"").trim();
  if(!q)return res.status(400).json({error:"Suchbegriff fehlt."});
  try{res.json(await failover(`/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=1`))}
  catch(e){res.status(502).json({error:"Keine Invidious-Instanz erreichbar.",details:e.message})}
});

app.get("/api/trending",async(req,res)=>{
  try{res.json(await failover("/api/v1/trending"))}
  catch(e){res.status(502).json({error:"Keine Invidious-Instanz erreichbar.",details:e.message})}
});

app.get("/api/video/:id",async(req,res)=>{
  try{res.json(await failover(`/api/v1/videos/${encodeURIComponent(req.params.id)}`))}
  catch(e){res.status(502).json({error:"Video konnte nicht geladen werden.",details:e.message})}
});

app.use(express.static(path.join(__dirname,"public")));
app.use((req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT,()=>console.log(`Vidora: http://localhost:${PORT}`));