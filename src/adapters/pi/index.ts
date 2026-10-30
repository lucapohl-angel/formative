import { Type } from '@sinclair/typebox';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ProjectStore } from '../../store/index.js';
import type {WorkerOptions} from '../../worker/index.js';
import { startFeedbackPreview } from '../../worker/preview.js';
import { loadCustom } from '../../catalog/custom.js';
import { catalogIndex, describeComponent } from '../../catalog/definitions.js';
import { discoveryContinuation } from '../discovery-handoff.js';

const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
function open(url:string){const args=process.platform==='darwin'?['open',url]:process.platform==='win32'?['rundll32','url.dll,FileProtocolHandler',url]:['xdg-open',url];const child=spawn(args[0],args.slice(1),{detached:true,stdio:'ignore'});child.on('error',()=>{});child.unref();}
export default function formative(pi:any,options:{workerOptions?:WorkerOptions}={}){
  let service:Awaited<ReturnType<typeof startFeedbackPreview>>|undefined,owner='';
  async function storeFor(ctx:any){if(typeof ctx.isProjectTrusted==='function'&&!ctx.isProjectTrusted())throw new Error('Formative requires a trusted project folder.');const custom=await loadCustom(ctx.cwd);return new ProjectStore(ctx.cwd,custom.manifests);}
  async function close(){if(service){await service.close();service=undefined;}}
  async function ensure(ctx:any){
    const key=`pid:${process.pid}:${ctx.cwd}:${ctx.sessionManager.getSessionId()}`;
    if(owner&&owner!==key)await close();
    if(service&&!service.server.listening)service=undefined;
    if(!service){
      const store=await storeFor(ctx);owner=key;
      for(const entry of await store.inbox()){if(entry.status!=='running')continue;const pid=Number(entry.owner?.match(/^pid:(\d+):/)?.[1]);let alive=false;if(pid){try{process.kill(pid,0);alive=true;}catch{}}if(!alive)await store.updateFeedback(entry.id,'failed',{error:'The previous prototype subagent disconnected. Retry to resume.'});}
      service=await startFeedbackPreview({project:ctx.cwd,host:'pi',workerOptions:options.workerOptions,onFinish:async handoff=>{
        try{await pi.sendUserMessage(discoveryContinuation(handoff,path.join(packageRoot,'skills/formative/SKILL.md')),{deliverAs:'followUp',expandPromptTemplates:false});}catch(error:any){ctx.ui.notify?.(`Testing ended; discovery handoff is saved at ${handoff.path}. Main session delivery failed: ${error.message}`,'warning');}
      }});
    }
    return service;
  }
  pi.registerTool({name:'formative_project',label:'Formative',description:'Discover and prototype products with the independent Formative toolkit. Read the formative skill. Actions: catalog (small index or one component), init from a project JSON file, read, apply with expectedRevision and optional feedbackIds, preview, feedback, failFeedback, history, restore, export (requirements snapshot; agent writes the final plan). Browser behavior is simulated. No Planboard or Grill Me dependency. Use CLI for component registration and additional details.',
    parameters:Type.Object({action:Type.Union(['catalog','init','read','apply','preview','feedback','failFeedback','history','restore','export'].map(v=>Type.Literal(v))),file:Type.Optional(Type.String()),query:Type.Optional(Type.String()),name:Type.Optional(Type.String()),expectedRevision:Type.Optional(Type.Integer({minimum:1})),revision:Type.Optional(Type.Integer({minimum:1})),feedbackIds:Type.Optional(Type.Array(Type.String())),feedbackId:Type.Optional(Type.String()),reason:Type.Optional(Type.String()),openBrowser:Type.Optional(Type.Boolean())}),
    async execute(_id:string,args:any,_signal:any,_update:any,ctx:any){
      const store=await storeFor(ctx);let result:any;
      if(args.action==='catalog'){const custom=await loadCustom(ctx.cwd);result=args.name?(custom.entries.find(m=>m.name===args.name)??describeComponent(args.name)):[...catalogIndex(args.query),...custom.entries.map(m=>({name:m.name,pack:'project',description:m.description,version:m.version}))];}
      else if(args.action==='init'||args.action==='apply'){
        if(!args.file)throw new Error('Write the project JSON file first and supply its path.');const file=path.resolve(ctx.cwd,args.file),real=await fs.realpath(file),root=await fs.realpath(ctx.cwd);if(!real.startsWith(root+path.sep))throw new Error('Project input must be inside the current project.');
        const data=JSON.parse(await fs.readFile(real,'utf8'));const snapshot=args.action==='init'?await store.init(data):await store.apply(data,args.expectedRevision,args.feedbackIds??[]);
        result={revision:snapshot.revision,project:ctx.cwd,feedbackIds:snapshot.feedbackIds};
      }else if(args.action==='read')result=await store.read();
      else if(args.action==='feedback')result=await store.inbox();
      else if(args.action==='failFeedback')result=await store.updateFeedback(args.feedbackId,'failed',{error:args.reason||'The agent could not complete this request. Retry or revise the note.'});
      else if(args.action==='history')result=await store.history();
      else if(args.action==='restore')result=await store.restore(args.revision,args.expectedRevision);
      else if(args.action==='export')result=await store.exportPlan();
      else {const active=await ensure(ctx);if(args.openBrowser)open(active.url);result={url:active.url,agent:active.agent,browserLaunchRequested:!!args.openBrowser};}
      return {content:[{type:'text',text:JSON.stringify(result)}],details:result};
    }
  });
  pi.registerCommand('formative',{description:'Discover an idea and try an interactive prototype; use "open" to resume a saved project.',handler:async(args:string,ctx:any)=>{
    await storeFor(ctx);
    if(args.trim()==='open'){const active=await ensure(ctx);open(active.url);ctx.ui.notify(active.url,'info');return;}
    await pi.sendUserMessage(`Use the formative skill at ${path.join(packageRoot,'skills/formative/SKILL.md')} to help discover and prototype this idea: ${args.trim()||'Continue our current product idea, preserving existing decisions.'} Keep Formative separate from Planboard.`,{deliverAs:'followUp',expandPromptTemplates:false});
  }});
  pi.on('session_start',close);pi.on('session_shutdown',close);
}
