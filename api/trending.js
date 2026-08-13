const {getInstances,failover,json}=require("./_lib");
module.exports=async function(req,res){
  if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
  try{json(res,200,await failover(getInstances(req),"/api/v1/trending"))}
  catch(e){json(res,502,{error:"Trends: keine erreichbare API-Instanz.",details:e.message})}
};