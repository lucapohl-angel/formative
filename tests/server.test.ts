import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProjectStore } from '../src/store/index.js';
import { startServer } from '../src/server/index.js';
const fixture=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));
test('loopback API rejects cross-origin writes and preserves feedback when delivery fails',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formative-server-'));let service:Awaited<ReturnType<typeof startServer>>|undefined;
  try{await new ProjectStore(dir).init(fixture);service=await startServer({project:dir,onFeedback:async()=>{throw new Error('Host is disconnected');}});
    const current=await(await fetch(service.url+'/api/project')).json();
    let res=await fetch(service.url+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403);
    res=await fetch(service.url+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':current.token,Origin:'https://elsewhere.test'},body:'{}'});assert.equal(res.status,403);
    res=await fetch(service.url+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':current.token},body:JSON.stringify({screen:'members',target:'heading',text:'Make this clearer.',revision:1})});assert.equal(res.status,201);
    let notes=await service.store.inbox();for(let i=0;i<30&&notes[0]?.status!=='failed';i++){await new Promise(r=>setTimeout(r,20));notes=await service.store.inbox();}
    assert.equal(notes[0].status,'failed');assert.match(notes[0].error!,/disconnected/);assert.equal(notes[0].text,'Make this clearer.');
    const html=await(await fetch(service.url)).text();assert.match(html,/Formative/);
  }finally{await service?.close();await fs.rm(dir,{recursive:true,force:true});}
});

test('Finish retains notes on delivery failure, retries the updated batch, then closes once',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formative-finish-'));let service:Awaited<ReturnType<typeof startServer>>|undefined,calls=0;const batches:any[]=[];
 try{
  await new ProjectStore(dir).init(fixture);service=await startServer({project:dir,host:'pi',onFinish:async handoff=>{calls++;batches.push(handoff);if(calls===1)throw new Error('Delivery temporarily unavailable');}});
  const current=await(await fetch(service.url+'/api/project')).json();const post=(route:string,body:any)=>fetch(service!.url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':current.token},body:JSON.stringify(body)});
  const note={screen:'members',target:'heading',text:'Keep this exact note.',revision:1,idempotencyKey:'a-unique-feedback-request-1234'};
  const first=await(await post('feedback',note)).json();const duplicate=await(await post('feedback',note)).json();assert.equal(first.id,duplicate.id);assert.equal((await service.store.inbox()).length,1);
  assert.equal((await post('finish',{})).status,400);assert.equal((await fetch(service.url+'/api/project')).status,200);assert.equal((await service.store.inbox())[0].text,note.text);
  await post('feedback',{screen:'members',target:'intro',text:'An additional note before retry.',revision:1});
  const result=await(await post('finish',{})).json();assert.equal(result.feedbackCount,2);await service.closed;assert.equal(calls,2);assert.equal(batches[0].id,batches[1].id);assert.equal(batches[1].feedback.length,2);assert.equal(JSON.parse(await fs.readFile(batches[1].path,'utf8')).status,'delivered');await assert.rejects(()=>fetch(service!.url));
 }finally{await service?.close();await fs.rm(dir,{recursive:true,force:true});}
});

test('Finish with no feedback still hands control back and stops the server',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formative-finish-empty-'));let service:Awaited<ReturnType<typeof startServer>>|undefined;
 try{await new ProjectStore(dir).init(fixture);service=await startServer({project:dir,onFinish:async handoff=>{assert.equal(handoff.feedback.length,0);}});const state=await(await fetch(service.url+'/api/project')).json();const response=await fetch(service.url+'/api/finish',{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':state.token},body:'{}'});assert.equal(response.status,200);await service.closed;}
 finally{await service?.close();await fs.rm(dir,{recursive:true,force:true});}
});

test('Event stream reports a revision committed by a separate store and closes with the server',{timeout:10000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formative-events-'));let service:Awaited<ReturnType<typeof startServer>>|undefined;
 try{
  const writer=new ProjectStore(dir);await writer.init(fixture);service=await startServer({project:dir});
  const response=await fetch(service.url+'/api/events');assert.match(response.headers.get('content-type')!,/text\/event-stream/);const reader=response.body!.getReader();await reader.read();
  const next=reader.read();const changed=structuredClone(fixture);changed.screens[0].spec.elements.heading.props.text='Changed from the agent process';await writer.apply(changed,1);
  assert.match(new TextDecoder().decode((await next).value),/event: change/);
  await reader.cancel();await service.close();await service.closed;
 }finally{await service?.close();await fs.rm(dir,{recursive:true,force:true});}
});
