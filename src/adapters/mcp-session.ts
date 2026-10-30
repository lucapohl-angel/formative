import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {ProjectStore,type TestingHandoff} from '../store/index.js';
import {loadCustom} from '../catalog/custom.js';
import {catalogIndex,describeComponent} from '../catalog/definitions.js';
import {startServer} from '../server/index.js';
import {discoveryContinuation} from './discovery-handoff.js';

type Preview=Awaited<ReturnType<typeof startServer>>;
type ProjectSession={store:ProjectStore;preview?:Preview;starting?:Promise<Preview>;waiting:boolean;wake?:()=>void;finished?:TestingHandoff;stopped:boolean};
const skillPath=fileURLToPath(new URL('../../skills/formative/SKILL.md',import.meta.url));

/** Host-owned feedback. No model CLI, account, or Pi installation is required. */
export function createMcpSession(){
 const projects=new Map<string,ProjectSession>(),owner=`pid:${process.pid}:formative-mcp:${randomUUID()}`;
 let closed=false;
 async function project(cwd:unknown){
  if(typeof cwd!=='string'||!path.isAbsolute(cwd))throw new Error('Supply an absolute project cwd, not the MCP installation directory.');
  const root=await fs.realpath(cwd);
  let p=projects.get(root);
  if(!p){p={store:new ProjectStore(root),waiting:false,stopped:false};projects.set(root,p);}
  p.store.components=(await loadCustom(root)).manifests;
  return p;
 }
 async function failPending(p:ProjectSession,all=false){
  for(const note of await p.store.inbox()){
   if((note.status==='running'&&note.owner===owner)||(all&&note.status==='queued'))await p.store.updateFeedback(note.id,'failed',{error:'Testing ended or the host disconnected. Your note is saved; explicitly retry to continue.'});
  }
 }
 async function ensure(p:ProjectSession){
  if(p.preview?.server.listening)return p.preview;
  if(p.starting)return p.starting;
  p.starting=(async()=>{
   await p.store.read();
   for(const note of await p.store.inbox()){
    if(note.status!=='running')continue;
    const pid=Number(note.owner?.match(/^pid:(\d+):/)?.[1]);let alive=false;
    if(pid)try{process.kill(pid,0);alive=true;}catch{}
    if(!alive)await p.store.updateFeedback(note.id,'failed',{error:'The previous feedback agent disconnected. Explicitly retry this note.'});
   }
   p.finished=undefined;p.stopped=false;
   p.preview=await startServer({project:p.store.projectDir,host:'mcp',feedbackMode:'host',preserveFeedbackStatus:true,
    agent:{connected:false,live:true,phase:'offline',label:'Waiting for the host feedback agent — start a background formative_project wait loop'},
    onFeedback:async()=>{p.wake?.();},
    onBeforeFinish:async()=>{await failPending(p,true);},
    onFinish:async handoff=>{p.finished=handoff;p.wake?.();},
    onClose:async()=>{p.stopped=true;await failPending(p);p.wake?.();}
   });return p.preview;
  })().finally(()=>{p.starting=undefined;});
  return p.starting;
 }
 async function wait(p:ProjectSession,args:any,signal?:AbortSignal){
  if(p.waiting)throw new Error('One feedback agent is already waiting for this project. Keep a single dedicated worker.');
  const seconds=args.timeoutSeconds??45;
  if(!Number.isFinite(seconds)||seconds<0||seconds>50)throw new Error('timeoutSeconds must be between 0 and 50.');
  if(!p.preview&&!p.finished)throw new Error('Open a preview before waiting.');
  p.waiting=true;const deadline=Date.now()+seconds*1000;
  try{
   while(!closed&&!signal?.aborted){
    if(p.finished)return {status:'finished',handoff:p.finished,instruction:discoveryContinuation(p.finished,skillPath)};
    if(p.stopped)return {status:'stopped'};
    // Register before the asynchronous inbox read so feedback cannot be missed between read and wait.
    let wake!:()=>void;const changed=new Promise<void>(resolve=>{wake=resolve;p.wake=resolve;});
    const inbox=await p.store.inbox();
    const running=inbox.find(note=>note.status==='running'&&note.owner===owner);
    if(running)throw new Error(`Resolve feedback ${running.id} with apply and feedbackIds, or failFeedback, before waiting again.`);
    const next=inbox.find(note=>note.status==='queued');
    if(next){
     const feedback=await p.store.updateFeedback(next.id,'running',{owner});
     p.preview?.updateAgent({connected:true,phase:'running',label:'Host feedback agent working — main chat stays available'});
     return {status:'feedback',feedback,instruction:'Read the latest project, review the requested change, and apply validated edits with expectedRevision and this feedback ID. Keep product requirements synchronized and approval status intact. Review at least three times with honest self-critique. If unclear or unsupported, retain the requirement and failFeedback with a specific explanation. Then wait again; on finished, return the handoff to the main conversation.'};
    }
    const remaining=deadline-Date.now();if(remaining<=0)return {status:'idle'};
    p.preview?.updateAgent({connected:true,phase:'ready',label:'Host feedback agent waiting — main chat stays available'});
    const timer=setTimeout(wake,remaining);signal?.addEventListener('abort',wake,{once:true});
    try{await changed;}finally{clearTimeout(timer);signal?.removeEventListener('abort',wake);}
   }
   return {status:'stopped'};
  }finally{
   p.waiting=false;p.wake=undefined;
   if(p.preview?.agent.phase==='ready')p.preview.updateAgent({connected:false,phase:'offline',label:'Waiting for the host feedback agent to continue its wait loop'});
  }
 }
 return {
  async call(args:any,{signal}:{signal?:AbortSignal}={}){
   if(closed)throw new Error('MCP session has closed.');
   if(args.action==='catalog'&&!args.cwd)return args.name?describeComponent(args.name):catalogIndex(args.query);
   const p=await project(args.cwd),store=p.store;
   if(args.action==='catalog'){const custom=await loadCustom(store.projectDir);return args.name?(custom.entries.find(m=>m.name===args.name)??describeComponent(args.name)):[...catalogIndex(args.query),...custom.entries];}
   if(args.action==='read')return store.read();
   if(args.action==='init'||args.action==='apply'){
    if(typeof args.file!=='string')throw new Error('Write a project JSON file inside the project and supply file.');
    const file=await fs.realpath(path.resolve(store.projectDir,args.file));
    if(!file.startsWith(store.projectDir+path.sep))throw new Error('Project JSON must be inside the selected project.');
    const input=JSON.parse(await fs.readFile(file,'utf8'));
    const result=args.action==='init'?await store.init(input):await store.apply(input,args.expectedRevision,args.feedbackIds??[]);
    return {revision:result.revision,feedbackIds:result.feedbackIds};
   }
   if(args.action==='feedback')return store.inbox();
   if(args.action==='failFeedback')return store.updateFeedback(args.feedbackId,'failed',{error:args.reason||'The host agent could not resolve this request. Clarify or retry.'});
   if(args.action==='history')return store.history();
   if(args.action==='restore')return store.restore(args.revision,args.expectedRevision);
   if(args.action==='export')return store.exportPlan();
   if(args.action==='wait')return wait(p,args,signal);
   if(args.action==='stop'){await failPending(p,true);await p.preview?.close();return {status:'stopped'};}
   if(args.action==='preview'){
    const service=await ensure(p);
    if(args.openBrowser){const command=process.platform==='darwin'?['open',service.url]:process.platform==='win32'?['rundll32','url.dll,FileProtocolHandler',service.url]:['xdg-open',service.url];const child=spawn(command[0],command.slice(1),{detached:true,stdio:'ignore'});child.on('error',()=>{});child.unref();}
    return {url:service.url,mode:'host',instruction:'Delegate the feedback wait/read/apply loop to one host subagent with these MCP tools, keeping main chat available. No Pi process is started. Feedback remains queued if no agent waits.'};
   }
   throw new Error('Unknown Formative action.');
  },
  async close(){closed=true;for(const p of projects.values()){p.wake?.();if(p.starting)await p.starting.catch(()=>{});await p.preview?.close();}}
 };
}
