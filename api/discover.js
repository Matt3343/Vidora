const {discoverAndProbe,json}=require("./_lib");
module.exports=async function(req,res){
  if(req.method!=="GET" && req.method!=="POST")
    return json(res,405,{error:"Method not allowed"});
  try{
    const results=await discoverAndProbe();
    json(res,200,{
      ok:true,
      count:results.length,
      instances:results
    });
  }catch(e){
    json(res,502,{error:"Instanzen konnten nicht automatisch gesucht werden.",details:e.message});
  }
};