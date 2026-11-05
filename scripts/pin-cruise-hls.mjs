import{readFile,writeFile}from'node:fs/promises';import{execFileSync}from'node:child_process'
for(const file of['package.json','package-lock.json']){
 const head=execFileSync('git',['show','HEAD:'+file],{encoding:'utf8',maxBuffer:50_000_000}),original=await readFile('../cruise-publish-20261006/'+file,'utf8')
 console.log(file,{headCRLF:(head.match(/\r\n/g)||[]).length,checkoutCRLF:(original.match(/\r\n/g)||[]).length})
 const newline=original.includes('\r\n')?'\r\n':'\n'
 const text=original.replace(/("dependencies": \{\r?\n)/,(_match,opening)=>opening+(file==='package.json'?'    ':'        ')+ '"hls.js": "1.7.3",'+newline)
 const parsed=JSON.parse(text),actual=file==='package.json'?parsed.dependencies['hls.js']:parsed.packages[''].dependencies['hls.js']
 if(actual!=='1.7.3')throw Error('Direct dependency insertion failed')
 await writeFile(file,text)
}
