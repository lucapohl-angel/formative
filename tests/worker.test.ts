import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ProjectStore} from '../src/store/index.js';
import {FeedbackWorker,type WorkerOptions} from '../src/worker/index.js';
import {startFeedbackPreview} from '../src/worker/preview.js';
import {editDocument} from '../src/worker/patch.js';
export const fakeWorker:WorkerOptions={command:process.execPath,args:['--import',fileURLToPath(new URL('../node_modules/tsx/dist/loader.mjs',import.meta.url)),fileURLToPath(new URL('./fixtures/pi-feedback-fake.ts',import.meta.url))]};
const fixture=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));
async function setup(){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-worker-')),store=new ProjectStore(directory);await store.init(fixture);return {directory,store};}
async function until(check:()=>Promise<boolean>){for(let i=0;i<200;i++){if(await check())return;await new Promise(r=>setTimeout(r,15));}throw new Error('Condition did not settle');}
const note=(store:ProjectStore,text:string)=>store.feedback({screen:'members',target:'heading',text,revision:1});
test('restricted patches preserve source, reject unsafe/missing paths, and obey array insertion semantics',()=>{
 const source={items:['a','b'],title:'Before'};
 assert.deepEqual(editDocument(source,[{op:'add',path:'/items/1',value:'x'},{op:'replace',path:'/title',value:'After'},{op:'remove',path:'/items/0'}]),{items:['x','b'],title:'After'});
 assert.equal(source.title,'Before');assert.throws(()=>editDocument(source,[{op:'replace',path:'/missing',value:1}]));assert.throws(()=>editDocument(source,[{op:'add',path:'/__proto__/polluted',value:true}]));assert.throws(()=>editDocument(source,[{op:'replace',path:'/items/99',value:'bad'}]));
});
test('dedicated worker serializes notes without main-agent turns and preserves failures for retry',{timeout:15000},async()=>{
 const {directory,store}=await setup(),worker=new FeedbackWorker(store,fakeWorker);
 try{await worker.start();assert.equal(worker.status.phase,'ready');const a=await note(store,'First'),b=await note(store,'Second');await worker.enqueue(a.id);await worker.enqueue(a.id);await worker.enqueue(b.id);await until(async()=>(await store.inbox()).every(n=>n.status==='applied'));assert.equal((await store.read()).revision,3);assert.equal((await store.read()).project.screens[0].spec.elements.heading.props.text,'Second');
 const failed=await store.feedback({screen:'members',target:'heading',revision:3,text:'fail'});await worker.enqueue(failed.id);await until(async()=>(await store.inbox()).find(n=>n.id===failed.id)?.status==='failed');assert.match((await store.inbox()).find(n=>n.id===failed.id)!.error!,/without applying/);
 }finally{await worker.close();const pid=Number(await fs.readFile(path.join(directory,'.fake-worker-pid'),'utf8'));assert.throws(()=>process.kill(pid,0));await fs.rm(directory,{recursive:true,force:true});}
});
test('Finish promptly stops a running subagent and preserves interrupted and queued notes for retry',{timeout:15000},async()=>{
 const {directory,store}=await setup(),service=await startFeedbackPreview({project:directory,workerOptions:fakeWorker});
 try{
  const a=await note(store,'hang'),b=await note(store,'Waiting');await service.worker!.enqueue(a.id);await service.worker!.enqueue(b.id);await until(async()=>(await store.inbox())[0].status==='running');
  const pid=Number(await fs.readFile(path.join(directory,'.fake-worker-pid'),'utf8')),state=await(await fetch(service.url+'/api/project')).json();const response=await fetch(service.url+'/api/finish',{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':state.token},body:'{}'});assert.equal(response.status,200);await service.closed;
  assert.ok((await store.inbox()).every(n=>n.status==='failed'));assert.throws(()=>process.kill(pid,0));assert.equal(service.worker!.status.phase,'stopped');
 }finally{await service.close();await fs.rm(directory,{recursive:true,force:true});}
});
test('timeout kills a stuck worker and leaves a retryable note',{timeout:15000},async()=>{
 const {directory,store}=await setup(),worker=new FeedbackWorker(store,{...fakeWorker,timeoutMs:100});
 try{const a=await note(store,'hang');await worker.enqueue(a.id);await until(async()=>(await store.inbox())[0].status==='failed');assert.match((await store.inbox())[0].error!,/timed out/);}
 finally{await worker.close();await fs.rm(directory,{recursive:true,force:true});}
});

test('shared preview recovers orphaned running notes without automatically submitting old notes',{timeout:15000},async()=>{
 const {directory,store}=await setup();const old=await note(store,'Old running note'),queued=await note(store,'Old queued note');await store.updateFeedback(old.id,'running',{owner:'pid:999999999:formative-worker:dead'});
 const service=await startFeedbackPreview({project:directory,workerOptions:fakeWorker});
 try{await service.worker!.start();const inbox=await store.inbox();assert.equal(inbox.find(n=>n.id===old.id)!.status,'failed');assert.equal(inbox.find(n=>n.id===queued.id)!.status,'queued');assert.equal((await store.read()).revision,1);}
 finally{await service.close();await fs.rm(directory,{recursive:true,force:true});}
});

test('late events from a timed-out process cannot finish the next queued request',{timeout:15000},async()=>{
 const {directory,store}=await setup(),worker=new FeedbackWorker(store,{...fakeWorker,timeoutMs:150});
 try{const a=await note(store,'late'),b=await note(store,'Next valid change');await worker.enqueue(a.id);await worker.enqueue(b.id);await until(async()=>(await store.inbox()).find(n=>n.id===b.id)?.status==='applied');const inbox=await store.inbox();assert.equal(inbox.find(n=>n.id===a.id)!.status,'failed');assert.equal((await store.read()).project.screens[0].spec.elements.heading.props.text,'Next valid change');}
 finally{await worker.close();await fs.rm(directory,{recursive:true,force:true});}
});
