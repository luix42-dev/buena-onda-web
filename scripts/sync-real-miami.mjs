import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises'
import {resolve,join,dirname} from 'node:path'
const target=resolve(import.meta.dirname,'..'),source=resolve(target,'../cruise-miami-geo-20261012')
const remap=text=>text.replaceAll('/lib/cruise/','/lib/real-miami/').replaceAll('/public/cruise/','/public/real-miami/').replaceAll("'/cruise/","'/real-miami/").replaceAll('"/cruise/','"/real-miami/').replaceAll('`/cruise/','`/real-miami/').replaceAll('var(--font-body)','var(--font-sans)').replace('garage:boolean}','garage:boolean;timeMode:\'night\'|\'sunset\'}').replace('garage:!c.started}','garage:!c.started,timeMode:blend.current>=.5?\'night\':\'sunset\'}')
async function walk(folder){for(const item of await readdir(folder,{withFileTypes:true})){const path=join(folder,item.name);if(item.isDirectory())await walk(path);else if(/\.(tsx?|css)$/.test(item.name))await writeFile(path,remap(await readFile(path,'utf8')))}}
for(const [from,to] of [['components/cruise','components/real-miami'],['lib/cruise','lib/real-miami'],['public/cruise','public/real-miami']]){await mkdir(dirname(join(target,to)),{recursive:true});await cp(join(source,from),join(target,to),{recursive:true});if(!from.startsWith('public/'))await walk(join(target,to))}
await mkdir(join(target,'app/api/cruise/now-playing'),{recursive:true})
await writeFile(join(target,'app/api/cruise/now-playing/route.ts'),remap(await readFile(join(source,'app/api/cruise/now-playing/route.ts'),'utf8')))
console.log('Synced isolated real-miami namespace; legacy components, assets and fonts retained.')
