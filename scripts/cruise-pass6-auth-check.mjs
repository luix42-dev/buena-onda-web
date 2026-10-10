// Fail-closed smoke against the isolated local production server; no credentials.
import {mkdir,writeFile} from 'node:fs/promises'
const base='http://127.0.0.1:3041',checks=[]
for(const [path,method,status] of [['/studio','GET',307],['/api/studio','GET',401],['/api/studio/unknown','GET',401],['/api/admin/kv-debug','GET',401],['/studio/auth/start','POST',503]]){
 const r=await fetch(base+path,{method,redirect:'manual',headers:method==='POST'?{'Origin':base,'Content-Type':'application/json'}:{},...(method==='POST'?{body:'{}'}:{})});checks.push({path,method,status:r.status,expected:status,pass:r.status===status,location:r.headers.get('location')})
}
await mkdir('docs/cruise/pass6/auth',{recursive:true});await writeFile('docs/cruise/pass6/auth/smoke.json',JSON.stringify({date:new Date().toISOString(),configuration:'isolated; password unset; service network blocked',checks},null,2));console.log(JSON.stringify(checks));if(checks.some(x=>!x.pass))process.exitCode=1
