import React from 'react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoundProp } from '@json-render/react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

function Row({item,disabled,move,index,total}:{item:any;disabled:boolean;move:(from:number,to:number)=>void;index:number;total:number}){
  const {attributes,listeners,setNodeRef,transform,transition}=useSortable({id:item.id,disabled});
  return <li ref={setNodeRef} className="f-board-row" style={{transform:CSS.Transform.toString(transform),transition}}><button type="button" className="f-drag-handle" {...attributes} {...listeners} disabled={disabled} aria-label={`Drag ${item.title}`}><GripVertical size={18}/></button><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}</div><div className="f-action-row"><button type="button" className="f-icon-button" disabled={disabled||index===0} aria-label={`Move ${item.title} up`} onClick={()=>move(index,index-1)}><ChevronUp size={16}/></button><button type="button" className="f-icon-button" disabled={disabled||index===total-1} aria-label={`Move ${item.title} down`} onClick={()=>move(index,index+1)}><ChevronDown size={16}/></button></div></li>;
}
export default function SortableBoard({p,bindings,emit}:{p:any;bindings?:Record<string,string>;emit:(event:string)=>void}){
  const [items,setItems]=useBoundProp<any[]>(p.items,bindings?.items),list=items??[];
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  const move=(from:number,to:number)=>{setItems(arrayMove(list,from,to));emit('change');};
  return <section className="f-stack f-gap-md" aria-label={p.label}><h3>{p.label}</h3><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({active,over})=>{if(over&&active.id!==over.id)move(list.findIndex(i=>i.id===active.id),list.findIndex(i=>i.id===over.id));}}><SortableContext items={list.map(i=>i.id)} strategy={verticalListSortingStrategy}><ul className="f-board">{list.map((item,index)=><Row key={item.id} item={item} disabled={p.disabled} move={move} index={index} total={list.length}/>)}</ul></SortableContext></DndContext></section>;
}
