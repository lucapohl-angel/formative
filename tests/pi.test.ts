import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import formative from '../src/adapters/pi/index.js';
import { ProjectStore } from '../src/store/index.js';

for(const summaryFails of [false,true])test(`Pi uses a dedicated feedback worker; Finish stops even if main summary delivery ${summaryFails?'fails':'succeeds'}`,{timeout:15000},async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-pi-')),handlers:Record<string,Function>={},tools:Record<string,any>={},messages:string[]=[];
 const pi={registerTool:(tool:any)=>{tools[tool.name]=tool;},registerCommand:()=>{},on:(event:string,fn:Function)=>{handlers[event]=fn;},sendUserMessage:async(text:string)=>{messages.push(text);if(summaryFails)throw new Error('Main session unavailable');}};
 const ctx={cwd:directory,isProjectTrusted:()=>true,sessionManager:{getSessionId:()=> 'test-session'},ui:{notify:()=>{}}};
 const fixture=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));
 const store=new ProjectStore(directory);await store.init(fixture);formative(pi,{workerOptions:{command:process.execPath,args:['--import',new URL('../node_modules/tsx/dist/loader.mjs',import.meta.url).pathname,new URL('./fixtures/pi-feedback-fake.ts',import.meta.url).pathname]}});
 try{
  const result=await tools.formative_project.execute('open',{action:'preview'},null,null,ctx),url=result.details.url,state=await(await fetch(url+'/api/project')).json();
  const post=(route:string,body:any)=>fetch(url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':state.token},body:JSON.stringify(body)});
  const response=await post('feedback',{screen:'members',target:'heading',text:'Changed independently',revision:1});assert.equal(response.status,201);
  for(let i=0;i<200&&(await store.inbox())[0].status!=='applied';i++)await new Promise(r=>setTimeout(r,15));
  assert.equal((await store.inbox())[0].status,'applied');assert.equal(messages.length,0);assert.equal((await fetch(url+'/api/project')).status,200);
  assert.equal((await post('finish',{})).status,200);assert.equal(messages.length,1);assert.match(messages[0],/resume the next unresolved interview branch/);
  const handoffs=await fs.readdir(path.join(directory,'.formative','testing'));
  const handoff=JSON.parse(await fs.readFile(path.join(directory,'.formative','testing',handoffs[0]),'utf8'));
  assert.equal(handoff.nextAction,'resume-discovery');assert.equal(handoff.status,'delivered');
  assert.equal(handoff.plan.kind,'requirements-snapshot');
  assert.ok(messages[0].includes(handoff.path));assert.ok(messages[0].includes(handoff.plan.path));
  await assert.rejects(()=>fs.access(path.join(directory,'plan.md')));
 }finally{await handlers.session_shutdown();await fs.rm(directory,{recursive:true,force:true});}
});
