import {Type} from '@sinclair/typebox';
import {ProjectStore} from '../../store/index.js';
import {loadCustom} from '../../catalog/custom.js';
import {catalogIndex,describeComponent} from '../../catalog/definitions.js';
import {editDocument} from '../../worker/patch.js';

// This worker has no shell, arbitrary file access, or other installed extensions.
export default function feedbackWorker(pi:any){
 pi.registerTool({name:'formative_worker',label:'Prototype feedback',description:'Read the current prototype, inspect catalog component contracts, edit it with validated JSON Pointer operations, or mark the assigned note failed. Only project JSON is editable. Read before editing. Edits use paths into the project object, e.g. /screens/0/spec/elements/heading/props/text. Preserve unrelated data. For behavioral discoveries, update the linked product requirements as well as the UI. Keep inferred additions proposed or provisional instead of silently expanding accepted requirements. Visual-only changes belong in prototype specs; records about visual experiments use scope:prototype-only and are excluded from the plan. Do not promote sample styling, layout, components or stack to product requirements. If a clear product need cannot be rendered, record the behavioral requirement with resolved:false before failing the prototype note for its catalog gap. Set resolved=true only when the note is fully addressed.',parameters:Type.Object({action:Type.Union(['read','catalog','edit','fail'].map(v=>Type.Literal(v))),feedbackId:Type.String(),name:Type.Optional(Type.String()),query:Type.Optional(Type.String()),expectedRevision:Type.Optional(Type.Integer({minimum:1})),resolved:Type.Optional(Type.Boolean()),reason:Type.Optional(Type.String()),operations:Type.Optional(Type.Array(Type.Object({op:Type.Union(['add','replace','remove'].map(v=>Type.Literal(v))),path:Type.String(),value:Type.Optional(Type.Unknown())}),{minItems:1,maxItems:100}))}),
 async execute(_id:string,args:any,_signal:any,_update:any,ctx:any){
  const custom=await loadCustom(ctx.cwd),store=new ProjectStore(ctx.cwd,custom.manifests),note=(await store.inbox()).find(f=>f.id===args.feedbackId);
  if(!note||note.status!=='running'||note.owner!==process.env.FORMATIVE_WORKER_OWNER)throw new Error('This feedback is no longer assigned to this worker');
  let result:any;
  if(args.action==='read')result={...await store.read(),feedback:note};
  else if(args.action==='catalog')result=args.name?(custom.entries.find(m=>m.name===args.name)??describeComponent(args.name)):[...catalogIndex(args.query),...custom.entries];
  else if(args.action==='fail')result=await store.updateFeedback(note.id,'failed',{error:args.reason||'The prototype subagent needs clarification before changing this note.'});
  else{
   if(!Number.isSafeInteger(args.expectedRevision)||!args.operations)throw new Error('Supply expectedRevision and operations');
   const current=await store.read();if(current.revision!==args.expectedRevision)throw new Error('Revision changed. Read current state and retry the intended edits.');
   const project=editDocument(current.project,args.operations),committed=await store.apply(project,args.expectedRevision,args.resolved?[note.id]:[]);
   result={revision:committed.revision,feedbackIds:committed.feedbackIds};
  }
  return {content:[{type:'text',text:JSON.stringify(result)}],details:result};
 }});
}
