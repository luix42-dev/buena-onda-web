import {execFileSync} from 'node:child_process'
import {writeFileSync,mkdirSync} from 'node:fs'
const folder='docs/cruise/prototype-20261020/native-night';mkdirSync(folder,{recursive:true})
const client='D:/10-VENTURES/12-buena-onda/cruise-publish-20261006/.vercel/cinema-probe/mcp-client.mjs'
function invoke(label,request){
 const file=`${folder}/${label}-request.json`;writeFileSync(file,JSON.stringify(request))
 const output=execFileSync(process.execPath,[client,'call',file],{encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024});writeFileSync(`${folder}/${label}.json`,output)
 const r=JSON.parse(output);if(r.result?.isError)throw Error(output)
 const c=r.result.content.find(c=>c.type==='text');const v=JSON.parse(c.text);if(v.error)throw Error(c.text);return v
}
const call=(label,toolset_name,tool_name,args)=>invoke(label,{name:'call_tool',arguments:{toolset_name,tool_name,arguments:args}})
for(const toolset of ['editor_toolset.toolsets.scene.SceneTools','editor_toolset.toolsets.object.ObjectTools','editor_toolset.toolsets.material.MaterialTools'])invoke(`describe-${toolset.split('.').at(-1)}`,{name:'describe_toolset',arguments:{toolset_name:toolset}})
call('current-level','editor_toolset.toolsets.scene.SceneTools','get_current_level',{})
for(const type of ['DirectionalLight','SkyLight','ExponentialHeightFog','TextRenderActor']){
 const r=call(`find-${type}`,'editor_toolset.toolsets.scene.SceneTools','find_actors',{name:'',tag:'',collision_channels:[],actor_type:{refPath:`/Script/Engine.${type}`}})
 console.log(type,JSON.stringify(r))
 for(const [i,actor] of (r.returnValue||[]).slice(0,2).entries())call(`${type}-${i}-properties`,'editor_toolset.toolsets.object.ObjectTools','list_properties',{instance:actor})
}
