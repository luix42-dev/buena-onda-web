import {readFile,writeFile} from 'node:fs/promises';
const dir='docs/cruise/miami-ads',before=JSON.parse(await readFile(`${dir}/countach-before-optimization-results.json`,'utf8')),after=JSON.parse(await readFile(`${dir}/after-results.json`,'utf8'));
const report={method:'Offline comparison of actual ten-ray billboard samples at identical vehicle, viewport, driver camera and diagnostic route positions. Raw original and accelerated browser runs remain available. Dynamic occluders can differ between independent runs; differences are reported, never replaced with synthetic matches.',comparisons:[]};
for(const oldRun of before.runs){const newRun=after.runs.find(r=>r.viewport.width===oldRun.viewport.width);if(!newRun)continue;
 for(const oldCar of oldRun.cars){const newCar=newRun.cars.find(c=>c.vehicle===oldCar.vehicle);if(!newCar)continue;
  for(const oldScan of oldCar.scan){const newScan=newCar.scan.find(s=>Math.abs(s.meters-oldScan.meters)<.001);if(!newScan)continue;
   for(const a of oldScan.samples){const b=newScan.samples.find(s=>s.placement.id===a.placement.id);if(!b)continue;
    const hits=(s)=>s.occluders.map(h=>({probe:h.probe,mesh:h.mesh,material:h.material,distance:h.distance}));
    const oldHits=hits(a),newHits=hits(b),hitIdentity=oldHits.length===newHits.length&&oldHits.every((h,i)=>h.mesh===newHits[i].mesh&&h.material===newHits[i].material&&JSON.stringify(h.probe)===JSON.stringify(newHits[i].probe));
    report.comparisons.push({viewport:oldRun.viewport,vehicle:oldCar.vehicle,position:oldScan.meters,id:a.placement.id,before:{occlusion:a.occlusion,visible:a.visible,viewable:a.viewable,readable:a.readable,hits:oldHits},after:{occlusion:b.occlusion,visible:b.visible,viewable:b.viewable,readable:b.readable,hits:newHits},sameQualification:a.visible===b.visible&&a.viewable===b.viewable&&a.readable===b.readable&&a.occlusion===b.occlusion,sameFirstHitIdentity:hitIdentity,maxHitDistanceDifference:hitIdentity&&oldHits.length?Math.max(...oldHits.map((h,i)=>Math.abs(h.distance-newHits[i].distance))):null});
   }
  }
 }
}
report.summary={samples:report.comparisons.length,sameQualification:report.comparisons.filter(c=>c.sameQualification).length,sameFirstHitIdentity:report.comparisons.filter(c=>c.sameFirstHitIdentity).length,blockedSamples:report.comparisons.filter(c=>c.before.occlusion>0).length};
await writeFile(`${dir}/ray-comparison-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
