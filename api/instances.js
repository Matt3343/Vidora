const {FALLBACK_INSTANCES,getInstances,saveInstances,normalize,validUrl,diagnoseInstance,json}=require("./_lib");
module.exports=async function(req,res){
  let instances=getInstances(req);
  if(req.method==="GET"){
    const results=await Promise.all(instances.map(diagnoseInstance));
    return json(res,200,{instances:results});
  }
  if(req.method==="POST"){
    const url=normalize(req.body?.url);
    if(!url)return json(res,400,{error:"Bitte eine Instanz-URL eingeben."});
    if(!validUrl(url))return json(res,400,{error:"Ungültige URL."});
    if(instances.includes(url))return json(res,409,{error:"Instanz bereits vorhanden."});
    instances=[...instances,url];saveInstances(res,instances);
    const diagnosis=await diagnoseInstance(url);
    return json(res,201,{ok:true,added:url,diagnosis});
  }
  if(req.method==="PUT"){
    const url=normalize(req.body?.url);
    if(!instances.includes(url))return json(res,404,{error:"Instanz nicht gefunden."});
    return json(res,200,await diagnoseInstance(url));
  }
  if(req.method==="DELETE"){
    const url=normalize(req.body?.url);
    if(!instances.includes(url))return json(res,404,{error:"Instanz nicht gefunden."});
    if(instances.length<=1)return json(res,400,{error:"Mindestens eine Instanz muss vorhanden sein."});
    instances=instances.filter(x=>x!==url);saveInstances(res,instances);
    return json(res,200,{ok:true,instances});
  }
  return json(res,405,{error:"Method not allowed"});
};