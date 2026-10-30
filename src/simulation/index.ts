import type { StateStore } from '@json-render/core';
import { actionSchemas } from '../catalog/definitions.js';
import { assertPath, type Project } from '../contracts/project.js';

export function simulationHandlers(store:StateStore, options:{project:Project; scenario:Project['scenarios'][number];navigate:(screen:string)=>void;reset:()=>void;notify:(message:string,tone:string)=>void}) {
  const {scenario,notify}=options;
  const put=(path:string,value:unknown)=>{assertPath(path);store.set(path,value);};
  return {
    set(raw:Record<string,unknown>){const p=actionSchemas.set.parse(raw);put(p.path,p.value);},
    navigate(raw:Record<string,unknown>){const p=actionSchemas.navigate.parse(raw);if(!options.project.screens.some(s=>s.id===p.screen))throw new Error('Unknown screen');options.navigate(p.screen);},
    reset(){options.reset();},
    notify(raw:Record<string,unknown>){const p=actionSchemas.notify.parse(raw);notify(p.message,p.tone);},
    record(raw:Record<string,unknown>){const p=actionSchemas.record.parse(raw),rows=store.get(p.path);if(!Array.isArray(rows))throw new Error('Record target must be a list');
      if(p.operation==='add'){if(!p.value)throw new Error('Supply the record');put(p.path,[...rows,{...p.value,id:p.value.id??`record-${rows.length+1}`}]);}
      if(p.operation==='update')put(p.path,rows.map(r=>r.id===p.id?{...r,...p.value}:r));
      if(p.operation==='remove')put(p.path,rows.filter(r=>r.id!==p.id));
    },
    submit(raw:Record<string,unknown>){const p=actionSchemas.submit.parse(raw);
      if(scenario.outcome==='failure'){notify(p.failure,'danger');return;}
      const data=store.get(p.form);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Submission form must be an object');
      if(p.target){const records=store.get(p.target);if(!Array.isArray(records))throw new Error('Submission target must be a list');put(p.target,[...records,{...data,id:`record-${records.length+1}`}]);}
      if(p.save)put(p.save,structuredClone(data));if(p.close)put(p.close,false);notify(p.message,'success');
    }
  };
}
