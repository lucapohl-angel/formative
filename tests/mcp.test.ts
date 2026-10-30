import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ProjectStore} from '../src/store/index.js';
import {createMcpSession} from '../src/adapters/mcp-session.js';

async function connect(name:string){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-mcp-'));
 const fixture=await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8');
 await fs.writeFile(path.join(directory,'prototype.json'),fixture);
 const client=new Client({name,version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../bin/formative.mjs',import.meta.url)),'mcp'],stderr:'pipe'});
 await client.connect(transport);
 const call=async(args:any)=>{const result=await client.callTool({name:'formative_project',arguments:{cwd:directory,...args}});const item=result.content as any[];if(result.isError)throw new Error(item[0].text);return JSON.parse(item[0].text);};
 return {client,call,directory,close:async()=>{await client.close();await fs.rm(directory,{recursive:true,force:true});}};
}

for(const name of ['claude-code','codex'])test(`${name} MCP discovers tools and completes feedback and discovery handoff without Pi`,{timeout:20000},async()=>{
 const c=await connect(name);
 try{
  assert.ok((await c.client.listTools()).tools.some(tool=>tool.name==='formative_project'));
  await assert.rejects(()=>c.call({action:'read',cwd:'relative'}),/absolute/);
  await c.call({action:'init',file:'prototype.json'});
  await fs.writeFile(path.join(c.directory,'plan.md'),'# User-authored plan\nKeep this structure.\n');
  const {url,mode}=await c.call({action:'preview'});assert.equal(mode,'host');
  const state=await(await fetch(url+'/api/project')).json();assert.equal(state.agent.connected,false);
  const post=(route:string,body:any)=>fetch(url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':state.token},body:JSON.stringify(body)});
  const pending=c.call({action:'wait',timeoutSeconds:5});
  const note=await(await post('feedback',{screen:'members',target:'heading',revision:1,text:'Shorten this heading.'})).json();
  const event=await pending;assert.equal(event.status,'feedback');assert.equal(event.feedback.id,note.id);
  assert.equal((await c.call({action:'feedback'}))[0].status,'running');
  await assert.rejects(()=>c.call({action:'wait',timeoutSeconds:0}),/Resolve feedback/);
  const current=await c.call({action:'read'});current.project.screens[0].spec.elements.heading.props.text='Your team';
  await fs.writeFile(path.join(c.directory,'prototype.json'),JSON.stringify(current.project));
  await assert.rejects(()=>c.call({action:'apply',file:'prototype.json',expectedRevision:99,feedbackIds:[note.id]}),/Revision changed/);
  await c.call({action:'apply',file:'prototype.json',expectedRevision:1,feedbackIds:[note.id]});
  assert.equal((await c.call({action:'feedback'}))[0].status,'applied');
  const finished=c.call({action:'wait',timeoutSeconds:5});assert.equal((await post('finish',{})).status,200);
  const handoff=await finished;assert.equal(handoff.status,'finished');assert.equal(handoff.handoff.destination,'mcp');assert.equal(handoff.handoff.nextAction,'resume-discovery');
  assert.match(handoff.instruction,/resume the next unresolved/);
  assert.equal(await fs.readFile(path.join(c.directory,'plan.md'),'utf8'),'# User-authored plan\nKeep this structure.\n');
  // Finish does not reopen the preview on the next wait.
  assert.equal((await c.call({action:'wait',timeoutSeconds:0})).status,'finished');
 }finally{await c.close();}
});

test('MCP disconnect preserves an unfinished note and stops its preview',async()=>{
 const c=await connect('generic-mcp');let url='';
 try{
  await c.call({action:'init',file:'prototype.json'});({url}=await c.call({action:'preview'}));
  const state=await(await fetch(url+'/api/project')).json();
  await fetch(url+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':state.token},body:JSON.stringify({screen:'members',target:'heading',revision:1,text:'Keep this unfinished note.'})});
  await c.call({action:'wait',timeoutSeconds:0});await c.client.close();
  const store=new ProjectStore(c.directory);
  for(let i=0;i<100&&(await store.inbox())[0].status==='running';i++)await new Promise(r=>setTimeout(r,10));
  assert.equal((await store.inbox())[0].status,'failed');assert.equal((await store.read()).revision,1);
  await assert.rejects(()=>fetch(url+'/api/project'));
 }finally{await c.close();}
});

test('MCP cancellation releases a waiting consumer without losing queued feedback',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-mcp-cancel-')),session=createMcpSession();
 try{
  await new ProjectStore(directory).init(JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8')));
  await session.call({action:'preview',cwd:directory});
  const controller=new AbortController(),pending=session.call({action:'wait',cwd:directory,timeoutSeconds:5},{signal:controller.signal});
  controller.abort();const stopped=await pending;assert.ok('status' in stopped);assert.equal(stopped.status,'stopped');
  const idle=await session.call({action:'wait',cwd:directory,timeoutSeconds:0});assert.ok('status' in idle);assert.equal(idle.status,'idle');
 }finally{await session.close();await fs.rm(directory,{recursive:true,force:true});}
});
