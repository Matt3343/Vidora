const {
  DEFAULT_INSTANCES,getInstances,setInstancesCookie,
  normalize,validUrl,checkInstance,json
}=require("./_lib");

module.exports=async function handler(req,res){
  let instances=getInstances(req);

  if(req.method==="GET"){
    const checked=await Promise.all(
      instances.map(async url=>{
        const result=await checkInstance(url);
        return {
          url,
          ok:result.ok,
          endpoint:result.endpoint||null,
          error:result.error||null
        };
      })
    );

    return json(res,200,{
      instances:checked,
      defaults:DEFAULT_INSTANCES
    });
  }

  if(req.method==="POST"){
    const url=normalize(req.body?.url);

    if(!url)return json(res,400,{error:"Bitte eine Instanz-URL eingeben."});
    if(!validUrl(url)){
      return json(res,400,{
        error:"Ungültige URL. Beispiel: https://inv.nadeko.net"
      });
    }
    if(instances.includes(url)){
      return json(res,409,{error:"Diese Instanz ist bereits vorhanden."});
    }

    // Store first. A failed API check must never turn into a 404.
    instances=[...instances,url];
    setInstancesCookie(res,instances);

    const result=await checkInstance(url);

    return json(res,201,{
      ok:true,
      added:url,
      reachable:result.ok,
      warning:result.ok
        ? null
        : "Instanz gespeichert, aber momentan nicht erreichbar oder nicht kompatibel.",
      details:result.ok?null:result.error
    });
  }

  if(req.method==="DELETE"){
    const url=normalize(req.body?.url);

    if(!instances.includes(url)){
      return json(res,404,{error:"Instanz nicht gefunden."});
    }
    if(instances.length<=1){
      return json(res,400,{
        error:"Mindestens eine Instanz muss vorhanden sein."
      });
    }

    instances=instances.filter(x=>x!==url);
    setInstancesCookie(res,instances);

    return json(res,200,{ok:true,instances});
  }

  if(req.method==="PUT"){
    const url=normalize(req.body?.url);

    if(!instances.includes(url)){
      return json(res,404,{error:"Instanz nicht gefunden."});
    }

    const result=await checkInstance(url);

    return json(res,result.ok?200:502,{
      ok:result.ok,
      url,
      endpoint:result.endpoint||null,
      error:result.error||null
    });
  }

  return json(res,405,{error:"Method not allowed"});
};