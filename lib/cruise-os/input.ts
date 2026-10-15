export type CruiseShortcut = 'radio'|'glovebox'|'camera'|'cinematic'|'park'|'back'|null
/** Global shortcuts never steal typing, native activation or a modal's input. */
export function cruiseShortcut(key:string, context:{editable:boolean;modal:boolean;started:boolean;modified:boolean;repeat:boolean}):CruiseShortcut {
  if(context.editable||context.modal||context.modified||context.repeat)return null
  switch(key.toLowerCase()) {
    case 'r':return 'radio'
    case 'g':return 'glovebox'
    case 'escape':return 'back'
    case 'v':return context.started?'camera':null
    case 'd':return context.started?'cinematic':null
    case ' ':return context.started?'park':null
    default:return null
  }
}
/** Standard Gamepad API: return newly pressed buttons only, never hold-to-repeat. */
export function pressedEdges(current:readonly boolean[],previous:readonly boolean[]):number[] {
  return current.flatMap((pressed,index)=>pressed&&!previous[index]?[index]:[])
}
