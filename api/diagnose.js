const {diagnoseInstance,json}=require("./_lib");
module.exports=async function(req,res){
  if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
  const url=String(req.query.url||"").trim();
  if(!url)return json(res,400,{error:"url fehlt"});
  try{json(res,200,await diagnoseInstance(url))}
  catch(e){json(res,502,{error:e.message})}
};