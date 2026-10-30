import { z } from 'zod';
import { VisibilityConditionStrictSchema, getByPath } from '@json-render/core';
import { manifests, actionSchemas, CATALOG_VERSION } from '../catalog/definitions.js';

const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/);
const provenance = z.object({ origin: z.enum(['requested', 'inferred', 'prototype']), evidence: z.string().min(1) }).strict();
const ActionBindingSchema = z.object({action:z.string(),params:z.record(z.string(),z.unknown()).optional()}).strict();
export const elementSchema = z.object({ type: id, props: z.record(z.string(), z.unknown()), children: z.array(id).optional(),
  visible: VisibilityConditionStrictSchema.optional(), on: z.record(z.string(), z.union([ActionBindingSchema, z.array(ActionBindingSchema)])).optional() }).strict();
export const projectSchema = z.object({
  schemaVersion: z.literal(1), catalogVersion: z.literal(CATALOG_VERSION), id, title: z.string().min(1), summary: z.string(),
  goals: z.array(z.object({ id, user: z.string(), outcome: z.string() }).strict()),
  journeys: z.array(z.object({ id, goalId: id, title: z.string(), steps: z.array(z.string()), featureIds: z.array(id) }).strict()),
  features: z.array(z.object({ id, title: z.string(), purpose: z.string(), rules: z.array(z.string()), dependencies: z.array(id),
    data: z.array(z.string()), access: z.array(z.string()), acceptance: z.array(z.string()),
    scope: z.enum(['product','prototype-only']).optional(), status: z.enum(['proposed', 'accepted', 'deferred', 'rejected']), implementation: z.enum(['unbuilt', 'prototyped', 'implemented']), provenance }).strict()),
  decisions: z.array(z.object({ id, question: z.string(), options: z.array(z.string()), choice: z.string().nullable(), reason: z.string(),
    scope: z.enum(['product','prototype-only']).optional(), status: z.enum(['provisional', 'accepted', 'rejected', 'deferred']), affectedIds: z.array(id), provenance }).strict()),
  screens: z.array(z.object({ id, title: z.string(), featureIds: z.array(id), spec: z.object({ root: id, elements: z.record(id, elementSchema) }).strict(),
    links: z.record(id, z.array(id)).default({}) }).strict()).min(1),
  scenarios: z.array(z.object({ id, title: z.string(), description: z.string(), screen: id, outcome: z.enum(['success', 'failure']),
    state: z.record(z.string(), z.unknown()), controls: z.array(z.object({id,label:z.string(),screen:id.optional(),binding:ActionBindingSchema}).strict()).default([]) }).strict()).min(1),
  theme: z.enum(['light', 'dark']).default('light'),
  customComponents: z.array(z.object({ name: id, version: z.string() }).strict()).default([]),
}).strict();
export type Project = z.infer<typeof projectSchema>;
export type Element = z.infer<typeof elementSchema>;
export type Snapshot = { revision: number; savedAt: string; project: Project; feedbackIds: string[] };
export type Feedback = { id: string; target: string; screen: string; featureIds: string[]; text: string; revision: number;
  status: 'queued' | 'running' | 'applied' | 'failed'; createdAt: string; updatedAt: string; error?: string; resultRevision?: number; owner?: string };

