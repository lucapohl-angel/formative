import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { ProjectStore } from '../src/store/index.js';

test('CLI termination closes its preview child and releases the port',{timeout:15000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formative-cli-'));
 const fixture=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));await new ProjectStore(dir).init(fixture);
 const child=spawn(process.execPath,[fileURLToPath(new URL('../bin/formative.mjs',import.meta.url)),'preview','--manual','--project',dir,'--port','0'],{stdio:['ignore','pipe','pipe']});
 try{let output='';const url=await new Promise<string>((resolve,reject)=>{child.stdout.on('data',data=>{output+=data;try{resolve(JSON.parse(output).url);}catch{}});child.once('error',reject);child.once('exit',code=>reject(new Error(`Preview exited before startup: ${code}`)));});assert.equal((await fetch(url+'/api/project')).status,200);const exited=once(child,'exit');child.kill('SIGTERM');await exited;await assert.rejects(()=>fetch(url+'/api/project'));}
 finally{child.kill('SIGTERM');await fs.rm(dir,{recursive:true,force:true});}
});

for(const dev of [false,true])test(`Finish returns the exact feedback to the waiting CLI and exits (${dev?'Vite dev':'production'})`,{timeout:15000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formative-cli-finish-'));const fixture=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));await new ProjectStore(dir).init(fixture);
 const child=spawn(process.execPath,[fileURLToPath(new URL('../bin/formative.mjs',import.meta.url)),'preview','--manual','--project',dir,'--port','0',...(dev?['--dev']:[])],{stdio:['ignore','pipe','pipe']});
 try{let output='';const url=await new Promise<string>((resolve,reject)=>{child.stdout.on('data',data=>{output+=data;try{resolve(JSON.parse(output).url);}catch{}});child.once('error',reject);});const state=await(await fetch(url+'/api/project')).json();const post=(route:string,body:any)=>fetch(url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Formative-Token':state.token},body:JSON.stringify(body)});await post('feedback',{screen:'members',target:'heading',text:'Return this note to my agent.',revision:1});for(let i=0;i<100&&!output.includes('prototype_feedback');i++)await new Promise(r=>setTimeout(r,10));assert.match(output,/prototype_feedback/);assert.equal(child.exitCode,null);assert.equal((await fetch(url+'/api/project')).status,200);const exited=once(child,'exit');assert.equal((await post('finish',{})).status,200);await exited;assert.match(output,/prototype_testing_finished/);assert.match(output,/Return this note to my agent/);assert.match(output,/"serverStopped": true/);await assert.rejects(()=>fetch(url));}
 finally{child.kill('SIGTERM');await fs.rm(dir,{recursive:true,force:true});}
});
