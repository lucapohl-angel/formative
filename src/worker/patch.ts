export type EditOperation={op:'add'|'replace'|'remove';path:string;value?:unknown};
const forbidden=new Set(['__proto__','prototype','constructor']);
/** A deliberately small JSON Pointer patch dialect. Project validation remains authoritative. */
export function editDocument<T>(document:T,operations:EditOperation[]):T{
 const result=structuredClone(document);
 if(!Array.isArray(operations)||!operations.length||operations.length>100)throw new Error('Supply 1–100 edits');
 for(const operation of operations){
  if(!['add','replace','remove'].includes(operation.op)||!operation.path.startsWith('/'))throw new Error('Unsupported edit');
  const keys=operation.path.slice(1).split('/').map(key=>{if(/~(?![01])/u.test(key))throw new Error('Invalid JSON Pointer escape');return key.replace(/~1/g,'/').replace(/~0/g,'~');});
  if(keys.some(key=>forbidden.has(key)))throw new Error('Unsafe edit path');
  let parent:any=result;
  for(const key of keys.slice(0,-1)){if(parent===null||typeof parent!=='object'||!Object.hasOwn(parent,key))throw new Error(`Missing edit parent: ${operation.path}`);parent=parent[key];}
  const key=keys.at(-1)!;if(parent===null||typeof parent!=='object')throw new Error('Edit parent must be an object or array');
  if(operation.op!=='remove'&&!Object.hasOwn(operation,'value'))throw new Error('Edit requires a value');
  if(Array.isArray(parent)){
   const index=key==='-'&&operation.op==='add'?parent.length:/^(0|[1-9]\d*)$/.test(key)?Number(key):-1;
   if(index<0||index>parent.length||(operation.op!=='add'&&index===parent.length))throw new Error('Invalid array edit index');
   if(operation.op==='add')parent.splice(index,0,structuredClone(operation.value));else if(operation.op==='remove')parent.splice(index,1);else parent[index]=structuredClone(operation.value);
  }else{
   if(operation.op!=='add'&&!Object.hasOwn(parent,key))throw new Error(`Missing edit target: ${operation.path}`);
   if(operation.op==='remove')delete parent[key];else parent[key]=structuredClone(operation.value);
  }
 }
 return result;
}
