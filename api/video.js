const {getInstances,failover,json}=require("./_lib");

module.exports=async function handler(req,res){
  if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
  const id=String(req.query.id||"").trim();
  if(!id)return json(res,400,{error:"Video-ID fehlt."});

  try{
    const result=await failover(
      getInstances(req),
      `/api/v1/videos/${encodeURIComponent(id)}`
    );
    json(res,200,result);
  }catch(error){
    json(res,502,{
      error:"Video konnte von keiner Invidious-Instanz geladen werden.",
      details:error.message
    });
  }
};