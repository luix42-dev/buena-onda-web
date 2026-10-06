/** Static launch placements. Campaign creative/name/destination remain in campaigns.ts. */
export const LAUNCH_PLACEMENTS = [
  { id:'coastal-approach-board', format:'billboard', moduleId:'coastal-approach', localZ:-12, x:-12, y:5.2, width:10, height:4.2, rotationY:.08 },
  { id:'causeway-scenic-board', format:'billboard', moduleId:'causeway-scenic', localZ:-12, x:-12, y:5.2, width:10, height:4.2, rotationY:.08 },
  { id:'highway-main-board', format:'billboard', moduleId:'highway-billboard-run', localZ:-12, x:19, y:5.5, width:11, height:4.6, rotationY:-.08 },
] as const
