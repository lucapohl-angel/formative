import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

// Registry wrappers use display:contents. Measure their first rendered boxes,
// rather than relying on the wrapper's (empty) border box.
export function renderedBounds(element:HTMLElement):DOMRect|null {
  const boxes:DOMRect[]=[];
  function visit(node:HTMLElement){
    const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return;
    const rect=node.getBoundingClientRect();
    if(style.display!=='contents'&&rect.width&&rect.height){boxes.push(rect);return;}
    for(const child of Array.from(node.children))if(child instanceof HTMLElement)visit(child);
  }
  visit(element);if(!boxes.length)return null;
  const left=Math.min(...boxes.map(r=>r.left)),top=Math.min(...boxes.map(r=>r.top));
  return new DOMRect(left,top,Math.max(...boxes.map(r=>r.right))-left,Math.max(...boxes.map(r=>r.bottom))-top);
}
export function SelectionOutline({root,active,selected,elements,theme}:{root:RefObject<HTMLDivElement|null>;active:boolean;selected:string;elements:Record<string,{type:string}>;theme:string}){
  const [frame,setFrame]=useState<{x:number;y:number;width:number;height:number;id:string;label:string}|null>(null);
  useEffect(()=>{
    const container=root.current;if(!container)return;
    let pointer:{x:number;y:number}|null=null,queued=0;
    function measure(){
      queued=0;let element:HTMLElement|null=null;
      if(active&&pointer){const hit=document.elementFromPoint(pointer.x,pointer.y);element=hit?.closest<HTMLElement>('[data-element-id]')??null;if(element&&!container!.contains(element))element=null;}
      else if(!active&&selected)element=container!.querySelector(`[data-element-id="${CSS.escape(selected)}"]`);
      const rect=element&&renderedBounds(element),id=element?.dataset.elementId;
      if(!rect||!id||!elements[id]){setFrame(null);return;}
      const clip=container!.closest('.preview-stage')!.getBoundingClientRect();
      const x=Math.max(0,clip.left,rect.left),y=Math.max(0,clip.top,rect.top),right=Math.min(innerWidth,clip.right,rect.right),bottom=Math.min(innerHeight,clip.bottom,rect.bottom);
      if(right<=x||bottom<=y){setFrame(null);return;}
      const next={x,y,width:right-x,height:bottom-y,id,label:`${elements[id].type} · ${id}`};
      setFrame(old=>old&&JSON.stringify(old)===JSON.stringify(next)?old:next);
    }
    const schedule=()=>{if(!queued)queued=requestAnimationFrame(measure);};
    const move=(event:PointerEvent)=>{pointer={x:event.clientX,y:event.clientY};schedule();};
    const leave=()=>{pointer=null;if(active)setFrame(null);};
    document.addEventListener('pointermove',move);document.documentElement.addEventListener('pointerleave',leave);
    document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);
    const observer=new ResizeObserver(schedule);observer.observe(container);schedule();
    return()=>{cancelAnimationFrame(queued);observer.disconnect();document.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);document.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);};
  },[root,active,selected,elements]);
  if(!frame)return null;
  return createPortal(<div className="f-theme selection-outline-layer" data-theme={theme} aria-hidden="true"><div className={`selection-outline ${active?'is-hover':'is-selected'}`} data-selection-id={frame.id} style={{left:frame.x,top:frame.y,width:frame.width,height:frame.height}}/><div className="selection-outline-label" style={{left:Math.max(4,Math.min(frame.x,window.innerWidth-200)),top:frame.y>28?frame.y-26:frame.y+3}}>{frame.label}{active?' · Click to select':''}</div></div>,document.body);
}
