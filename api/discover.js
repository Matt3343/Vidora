const {discoverAndDiagnose,json}=require("./_lib");
module.exports=async function(req,res){
  if(req.method!=="GET"&&req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  try{
    const instances=await discoverAndDiagnose();
    json(res,200,{ok:true,count:instances.length,instances});
  }catch(e){json(res,502,{error:"Offizielle Instanzliste konnte nicht geladen werden.",details:e.message})}
};