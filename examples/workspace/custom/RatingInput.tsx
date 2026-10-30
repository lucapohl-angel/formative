import { React, ActionButton, useBoundProp } from '@formative/runtime';

export default function RatingInput({element,bindings,emit}:{element:{props:{label:string;value:number;disabled?:boolean}};bindings?:Record<string,string>;emit:(event:string)=>void}) {
  const p=element.props;
  const [value,setValue]=useBoundProp(p.value,bindings?.value);
  return <fieldset className="f-radio-group"><legend>{p.label}</legend><div className="f-action-row">{[1,2,3,4,5].map(n=><ActionButton key={n} variant={value===n?'primary':'secondary'} aria-pressed={value===n} disabled={p.disabled} onClick={()=>{setValue(n);emit('change');}}>{n}</ActionButton>)}</div></fieldset>;
}
