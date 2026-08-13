const {getInstances,failover,json}=require("./_lib");

module.exports=async function handler(req,res){
  if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
  try{
    const result=await failover(getInstances(req),"/api/v1/trending");
    json(res,200,result);
  }catch(error){
    json(res,502,{
      error:"Trends konnten nicht geladen werden.",
      details:error.message
    });
  }
};