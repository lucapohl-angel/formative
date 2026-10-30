import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { ProjectStore } from '../store/index.js';
import { startFeedbackPreview } from '../worker/preview.js';
import { validateProject } from '../contracts/project.js';
import { catalogIndex, describeComponent } from '../catalog/definitions.js';
import { loadCustom, registerCustom } from '../catalog/custom.js';
import { discoveryContinuation } from '../adapters/discovery-handoff.js';

const args=parseArgs({allowPositionals:true,options:{project:{type:'string',default:process.cwd()},file:{type:'string'},manifest:{type:'string'},expected:{type:'string'},revision:{type:'string'},feedback:{type:'string'},query:{type:'string'},name:{type:'string'},port:{type:'string'},dev:{type:'boolean'},manual:{type:'boolean'},fixture:{type:'string'},status:{type:'string'},error:{type:'string'},owner:{type:'string'},screen:{type:'string'},feature:{type:'string'}}});
const command=args.positionals[0]??'help',v=args.values,store=new ProjectStore(v.project!);
const load=async()=>{if(!v.file)throw new Error('Supply --file with a project JSON file');return JSON.parse(await fs.readFile(v.file,'utf8'));};
const output=(data:unknown)=>console.log(JSON.stringify(data,null,2));
try{
  const custom=await loadCustom(v.project!).catch(error=>{if(!['history','restore','register','help'].includes(command))throw error;console.error(JSON.stringify({warning:error.message}));return {manifests:{},entries:[]};});store.components=custom.manifests;
  if(command==='init'){
    const fixture=v.fixture??'workspace';if(!['workspace','website','board'].includes(fixture)&&!v.file)throw new Error('Choose workspace, website, board, or --file');
    const data=v.file?await load():JSON.parse(await fs.readFile(new URL(`../../examples/${fixture}/project.json`,import.meta.url),'utf8'));
    const result=await store.init(data);output({revision:result.revision,project:store.projectDir});
  }else if(command==='read'){const snapshot=await store.read();if(v.screen||v.feature){const p=snapshot.project,screen=p.screens.find(s=>s.id===v.screen),ids=new Set(v.feature?[v.feature]:screen?.featureIds??[]);if(v.screen&&!screen)throw new Error('Unknown screen');if(v.feature&&!p.features.some(f=>f.id===v.feature))throw new Error('Unknown feature');output({revision:snapshot.revision,title:p.title,features:p.features.filter(f=>ids.has(f.id)),decisions:p.decisions.filter(d=>d.affectedIds.some(id=>ids.has(id))),screens:screen?[screen]:p.screens.filter(s=>s.featureIds.some(id=>ids.has(id)))});}else output(snapshot);}
  else if(command==='validate'){const p=validateProject(await load(),store.components);output({ok:true,screens:p.screens.length,features:p.features.length});}
  else if(command==='apply'){if(!v.expected)throw new Error('Supply --expected revision from read');const s=await store.apply(await load(),Number(v.expected),v.feedback?.split(',')??[]);output({revision:s.revision,feedbackIds:s.feedbackIds});}
  else if(command==='history'){output(await store.history());}
  else if(command==='restore'){output(await store.restore(Number(v.revision),Number(v.expected)));}
  else if(command==='export'){output(await store.exportPlan());}
  else if(command==='feedback'){output(await store.inbox());}
  else if(command==='feedback-status'){if(!v.feedback||!['running','failed','queued'].includes(v.status??''))throw new Error('Supply --feedback ID --status running|failed|queued');output(await store.updateFeedback(v.feedback,v.status as any,{owner:v.owner,error:v.error}));}
  else if(command==='catalog'){output(v.name?(custom.entries.find(m=>m.name===v.name)??describeComponent(v.name)):[...catalogIndex(v.query),...custom.entries.filter(m=>`${m.name} ${m.description}`.toLowerCase().includes((v.query??'').toLowerCase())).map(m=>({name:m.name,description:m.description,pack:'project',version:m.version,available:true}))]);}
  else if(command==='register'){if(!v.file||!v.manifest)throw new Error('Supply --file component.tsx and --manifest manifest.json');output(await registerCustom(v.project!,v.file,v.manifest));}
  else if(command==='preview'){
    let completed:any;const service=await startFeedbackPreview({project:v.project!,manual:v.manual,port:v.port?Number(v.port):4318,dev:v.dev,host:'cli',onManualFeedback:async id=>{const feedback=(await store.inbox()).find(note=>note.id===id);if(feedback)output({event:'prototype_feedback',project:store.projectDir,feedback,instruction:'Process this feedback now. Read current state, apply with expectedRevision and this feedback ID, then keep waiting on this preview command. Do not stop the server; the user ends testing with Finish.'});},onFinish:async handoff=>{completed=handoff;}});output({url:service.url,project:store.projectDir,agent:v.manual?'Manual mode':'Dedicated prototype subagent'});
    const close=async()=>{await service.close();process.exit(0);};process.on('SIGTERM',close);process.on('SIGINT',close);await service.closed;if(completed)output({event:'prototype_testing_finished',project:store.projectDir,handoff:{...completed,status:'delivered'},serverStopped:true,instruction:discoveryContinuation(completed,fileURLToPath(new URL('../../skills/formative/SKILL.md',import.meta.url)))});
  }else output({commands:['init --fixture workspace|website|board [--file project.json]','read [--screen ID | --feature ID]','register --file component.tsx --manifest manifest.json','validate --file project.json','apply --file project.json --expected N [--feedback ID]','catalog [--query text | --name Component]','preview [--port 4318] [--dev] [--manual]','feedback','feedback-status --feedback ID --status running|failed|queued','history','restore --revision N --expected N','export'],scope:'Every command accepts --project DIR. No command requires Planboard.'});
}catch(error:any){console.error(JSON.stringify({error:error.message??String(error)}));process.exitCode=1;}