export function assertPath(path: string) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/?)+$/.test(path) || path.split('/').some(p => ['__proto__', 'prototype', 'constructor'].includes(p))) throw new Error(`Invalid state path: ${path}`);
}
export function resolveValues(value: unknown, state: Record<string, unknown>): any {
  if (Array.isArray(value)) return value.map(v => resolveValues(v, state));
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const expr = object.$state ?? object.$bindState;
    if (expr !== undefined) {
      if (Object.keys(object).length !== 1 || typeof expr !== 'string') throw new Error('A binding must contain one state path');
      assertPath(expr); const result = getByPath(state, expr); if (result === undefined) throw new Error(`Missing state path ${expr}`); return result;
    }
    if (Object.keys(object).some(k => k.startsWith('$') || ['__proto__', 'prototype', 'constructor'].includes(k))) throw new Error('Unsupported expression or object key');
    return Object.fromEntries(Object.entries(object).map(([k,v]) => [k, resolveValues(v, state)]));
  }
  return value;
}
export function validateProject(input: unknown, extra: Record<string, typeof manifests[string]> = {}): Project {
  const safeData=(value:unknown,depth=0)=>{if(depth>60)throw new Error('Project nesting is too deep');if(value&&typeof value==='object')for(const[key,child]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw new Error(`Unsafe object key ${key}`);safeData(child,depth+1);}};safeData(input);
  const p = projectSchema.parse(input), components = { ...manifests, ...extra };
  const ids = new Set<string>();
  for (const record of [...p.goals, ...p.journeys, ...p.features, ...p.decisions, ...p.screens, ...p.scenarios]) {
    if (ids.has(record.id)) throw new Error(`Duplicate ID ${record.id}`); ids.add(record.id);
  }
  const features = new Set(p.features.map(f => f.id)); const screens = new Set(p.screens.map(s => s.id));
  const validateAction=(binding:z.infer<typeof ActionBindingSchema>,state:Record<string,unknown>)=>{
    const action=actionSchemas[binding.action as keyof typeof actionSchemas];if(!action)throw new Error(`Unknown action ${binding.action}`);
    const params=action.parse(resolveValues(binding.params??{},state)) as any;
    if(binding.action==='navigate'&&!screens.has(params.screen))throw new Error(`Unknown screen ${params.screen}`);
    for(const field of ['path','form','target','save','close'])if(params[field]){assertPath(params[field]);if(getByPath(state,params[field])===undefined)throw new Error(`Missing action state ${params[field]}`);}
  };
  for(const scenario of p.scenarios){const seen=new Set<string>();for(const control of scenario.controls){if(seen.has(control.id))throw new Error(`Duplicate scenario control ${control.id}`);seen.add(control.id);if(control.screen&&!screens.has(control.screen))throw new Error(`Unknown control screen ${control.screen}`);validateAction(control.binding,scenario.state);}}
  const requireFeature = (key: string) => { if (!features.has(key)) throw new Error(`Unknown feature ${key}`); };
  for (const f of p.features) f.dependencies.forEach(requireFeature);
  const checkDependencies = (key: string, ancestors = new Set<string>()) => {
    if (ancestors.has(key)) throw new Error(`Feature dependency cycle at ${key}`);
    const next = new Set(ancestors).add(key); p.features.find(f=>f.id===key)!.dependencies.forEach(d=>checkDependencies(d,next));
  };
  p.features.forEach(f=>checkDependencies(f.id));
  for (const j of p.journeys) { if (!p.goals.some(g=>g.id===j.goalId)) throw new Error(`Unknown goal ${j.goalId}`); j.featureIds.forEach(requireFeature); }
  for (const d of p.decisions) d.affectedIds.forEach(key=>{if(!ids.has(key))throw new Error(`Unknown decision target ${key}`);});
  for (const s of p.scenarios) if (!screens.has(s.screen)) throw new Error(`Unknown scenario screen ${s.screen}`);
  for (const custom of p.customComponents) if (!extra[custom.name] || extra[custom.name].version !== custom.version) throw new Error(`Component ${custom.name}@${custom.version} is not registered. Register the project component or restore a compatible revision.`);
  for (const screen of p.screens) {
    screen.featureIds.forEach(requireFeature); const elements = screen.spec.elements;
    const visited = new Set<string>();
    const visit = (key: string, path: Set<string>) => {
      if (path.has(key)) throw new Error(`Element cycle at ${key}`);
      if (visited.has(key)) throw new Error(`Element ${key} has multiple parents`);
      const el = elements[key]; if (!el) throw new Error(`Missing element ${key}`);
      visited.add(key); const next = new Set(path).add(key); el.children?.forEach(child=>visit(child,next));
    };
    visit(screen.spec.root, new Set());
    if (visited.size !== Object.keys(elements).length) throw new Error(`Unreachable elements in ${screen.id}`);
    for (const [key, links] of Object.entries(screen.links)) { if (!elements[key]) throw new Error(`Unknown linked element ${key}`); links.forEach(requireFeature); }
    for (const [key, el] of Object.entries(elements)) {
      const m = components[el.type]; if (!m) throw new Error(`Unavailable component ${el.type} at ${key}`);
      if (el.children?.length && !m.slots.includes('default')) throw new Error(`${el.type} does not accept children`);
      for (const state of p.scenarios.map(s=>s.state)) {
        const checkCondition=(value:any)=>{if(!value||typeof value!=='object')return;for(const[k,v]of Object.entries(value)){if(k==='$state'&&typeof v==='string'){assertPath(v);if(getByPath(state,v)===undefined)throw new Error(`Missing visibility state ${v}`);}else checkCondition(v);}};checkCondition(el.visible);
        const resolved = resolveValues(el.props,state); m.props.parse(resolved);
        for (const [prop, value] of Object.entries(el.props)) if(value && typeof value === 'object' && '$bindState' in value && !m.bindings.includes(prop)) throw new Error(`${el.type}.${prop} is not writable`);
        if ((el.type==='Link') && !/^(https?:\/\/|#[a-zA-Z])/.test(resolved.href)) throw new Error('Links must be HTTP(S) or a screen fragment');
        if (el.type==='Link' && resolved.href.startsWith('#') && !screens.has(resolved.href.slice(1))) throw new Error(`Unknown linked screen ${resolved.href}`);
        if (el.type==='Image' && !/^(https?:\/\/|\/(?!\/))/.test(resolved.src)) throw new Error('Images must use HTTP(S) or a local asset path');
        for (const [event, bindings] of Object.entries(el.on ?? {})) {
          if(!m.events.includes(event))throw new Error(`${el.type} does not emit ${event}`);
          for(const binding of Array.isArray(bindings)?bindings:[bindings]) {
            validateAction(binding,state);
          }
        }
      }
    }
  }
  return p;
}
