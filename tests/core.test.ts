import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStateStore } from '@json-render/core';
import { validateProject } from '../src/contracts/project.js';
import { ProjectStore, Conflict } from '../src/store/index.js';
import { simulationHandlers } from '../src/simulation/index.js';
import { manifests } from '../src/catalog/definitions.js';
const fixture=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));
const fresh=()=>structuredClone(fixture);
async function temp(){return fs.mkdtemp(path.join(os.tmpdir(),'formative-test-'));}

test('all example projects validate and retain provenance',async()=>{
  for(const name of ['workspace','website','board']){const p=validateProject(JSON.parse(await fs.readFile(new URL(`../examples/${name}/project.json`,import.meta.url),'utf8')));assert.ok(p.features.every(f=>f.provenance.evidence));}
});
test('rejects styling escapes, bad references, cycles, and unsupported events',()=>{
  const cases=[(p:any)=>p.screens[0].spec.elements.heading.props.style={color:'red'},(p:any)=>p.screens[0].spec.elements.heading.type='ImaginaryButton',(p:any)=>p.screens[0].spec.elements.layout.children.push('absent'),(p:any)=>p.screens[0].spec.elements.layout.children.push('root'),(p:any)=>p.features[0].dependencies.push('invitations'),(p:any)=>p.screens[0].spec.elements.inviteButton.on.hover={action:'reset'},(p:any)=>p.screens[0].links.missing=['invitations'],(p:any)=>p.screens[0].spec.elements.inviteButton.on.press.onSuccess={navigate:'https://evil.test'}];
  for(const modify of cases){const p=fresh();modify(p);assert.throws(()=>validateProject(p));}
});
test('bindings and navigation must resolve in every scenario',()=>{
  let p=fresh();delete p.scenarios[1].state.invite.email;assert.throws(()=>validateProject(p),/Missing state path/);
  p=fresh();p.screens[0].spec.elements.heading.props.text={$bindState:'/invite/email'};assert.throws(()=>validateProject(p),/not writable/);
  p=fresh();p.screens[0].spec.elements.inviteButton.on.press={action:'navigate',params:{screen:'absent'}};assert.throws(()=>validateProject(p),/Unknown screen/);
  p=fresh();p.screens[0].spec.elements.heading.visible={$state:'/unknown'};assert.throws(()=>validateProject(p),/visibility state/);
});
test('prototype pollution paths and unsafe keys are rejected',()=>{const p=fresh();p.screens[0].spec.elements.email.props.value={$bindState:'/constructor/name'};assert.throws(()=>validateProject(p),/Invalid state path/);assert.throws(()=>validateProject(JSON.parse('{"__proto__":{}}')),/Unsafe object key/);});
test('every advertised manifest has valid examples, schema, and state metadata',()=>{for(const [name,m]of Object.entries(manifests)){assert.ok(m.version,name);assert.ok(m.states.includes('light'),name);assert.ok(m.states.includes('dark'),name);m.props.parse(m.example);assert.throws(()=>m.props.parse({...m.example,className:'rogue'}),name);}});
test('atomic revisions, stale writers, feedback status, history, restart, and restore',async()=>{
  const dir=await temp();try{
    const store=new ProjectStore(dir);await store.init(fixture);
    const note=await store.feedback({screen:'members',target:'inviteButton',text:'Explain the member role.',revision:1});
    await store.updateFeedback(note.id,'running',{owner:'test-session'});
    const changed=fresh();changed.screens[0].spec.elements.intro.props.text='A clearer explanation.';
    const outcomes=await Promise.allSettled([store.apply(changed,1,[note.id]),new ProjectStore(dir).apply(fixture,1)]);
    assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);assert.ok(outcomes.some(o=>o.status==='rejected'&&o.reason instanceof Conflict));
    const restarted=new ProjectStore(dir);assert.equal((await restarted.read()).revision,2);
    if((await restarted.inbox())[0].status!=='applied')await restarted.apply(changed,2,[note.id]);
    const revision=(await restarted.read()).revision;assert.equal((await restarted.inbox())[0].status,'applied');
    await restarted.restore(1,revision);assert.equal((await restarted.read()).revision,revision+1);assert.equal((await restarted.inbox())[0].status,'applied');
    const out=await restarted.exportPlan();assert.match(await fs.readFile(out.path,'utf8'),/Prototype behavior is simulated/);assert.equal((await restarted.history()).length,revision+1);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('invalid update preserves last working revision and uncommitted snapshot is ignored',async()=>{
  const dir=await temp();try{const store=new ProjectStore(dir);await store.init(fixture);const p=fresh();p.screens[0].spec.root='missing';await assert.rejects(()=>store.apply(p,1));await fs.writeFile(path.join(store.root,'revisions','2.json'),JSON.stringify({revision:2,project:p,feedbackIds:[]}));assert.equal((await store.read()).revision,1);assert.equal((await store.history()).length,1);await store.apply(fixture,1);assert.equal((await store.read()).revision,2);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('failed feedback retains text, can retry, and is claimed once',async()=>{
  const dir=await temp();try{const store=new ProjectStore(dir);await store.init(fixture);const note=await store.feedback({screen:'members',target:'heading',text:'Keep my exact request.',revision:1});await store.updateFeedback(note.id,'running',{owner:'session'});await assert.rejects(()=>store.updateFeedback(note.id,'running',{owner:'other'}),Conflict);await store.recoverOwner('session');assert.equal((await store.inbox())[0].status,'failed');assert.equal((await store.inbox())[0].text,note.text);await store.updateFeedback(note.id,'queued');assert.equal((await store.inbox())[0].status,'queued');}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('simulation completes invitations, preserves failed input, and resets locally',()=>{
  const p=validateProject(fixture),store=createStateStore(structuredClone(p.scenarios[0].state));let message='',reset=false;
  const config={project:p,scenario:p.scenarios[0],navigate:()=>{},reset:()=>{reset=true;},notify:(m:string)=>{message=m;}};
  const handlers=simulationHandlers(store,config);handlers.set({path:'/invite/email',value:'new@example.test'});handlers.submit({form:'/invite',target:'/members',close:'/inviteOpen',message:'Invited'});
  assert.equal((store.get('/members')as any[]).length,3);assert.equal(message,'Invited');assert.equal(store.get('/inviteOpen'),false);
  const failure=simulationHandlers(store,{...config,scenario:{...p.scenarios[0],outcome:'failure'}});failure.submit({form:'/invite',target:'/members',message:'Invited'});assert.equal((store.get('/members')as any[]).length,3);assert.equal(store.get('/invite/email'),'new@example.test');assert.match(message,/failed/);handlers.reset();assert.equal(reset,true);
});

test('restore recovers from an unavailable component in the current revision',async()=>{
  const dir=await temp();try{const store=new ProjectStore(dir);await store.init(fixture);await store.apply(fixture,1);const broken=await store.revision(2);broken.project.screens[0].spec.elements.heading.type='UnavailablePack';await fs.writeFile(path.join(store.root,'revisions','2.json'),JSON.stringify(broken));await assert.rejects(()=>store.read(),/Unavailable component/);await store.restore(1,2);assert.equal((await store.read()).revision,3);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('settings submission commits a separate saved value and preserves it on failure',()=>{
  const p=validateProject(fixture),store=createStateStore({draft:{email:false},saved:{email:true}});const options={project:p,scenario:p.scenarios[0],navigate:()=>{},reset:()=>{},notify:()=>{}};
  simulationHandlers(store,options).submit({form:'/draft',save:'/saved',message:'Saved'});assert.deepEqual(store.get('/saved'),{email:false});store.set('/draft/email',true);simulationHandlers(store,{...options,scenario:{...options.scenario,outcome:'failure'}}).submit({form:'/draft',save:'/saved',message:'Saved'});assert.deepEqual(store.get('/saved'),{email:false});assert.equal(store.get('/draft/email'),true);
});
