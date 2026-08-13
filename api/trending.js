const {getInstances,failover,json}=require("./_lib");
module.exports=async function(req,res){
  if(req.method!=="GET") return json(res,405,{error:"Method not allowed"});
  try{
    const r=await failover(getInstances(req),"/api/v1/trending");
    json(res,200,r);
  }catch(e){
    json(res,502,{error:"Keine funktionierende Invidious-Instanz.",details:e.message});
  }
};