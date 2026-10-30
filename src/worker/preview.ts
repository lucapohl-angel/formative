import {startServer} from '../server/index.js';
import {ProjectStore,type TestingHandoff} from '../store/index.js';
import {loadCustom} from '../catalog/custom.js';
import {FeedbackWorker,type WorkerOptions} from './index.js';

export async function startFeedbackPreview(options:{project:string;port?:number;dev?:boolean;host?:'pi'|'cli';manual?:boolean;workerOptions?:WorkerOptions;onManualFeedback?:(id:string)=>Promise<void>;onFinish?:(handoff:TestingHandoff)=>Promise<void>}){
 const custom=await loadCustom(options.project),store=new ProjectStore(options.project,custom.manifests);
 for(const note of await store.inbox()){
  if(note.status!=='running')continue;const pid=Number(note.owner?.match(/^pid:(\d+):/)?.[1]);let alive=false;if(pid){try{process.kill(pid,0);alive=true;}catch{}}
  if(!alive)await store.updateFeedback(note.id,'failed',{error:'The previous prototype subagent disconnected. Retry to resume.'});
 }
 let service:Awaited<ReturnType<typeof startServer>>|undefined;
 const worker=options.manual?undefined:new FeedbackWorker(store,{...options.workerOptions,onStatus:status=>{service?.updateAgent(status);options.workerOptions?.onStatus?.(status);}});
 service=await startServer({project:options.project,port:options.port,dev:options.dev,host:options.host??'cli',
  feedbackMode:worker?'subagent':'manual',agent:worker?{...worker.status}:{connected:false,live:false,phase:'manual',label:'Manual mode — notes are saved; no automatic prototype subagent'},
  onFeedback:worker?async id=>worker.enqueue(id):options.onManualFeedback,
  preserveFeedbackStatus:true,onBeforeFinish:async()=>{await worker?.close();},onClose:async()=>{await worker?.close();},
  onFinish:async handoff=>{await options.onFinish?.(handoff);}
 });
 if(worker){void worker.start().catch(()=>{});}
 return {...service,worker};
}
