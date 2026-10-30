import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateProject, type Project, type Snapshot, type Feedback } from '../contracts/project.js';
import type { Manifest } from '../catalog/definitions.js';
import {requirementsFrom,type PlanExport} from './requirements.js';

export type TestingHandoff={id:string;revision:number;createdAt:string;destination:'pi'|'cli'|'mcp';status:'prepared'|'delivered';feedback:Feedback[];feedbackIds:string[];path:string;plan?:PlanExport;feedbackLogPath?:string;nextAction?:'resume-discovery'};
export class Conflict extends Error { status = 409; }
async function json(file: string) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function atomic(file: string, value: unknown) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const handle = await fs.open(temp, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2)+'\n'); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(temp, file);
}
export class ProjectStore {
  root: string;
  constructor(public projectDir: string, public components: Record<string, Manifest> = {}) { this.projectDir = path.resolve(projectDir); this.root = path.join(this.projectDir, '.formative'); }
  async locked<T>(fn:()=>Promise<T>): Promise<T> {
    await fs.mkdir(this.root, { recursive: true }); const lock = path.join(this.root, 'write.lock');
    for(let attempt=0;attempt<100;attempt++) {
      try { const h=await fs.open(lock,'wx',0o600); await h.writeFile(String(process.pid)); await h.close(); break; }
      catch(e:any) {
        if(e.code!=='EEXIST')throw e;
        const owner=Number(await fs.readFile(lock,'utf8').catch(()=>''));
        if(owner>0) { try{process.kill(owner,0);}catch(error:any){if(error.code==='ESRCH'){await fs.unlink(lock).catch(()=>{});continue;}} }
        if(attempt===99)throw new Error('Project is busy. Retry after the current write finishes.');
        await new Promise(r=>setTimeout(r,30));
      }
    }
    try{return await fn();}finally{await fs.unlink(lock).catch(()=>{});}
  }
  async read(): Promise<Snapshot> {
    const pointer=await json(path.join(this.root,'current.json'));
    if(!Number.isSafeInteger(pointer.revision)||pointer.revision<1)throw new Error('Invalid current revision. Use history and restore.');
    const snapshot=await this.revision(pointer.revision); validateProject(snapshot.project,this.components); return snapshot;
  }
  async revision(revision:number):Promise<Snapshot> {
    if(!Number.isSafeInteger(revision)||revision<1)throw new Error('Invalid revision');
    return json(path.join(this.root,'revisions',`${revision}.json`));
  }
  async history() {
    const pointer=await json(path.join(this.root,'current.json'));
    const result=[];
    for(let n=pointer.revision;n>=1;n--) {const snapshot=await this.revision(n);result.push({revision:n,savedAt:snapshot.savedAt,title:snapshot.project.title});}
    return result;
  }
  async init(input:unknown) {
    const project=validateProject(input,this.components);
    return this.locked(async()=>{
      try{await fs.access(path.join(this.root,'current.json'));throw new Conflict('Project already exists. Use read and apply to update it.');}catch(e:any){if(e.code!=='ENOENT')throw e;}
      return this.commit(project,1,[]);
    });
  }
  private async commit(project:Project, revision:number, feedbackIds:string[]) {
    const snapshot:Snapshot={revision,savedAt:new Date().toISOString(),project,feedbackIds};
    await atomic(path.join(this.root,'revisions',`${revision}.json`),snapshot);
    await atomic(path.join(this.root,'current.json'),{revision}); return snapshot;
  }
  async apply(input:unknown, expected:number, feedbackIds:string[]=[]) {
    const project=validateProject(input,this.components);
    return this.locked(async()=>{
      const current=await json(path.join(this.root,'current.json')); if(!Number.isSafeInteger(current.revision)||current.revision<1)throw new Error('Current revision pointer is invalid. Recover current.json from the last intact snapshot.'); if(current.revision!==expected)throw new Conflict(`Revision changed from ${expected} to ${current.revision}. Read current state and reapply the intended change.`);
      const feedback=await this.inbox();for(const id of feedbackIds)if(!feedback.some(f=>f.id===id&&['queued','running','failed'].includes(f.status)))throw new Error(`Feedback ${id} is unavailable or already resolved`);
      return this.commit(project,expected+1,feedbackIds);
    });
  }
  async restore(target:number,expected:number) {const record=await this.revision(target);return this.apply(record.project,expected);}
  async inbox():Promise<Feedback[]> {
    let entries:Feedback[];try{entries=await json(path.join(this.root,'feedback.json'));}catch(e:any){if(e.code!=='ENOENT')throw e;return [];}
    const pointer=await json(path.join(this.root,'current.json'));
    const applied=new Map<string,number>();
    for(let n=1;n<=pointer.revision;n++)for(const id of (await this.revision(n)).feedbackIds)applied.set(id,n);
    return entries.map(f=>applied.has(f.id)?{...f,status:'applied',resultRevision:applied.get(f.id),error:undefined}:f);
  }
  async feedback(args:{screen:string;target:string;text:string;revision:number;idempotencyKey?:string}) {
    return this.locked(async()=>{
      const existing=await this.inbox();if(args.idempotencyKey){if(!/^[a-zA-Z0-9-]{16,80}$/.test(args.idempotencyKey))throw new Error('Invalid feedback request ID');const duplicate=existing.find(f=>f.id===args.idempotencyKey);if(duplicate){if(duplicate.text!==args.text.trim()||duplicate.screen!==args.screen||duplicate.target!==args.target)throw new Conflict('Feedback request ID was reused with different contents');return duplicate;}}
      const current=await this.read(); if(args.revision!==current.revision)throw new Conflict('The preview changed. Review the latest version and send your note again.');
      const screen=current.project.screens.find(s=>s.id===args.screen);
      if(!screen||!screen.spec.elements[args.target])throw new Error('Select an element in the current screen');
      if(!args.text.trim()||args.text.length>10000)throw new Error('Feedback must contain between 1 and 10,000 characters');
      const now=new Date().toISOString(),entry:Feedback={id:args.idempotencyKey??randomUUID(),screen:args.screen,target:args.target,revision:args.revision,text:args.text.trim(),featureIds:screen.links[args.target]??screen.featureIds,status:'queued',createdAt:now,updatedAt:now};
      const all=await this.inbox(); all.push(entry); await atomic(path.join(this.root,'feedback.json'),all); return entry;
    });
  }
  async updateFeedback(id:string,status:'queued'|'running'|'failed',options:{owner?:string;error?:string}={}) {
    return this.locked(async()=>{
      const all=await this.inbox(),entry=all.find(f=>f.id===id);if(!entry)throw new Error('Unknown feedback');
      if(entry.status==='applied')throw new Conflict('Feedback is already applied');
      if(status==='running'&&entry.status!=='queued')throw new Conflict('Feedback has already been claimed');
      Object.assign(entry,{status,updatedAt:new Date().toISOString(),error:options.error,owner:options.owner});
      await atomic(path.join(this.root,'feedback.json'),all);return entry;
    });
  }
  async recoverOwner(owner:string) {for(const f of await this.inbox())if(f.status==='running'&&f.owner===owner)await this.updateFeedback(f.id,'failed',{error:'Agent session disconnected. Retry to resume.'});}
  async prepareHandoff(id:string,destination:'pi'|'cli'|'mcp',preserveStatus=false):Promise<TestingHandoff>{
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(id))throw new Error('Invalid testing session ID');
    return this.locked(async()=>{
      const file=path.join(this.root,'testing',`${id}.json`);
      try{const previous=await json(file);if(previous.status==='delivered')return previous;}catch(e:any){if(e.code!=='ENOENT')throw e;}
      const current=await this.read(),all=await this.inbox();
      const feedback=all.filter(f=>f.status==='queued'||f.status==='failed').map(f=>preserveStatus?f:{...f,status:'queued' as const,error:undefined,owner:undefined});
      const plan=await this.exportPlan();
      const handoff:TestingHandoff={nextAction:'resume-discovery',plan,feedbackLogPath:path.join(this.root,'feedback.json'),id,revision:current.revision,createdAt:new Date().toISOString(),destination,status:'prepared',feedback,feedbackIds:feedback.map(f=>f.id),path:file};
      await atomic(path.join(this.root,'feedback.json'),all.map(f=>feedback.find(note=>note.id===f.id)??f));await atomic(file,handoff);return handoff;
    });
  }
  async deliveredHandoff(handoff:TestingHandoff){const result={...handoff,status:'delivered' as const};await atomic(handoff.path,result);return result;}
  async exportPlan():Promise<PlanExport> {
    const snapshot=await this.read(), p=requirementsFrom(snapshot);
    const lines=[`# ${p.title} — requirements snapshot`,'',p.summary,'',`Formative revision ${snapshot.revision}. Prototype behavior is simulated.`, '', p.boundary, '', '## Goals',''];
    p.goals.forEach(g=>lines.push(`- **${g.user}:** ${g.outcome}`));
    for(const j of p.journeys){lines.push('',`## ${j.title}`,'');j.steps.forEach((s,i)=>lines.push(`${i+1}. ${s}`));}
    for(const f of p.features){lines.push('',`## ${f.title}`,'',f.purpose,'',`Decision: ${f.status}. Implementation: ${f.implementation}.`,`Source: ${f.provenance.origin} — ${f.provenance.evidence}`);for(const [name,values]of Object.entries({Rules:f.rules,Dependencies:f.dependencies,Data:f.data,Access:f.access,'Acceptance scenarios':f.acceptance})){if(values.length)lines.push('',`### ${name}`,'',...values.map(v=>`- ${v}`));}}
    lines.push('','## Decisions','');for(const d of p.decisions)lines.push(`### ${d.question}`,'',`Status: ${d.status}. Choice: ${d.choice??'Unresolved'}.`,d.reason,`Alternatives: ${d.options.join('; ')}.`,`Source: ${d.provenance.origin} — ${d.provenance.evidence}`,'');
    const directory=path.join(this.root,'exports');await fs.mkdir(directory,{recursive:true});
    const file=path.join(directory,'requirements.md'),requirementsPath=path.join(directory,'requirements.json');await fs.writeFile(file,lines.join('\n')+'\n');await atomic(requirementsPath,p);return {kind:'requirements-snapshot',path:file,requirementsPath,revision:snapshot.revision,requirements:p};
  }
}
