import { config } from '../config.js';
export async function proxyJson(base:string,path:string,body:unknown){
 if(!base) return {available:false,error:'SERVICE_NOT_CONFIGURED'};
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const r=await fetch(new URL(path,base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  if(!r.ok) return {available:false,error:'UPSTREAM_ERROR',upstreamStatus:r.status};
  return {available:true,result:await r.json()};
 }catch(e){return {available:false,error:e instanceof Error&&e.name==='AbortError'?'UPSTREAM_TIMEOUT':'UPSTREAM_UNAVAILABLE'};}
 finally{clearTimeout(timer);}
}
export const aiProxy=(path:string,body:unknown)=>proxyJson(config.aiUrl,path,body);
export const demandProxy=(body:unknown)=>proxyJson(config.remoteUrl,'/api/v1/demand/estimate',body);

export async function proxyRemoteImagery(files:{imageT1:Express.Multer.File;imageT2:Express.Multer.File}){
 if(!config.remoteUrl) return {available:false,error:'SERVICE_NOT_CONFIGURED'};
 const form=new FormData();
 for(const [field,file] of Object.entries(files)){
  const bytes=file.buffer.buffer.slice(file.buffer.byteOffset,file.buffer.byteOffset+file.buffer.byteLength) as ArrayBuffer;
  form.append(field,new Blob([bytes],{type:file.mimetype}),file.originalname);
 }
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const r=await fetch(new URL('/api/v1/imagery/change-detection',config.remoteUrl),{method:'POST',body:form,signal:controller.signal});
  if(!r.ok)return {available:false,error:'UPSTREAM_ERROR',upstreamStatus:r.status};
  return {available:true,result:await r.json()};
 }catch(e){return {available:false,error:e instanceof Error&&e.name==='AbortError'?'UPSTREAM_TIMEOUT':'UPSTREAM_UNAVAILABLE'};}
 finally{clearTimeout(timer);}
}

export async function remoteResult(path:string){
 if(!config.remoteUrl)return {available:false,error:'SERVICE_NOT_CONFIGURED'};
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const r=await fetch(new URL(path,config.remoteUrl),{signal:controller.signal});
  if(!r.ok)return {available:false,error:'UPSTREAM_ERROR',upstreamStatus:r.status};
  return {available:true,result:await r.json()};
 }catch(e){return {available:false,error:e instanceof Error&&e.name==='AbortError'?'UPSTREAM_TIMEOUT':'UPSTREAM_UNAVAILABLE'};}
 finally{clearTimeout(timer);}
}
