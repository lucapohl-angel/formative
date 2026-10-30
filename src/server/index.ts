import http from 'node:http';
import { promises as fs, watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ProjectStore, type TestingHandoff } from '../store/index.js';
import { catalogIndex, describeComponent } from '../catalog/definitions.js';
import { validateProject } from '../contracts/project.js';
import { loadCustom } from '../catalog/custom.js';

const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function startServer(options:{project:string;port?:number;dev?:boolean;onFeedback?:(id:string)=>Promise<void>;onFinish?:(handoff:TestingHandoff)=>Promise<void>;host?:'pi'|'cli'|'mcp';agent?:{connected:boolean;live:boolean;label:string;phase?:string};feedbackMode?:'subagent'|'manual'|'host';preserveFeedbackStatus?:boolean;onBeforeFinish?:()=>Promise<void>;onClose?:()=>Promise<void>}) {
  const custom=await loadCustom(options.project);
  const store=new ProjectStore(options.project,custom.manifests);await store.read();
  const token=randomUUID(),testingId=randomUUID();let finalizing=false,finishResult:any=null;
  const live=!!options.onFeedback;
  const agent=options.agent??{connected:options.host==='pi'||(!options.host&&live),live,label:options.host==='pi'?(live?'Pi session — sent feedback updates this preview live':'Pi session — finish testing to send saved feedback'):live?'CLI mode — sent feedback returns to the waiting agent command':'CLI mode — finish testing returns feedback to the waiting command'};
  const events=new Set<http.ServerResponse>(),deliveredLive=new Set<string>();let deliveryChain=Promise.resolve();
  function notifyFeedback(id:string){
    if(!options.onFeedback)return;
    deliveryChain=deliveryChain.then(async()=>{
      if(deliveredLive.has(id))return;
      try{await options.onFeedback!(id);deliveredLive.add(id);}
      catch(error:any){const note=(await store.inbox()).find(f=>f.id===id);if(note&&note.status!=='applied')await store.updateFeedback(id,'failed',{error:String(error.message??error)});}
    }).catch(error=>{console.error('Formative feedback delivery failed:',error.message);});
  }
  const notifyChange=()=>{for(const client of events)client.write('event: change\ndata: {}\n\n');};
  const watcher=watch(store.root,(_event,file)=>{if(file&&['current.json','feedback.json'].includes(file.toString()))notifyChange();});
  watcher.on('error',()=>{for(const client of events)client.end();events.clear();});
  const heartbeat=setInterval(()=>{for(const client of events)client.write(': heartbeat\n\n');},15000);heartbeat.unref();
  const vite=options.dev?await (await import('vite')).createServer({root:packageRoot,server:{middlewareMode:true},appType:'spa'}):undefined;
  const server=http.createServer(async(req,res)=>{
    const send=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    try{
      const host=req.headers.host??'',allowedHost=`127.0.0.1:${(server.address() as any)?.port}`;
      if(host!==allowedHost){send(403,{error:'Use the loopback URL printed by Formative.'});return;}
      const url=new URL(req.url??'/',`http://${host}`);
      if(url.pathname.startsWith('/api/')){
        if(req.headers.origin&&req.headers.origin!==`http://${host}`){send(403,{error:'Origin not allowed'});return;}
        if(req.method==='GET'){
          if(url.pathname==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});events.add(res);res.write('event: change\ndata: {}\n\n');res.on('close',()=>events.delete(res));return;}
          if(url.pathname==='/api/component-runtime.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('const {React,ActionButton,useBoundProp}=window.FormativeRuntime; export {React,ActionButton,useBoundProp};');return;}
          if(url.pathname.startsWith('/api/custom/')){const name=url.pathname.slice('/api/custom/'.length).replace(/\.js$/,'');const custom=await loadCustom(options.project);if(!custom.manifests[name])throw new Error('Component not registered');res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(await fs.readFile(path.join(store.root,'components',name,'bundle.js')));return;}
          if(url.pathname==='/api/project'){const custom=await loadCustom(options.project);store.components=custom.manifests;send(200,{...await store.read(),feedback:await store.inbox(),agent,token,components:custom.entries});return;}
          if(url.pathname==='/api/history'){send(200,await store.history());return;}
          if(url.pathname==='/api/catalog'){send(200,catalogIndex(url.searchParams.get('q')??''));return;}
          if(url.pathname==='/api/component'){send(200,describeComponent(url.searchParams.get('name')??''));return;}
          send(404,{error:'Unknown API route'});return;
        }
        if(req.method!=='POST'){send(405,{error:'Method not allowed'});return;}
        if(req.headers['x-formative-token']!==token||!req.headers['content-type']?.startsWith('application/json')){send(403,{error:'Reload Formative before saving.'});return;}
        let body='';for await(const chunk of req){body+=chunk;if(body.length>2_000_000)throw new Error('Request is too large');}
        const data=JSON.parse(body||'{}');
        if(url.pathname==='/api/finish'){
          if(finishResult){send(200,finishResult);return;}
          if(finalizing){send(409,{error:'Finishing is already in progress. Please wait.'});return;}
          finalizing=true;
          try{
            await deliveryChain;const beforeFinish=await store.inbox();await options.onBeforeFinish?.();
            const handoff=await store.prepareHandoff(testingId,options.host??'cli',options.preserveFeedbackStatus);
            if(handoff.status!=='delivered'){
              if(!options.onFinish)throw new Error('This preview has no finish connection. Reopen it through Formative; your notes are saved.');
              await options.onFinish(handoff);await store.deliveredHandoff(handoff);
            }
            const afterFinish=await store.inbox();
            finishResult={ok:true,nextAction:handoff.nextAction??'resume-discovery',planPath:handoff.plan?.path,requirementsPath:handoff.plan?.requirementsPath,feedbackCount:handoff.feedbackIds.length,handoffId:handoff.id,destination:handoff.destination,mode:options.feedbackMode??'manual',interruptedCount:afterFinish.filter(note=>note.status==='failed'&&note.error?.startsWith('Testing ended')&&beforeFinish.some(previous=>previous.id===note.id&&['queued','running'].includes(previous.status))).length,appliedCount:afterFinish.filter(note=>note.status==='applied').length};
            res.once('finish',()=>{void close();});send(200,finishResult);
          }catch(error){finalizing=false;throw error;}
          return;
        }
        if(finalizing){send(409,{error:'Testing is finishing. Your saved feedback is being handed back.'});return;}

        if(url.pathname==='/api/feedback'){
          const entry=await store.feedback(data);send(201,entry);
          notifyFeedback(entry.id);return;
        }
        if(url.pathname==='/api/retry'){
          const before=(await store.inbox()).find(f=>f.id===data.id);if(before?.status!=='failed')throw new Error('Only failed feedback can be retried');
          const entry=await store.updateFeedback(data.id,'queued');deliveredLive.delete(entry.id);send(200,entry);
          notifyFeedback(entry.id);return;
        }
        if(url.pathname==='/api/restore'){send(200,await store.restore(data.revision,data.expectedRevision));return;}
        if(url.pathname==='/api/export'){send(200,await store.exportPlan());return;}
        send(404,{error:'Unknown API route'});return;
      }
      if(vite){vite.middlewares(req,res);return;}
      const web=path.join(packageRoot,'dist/web'),name=decodeURIComponent(url.pathname),candidate=path.resolve(web,`.${name}`);
      if(!candidate.startsWith(web+path.sep)&&candidate!==web){res.writeHead(403);res.end();return;}
      let file=candidate;try{if(!(await fs.stat(file)).isFile())file=path.join(web,'index.html');}catch{file=path.join(web,'index.html');}
      const content=await fs.readFile(file);const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
      res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(content);
    }catch(error:any){send(error.status??400,{error:error.message??String(error)});}
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',error=>{watcher.close();clearInterval(heartbeat);void vite?.close();reject(error);});server.listen(options.port??0,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
  const port=(server.address() as any).port;
  let closing:Promise<void>|undefined,resolveClosed!:()=>void;
  const closed=new Promise<void>(resolve=>{resolveClosed=resolve;});
  function close(){return closing??=(async()=>{agent.connected=false;await options.onClose?.();watcher.close();clearInterval(heartbeat);for(const client of events)client.end();events.clear();await vite?.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));resolveClosed();})();}
  return {store,url:`http://127.0.0.1:${port}`,server,agent,close,closed,updateAgent:(next:Partial<typeof agent>)=>{Object.assign(agent,next);notifyChange();}};
}
