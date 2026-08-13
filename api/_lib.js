const OFFICIAL_SOURCE="https://docs.invidious.io/instances/";
const FALLBACK_INSTANCES=[
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.chocolatemoo53.com",
  "https://invidious.tiekoetter.com",
  "https://invidious.f5.si",
  "https://inv.zoomerville.com"
];

function normalize(u){return String(u||"").trim().replace(/\/+$/,"")}
function validUrl(u){try{const x=new URL(u);return x.protocol==="https:"||x.protocol==="http:"}catch{return false}}

function readCookie(req){
  const raw=req.headers.cookie||"";
  const m=raw.match(/(?:^|;\s*)vidora_instances=([^;]*)/);
  if(!m)return [];
  try{const a=JSON.parse(decodeURIComponent(m[1]));return Array.isArray(a)?[...new Set(a.map(normalize).filter(validUrl))]:[]}catch{return []}
}
function getInstances(req){
  const custom=readCookie(req);
  return custom.length?custom:[...FALLBACK_INSTANCES];
}
function saveInstances(res,instances){
  const value=encodeURIComponent(JSON.stringify(instances));
  res.setHeader("Set-Cookie",`vidora_instances=${value}; Path=/; Max-Age=31536000; SameSite=Lax`);
}
async function requestText(url,timeout=9000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{signal:c.signal,redirect:"follow",headers:{
      "User-Agent":"Mozilla/5.0 (compatible; Vidora/1.5)",
      "Accept":"text/html,application/json,text/plain,*/*"
    }});
    return {status:r.status,text:await r.text(),finalUrl:r.url};
  }finally{clearTimeout(t)}
}
async function requestJson(base,path,timeout=10000){
  const r=await requestText(normalize(base)+path,timeout);
  if(r.status<200||r.status>=300)throw Error(`HTTP ${r.status}`);
  try{return JSON.parse(r.text)}catch{throw Error("Antwort ist kein JSON")}
}

async function diagnoseInstance(instance){
  instance=normalize(instance);
  const tests=[
    {name:"Website",path:"/",type:"html"},
    {name:"Stats",path:"/api/v1/stats",type:"json"},
    {name:"Suche",path:"/api/v1/search?q=music&type=video&page=1",type:"json"},
    {name:"Trends",path:"/api/v1/trending",type:"json"}
  ];
  const result={instance,website:null,stats:null,search:null,trending:null,usable:false};
  for(const test of tests){
    try{
      if(test.type==="html"){
        const r=await requestText(instance+test.path,8000);
        result.website={ok:r.status>=200&&r.status<400,status:r.status};
      }else{
        const d=await requestJson(instance,test.path,9000);
        result[test.name.toLowerCase()]={ok:true,status:200,sample:Array.isArray(d)?d.length:1};
      }
    }catch(e){
      result[test.name.toLowerCase()]={ok:false,error:e.message};
    }
  }
  result.usable=!!(result.search?.ok||result.trending?.ok||result.stats?.ok);
  return result;
}

async function failover(instances,path){
  let last=new Error("Keine funktionierende Invidious-API gefunden.");
  for(const instance of instances){
    try{return {data:await requestJson(instance,path),instance}}catch(e){last=e}
  }
  throw last;
}

async function discoverOfficial(){
  // The official Invidious documentation lists the currently trusted public
  // instances. The page is parsed instead of trusting arbitrary third-party lists.
  const r=await requestText(OFFICIAL_SOURCE,10000);
  if(r.status<200||r.status>=300)throw Error(`Instanzliste HTTP ${r.status}`);
  const found=new Set();
  for(const m of r.text.matchAll(/https?:\/\/[A-Za-z0-9.-]+(?::\d+)?/g)){
    const u=normalize(m[0]);
    if(validUrl(u)&&!u.includes("docs.invidious.io"))found.add(u);
  }
  return [...new Set([...FALLBACK_INSTANCES,...found])];
}

async function discoverAndDiagnose(){
  const candidates=await discoverOfficial();
  const queue=[...candidates],out=[];
  async function worker(){
    while(queue.length){
      const u=queue.shift();
      if(u)out.push(await diagnoseInstance(u));
    }
  }
  await Promise.all(Array.from({length:4},worker));
  return out;
}

function json(res,status,data){res.status(status).json(data)}
module.exports={FALLBACK_INSTANCES,normalize,validUrl,getInstances,saveInstances,diagnoseInstance,discoverAndDiagnose,failover,json};
