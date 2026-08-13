const {getInstances,failover,json}=require("./_lib");
module.exports=async function(req,res){
  if(req.method!=="GET") return json(res,405,{error:"Method not allowed"});
  const q=String(req.query.q||"").trim();
  if(!q) return json(res,400,{error:"Suchbegriff fehlt."});
  try{
    const r=await failover(getInstances(req),
      `/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=1`);
    json(res,200,r);
  }catch(e){
    json(res,502,{error:"Keine funktionierende Invidious-Instanz.",details:e.message});
  }
};