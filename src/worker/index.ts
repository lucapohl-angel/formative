import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ProjectStore} from '../store/index.js';

export type WorkerStatus={connected:boolean;live:boolean;label:string;phase:'starting'|'ready'|'running'|'offline'|'stopped'};
export type WorkerOptions={command?:string;args?:string[];timeoutMs?:number;onStatus?:(status:WorkerStatus)=>void};
export class FeedbackWorker{
 readonly owner=`pid:${process.pid}:formative-worker:${randomUUID()}`;
 private child?:ChildProcessWithoutNullStreams;
 private active?:{resolve:()=>void;reject:(error:Error)=>void};
 private ready?:{resolve:()=>void;reject:(error:Error)=>void};
 private boot?:Promise<void>;
 private queue:string[]=[];
 private pending=new Set<string>();
 private loop?:Promise<void>;
 private stopped=false;
 private closing?:Promise<void>;
 private lastError='';
 status:WorkerStatus={connected:false,live:true,label:'Starting prototype subagent…',phase:'starting'};
 constructor(readonly store:ProjectStore,private options:WorkerOptions={}){}
 private update(phase:WorkerStatus['phase'],label:string){this.status={connected:phase==='ready'||phase==='running',live:true,phase,label};this.options.onStatus?.(this.status);}
 async start(){
  if(this.stopped)throw new Error('Prototype testing has ended');
  if(this.boot)return this.boot;
  this.update('starting','Starting prototype subagent…');
  this.boot=this.startProcess().catch(error=>{this.boot=undefined;this.update('offline',`Prototype subagent unavailable — ${error.message}`);throw error;});
  return this.boot;
 }
 private async startProcess(){
  const extension=fileURLToPath(new URL('../adapters/pi/feedback-worker.ts',import.meta.url));
  const command=this.options.command??process.env.FORMATIVE_PI_COMMAND??'pi';
  const args=this.options.args??['--mode','rpc','--no-session','--offline','--approve','--no-mcp','--no-context-files','--no-extensions','--no-skills','--no-prompt-templates','-e',extension,'--tools','formative_worker','--system-prompt','You are the dedicated Formative requirements-discovery prototype subagent. The prototype rehearses and validates a product plan; it does not prescribe the final visual design. Behavioral feedback must update the linked feature rules, acceptance scenarios, journeys, or product decisions when the underlying requirement changes, as well as the prototype. Preserve existing approval status; new inferences remain proposed. Do not add inferred rules to an accepted feature under its accepted status; capture them in a proposed feature or provisional decision. An explicit user choice can supersede an earlier choice with recorded evidence; ambiguous conflicts stay provisional. Keep visual-only adjustments in screen specs. Never infer required colors, typography, exact placement, components, or implementation stack from the prototype. If a visual experiment needs a feature/decision record, set scope to prototype-only so it is excluded from the plan. Example: a button beside member search demonstrates the ability to invite teammates; its position, color and catalog component are not requirements. You only have formative_worker. Before delivering the revision, automatically review it at least three times with honest self-critique: intent and completeness, dependencies and failure cases, then contract consistency and evidence. Keep revising and reviewing until you can deliver something you are truly proud of for the assigned task. Review against current project and catalog evidence before the final resolved commit; successful validation checks the contract, not visual correctness. You cannot inspect the browser, so never claim visual verification. Handle the assigned note using small validated JSON edits. Read current project, consult exact catalog contracts when needed, preserve unrelated decisions and IDs. Do not generate code files or request other tools. Mark resolved only after a committed edit satisfies the note. If intent is ambiguous, mark the note failed with the specific question. If the product need is clear but the catalog cannot demonstrate it, first record the behavioral requirement as proposed with requested provenance and implementation unbuilt using an edit with resolved:false, then mark the prototype note failed explaining the catalog gap. A renderer limitation must not erase a valid product need.'];
  const child=spawn(command,args,{cwd:this.store.projectDir,stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32',env:{...process.env,FORMATIVE_WORKER_OWNER:this.owner}});this.child=child;this.lastError='';
  const lines=createInterface({input:child.stdout});
  lines.on('line',line=>{
   if(this.child!==child)return;
   let event:any;try{event=JSON.parse(line);}catch{return;}
   if(event.type==='response'&&event.id==='formative-ready'){if(event.success===false)this.ready?.reject(new Error(event.error||'Pi could not initialize'));else this.ready?.resolve();}
   if(event.type==='response'&&event.command==='prompt'&&event.success===false)this.active?.reject(new Error(event.error||'Pi rejected feedback'));
   if(event.type==='message_end'&&event.message?.role==='assistant'&&event.message.errorMessage)this.lastError=String(event.message.errorMessage);
   if(event.type==='agent_end')this.active?.resolve();
  });
  child.stderr.on('data',data=>{if(this.child!==child)return;this.lastError=(this.lastError+String(data)).slice(-1500);});
  const exited=(error:Error)=>{if(this.child!==child)return;this.child=undefined;this.boot=undefined;this.ready?.reject(error);this.active?.reject(error);if(!this.stopped)this.update('offline','Prototype subagent disconnected. Retry the saved note.');};
  child.stdin.on('error',error=>exited(new Error(`Could not send feedback to Pi: ${error.message}`)));
  child.on('error',error=>exited(new Error(`Could not start Pi: ${error.message}`)));child.on('exit',(code,signal)=>{lines.close();exited(new Error(`Prototype subagent exited (${signal??code}). ${this.lastError.slice(-400)}`));});
  try{
   await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Pi did not become ready within 20 seconds')),20000);this.ready={resolve:()=>{clearTimeout(timer);resolve();},reject:error=>{clearTimeout(timer);reject(error);}};child.stdin.write(JSON.stringify({id:'formative-ready',type:'get_state'})+'\n');});
   this.update('ready','Prototype subagent ready — main chat stays available');
  }catch(error){await this.kill();throw error;}finally{this.ready=undefined;}
 }
 async enqueue(id:string){
  if(this.stopped)throw new Error('Prototype testing has ended');
  if(this.pending.has(id))return;
  const note=(await this.store.inbox()).find(f=>f.id===id);if(!note||note.status==='applied'||note.status==='running')return;
  this.pending.add(id);this.queue.push(id);
  this.kick();
 }
 private kick(){if(this.loop||this.stopped)return;this.loop=this.drain().finally(()=>{this.loop=undefined;if(this.queue.length&&!this.stopped)this.kick();});}
 private async drain(){
  while(this.queue.length&&!this.stopped){
   const id=this.queue.shift()!;
   try{
    await this.start();if(this.stopped)throw new Error('Testing ended');
    const note=(await this.store.inbox()).find(f=>f.id===id);if(!note||note.status==='applied'){continue;}
    if(note.status==='failed')await this.store.updateFeedback(id,'queued');
    await this.store.updateFeedback(id,'running',{owner:this.owner});
    this.lastError='';
    this.update('running',`Prototype subagent working${this.queue.length?` · ${this.queue.length} queued`:''}`);
    await new Promise<void>((resolve,reject)=>{
     const timer=setTimeout(()=>{void this.kill().finally(()=>reject(new Error('Prototype update timed out. Your note is saved; retry it.')));},this.options.timeoutMs??120000);
     this.active={resolve:()=>{clearTimeout(timer);resolve();},reject:error=>{clearTimeout(timer);reject(error);}};
     this.child!.stdin.write(JSON.stringify({type:'prompt',message:`Handle feedback ID ${id} now. User note: ${JSON.stringify(note.text)}. Screen: ${note.screen}; element: ${note.target}; original revision: ${note.revision}. Read current project first. Use edit with resolved:true when the request is complete, then stop immediately after the successful commit. Keep changes focused.`})+'\n');
    });
    const after=(await this.store.inbox()).find(f=>f.id===id);if(after?.status==='running')throw new Error(this.lastError||'The prototype subagent ended without applying this note. Retry or clarify it.');
   }catch(error:any){const note=(await this.store.inbox()).find(f=>f.id===id);if(note&&note.status!=='applied')await this.store.updateFeedback(id,'failed',{error:this.stopped?'Testing ended before this note was completed. Reopen and retry to continue.':String(error.message??error)});}
   finally{this.active=undefined;this.pending.delete(id);}
  }
  if(!this.stopped&&this.child)this.update('ready','Prototype subagent ready — main chat stays available');
 }
 async resumeQueued(){for(const note of await this.store.inbox())if(note.status==='queued')await this.enqueue(note.id);}
 private async kill(){
  const child=this.child;if(!child)return;this.child=undefined;this.boot=undefined;
  const signal=(value:NodeJS.Signals)=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,value);else child.kill(value);}catch{child.kill(value);}};
  await new Promise<void>(resolve=>{if(child.exitCode!==null||child.signalCode!==null){resolve();return;}const timer=setTimeout(()=>signal('SIGKILL'),1500);child.once('exit',()=>{clearTimeout(timer);resolve();});signal('SIGTERM');});
 }
 close(){return this.closing??=(async()=>{
  this.stopped=true;this.active?.reject(new Error('Testing ended'));this.ready?.reject(new Error('Testing ended'));await this.kill();await this.loop;
  for(const id of this.pending){const note=(await this.store.inbox()).find(f=>f.id===id);if(note&&note.status!=='applied')await this.store.updateFeedback(id,'failed',{error:'Testing ended before this note was completed. Reopen and retry to continue.'});}
  this.pending.clear();this.queue=[];this.update('stopped','Prototype subagent stopped');
 })();}
}
