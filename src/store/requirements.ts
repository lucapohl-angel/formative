import type {Snapshot} from '../contracts/project.js';

export const planningBoundary='This is a generated requirements snapshot, not the final plan. It covers the product records represented in this prototype; discovery notes may contain additional unprototyped scope. The agent writes the plan using the structure appropriate to the product. Prototype colors, typography, spacing, layout, component choices, mock data, and rendering stack are illustrative, not implementation requirements. Choose visual design separately using the user’s references. Finishing testing returns to discovery; it does not approve every proposal or authorize implementation.';

/** Explicit allowlist: prototype trees and future presentation fields never become plan inputs. */
export function requirementsFrom(snapshot:Snapshot){
 const p=snapshot.project;
 const productFeatures=p.features.filter(feature=>feature.scope!=='prototype-only');
 const featureIds=new Set(productFeatures.map(feature=>feature.id));
 const excludedIds=new Set(p.features.filter(feature=>feature.scope==='prototype-only').map(feature=>feature.id));
 return {
  kind:'product-requirements' as const,revision:snapshot.revision,title:p.title,summary:p.summary,boundary:planningBoundary,
  goals:p.goals.map(({id,user,outcome})=>({id,user,outcome})),
  journeys:p.journeys.map(({id,goalId,title,steps,featureIds:linked})=>({id,goalId,title,steps,featureIds:linked.filter(id=>featureIds.has(id))})),
  features:productFeatures.map(({id,title,purpose,rules,dependencies,data,access,acceptance,status,implementation,provenance})=>({id,title,purpose,rules,dependencies:dependencies.filter(id=>featureIds.has(id)),data,access,acceptance,status,implementation,provenance})),
  decisions:p.decisions.filter(decision=>decision.scope!=='prototype-only').map(({id,question,options,choice,reason,status,affectedIds,provenance})=>({id,question,options,choice,reason,status,affectedIds:affectedIds.filter(id=>!excludedIds.has(id)),provenance})),
 };
}
export type Requirements=ReturnType<typeof requirementsFrom>;
/** Legacy API name; this exports evidence and never writes the agent-authored plan. */
export type PlanExport={kind:'requirements-snapshot';path:string;requirementsPath:string;revision:number;requirements:Requirements};
