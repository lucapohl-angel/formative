import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ProjectStore} from '../src/store/index.js';

test('planning export preserves product decisions and excludes prototype visuals and visual-only records',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-requirements-'));
 try{
  const project=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));
  project.features[0].status='accepted';
  project.features.push({...structuredClone(project.features[0]),id:'visualExperiment',title:'VIOLET_EXPERIMENT',scope:'prototype-only',dependencies:[]});
  project.features[0].dependencies.push('visualExperiment');
  const decision={id:'accessChoice',question:'Who can invite teammates?',options:['Admins','All members'],choice:null,reason:'Needs confirmation',status:'provisional',affectedIds:[project.features[0].id],provenance:{origin:'inferred',evidence:'Access was not specified'}};
  project.decisions.push(decision,{...decision,id:'paletteChoice',question:'VIOLET_PALETTE',scope:'prototype-only',choice:'Violet'});
  project.screens[0].spec.elements.heading.props.text='ILLUSTRATIVE_HEADING';project.theme='dark';
  const store=new ProjectStore(directory);await store.init(project);
  const note=await store.feedback({screen:'members',target:'heading',revision:1,text:'Make the prototype violet.'});
  const result=await store.exportPlan();const text=await fs.readFile(result.path,'utf8'),json=JSON.parse(await fs.readFile(result.requirementsPath,'utf8'));
  assert.equal(json.kind,'product-requirements');assert.equal(json.features[0].status,'accepted');assert.equal(json.decisions.find((d:any)=>d.id==='accessChoice').status,'provisional');
  assert.ok(!json.features.some((f:any)=>f.id==='visualExperiment'));assert.ok(!json.features[0].dependencies.includes('visualExperiment'));
  for(const key of ['screens','scenarios','theme','customComponents'])assert.ok(!(key in json));
  for(const excluded of ['VIOLET_EXPERIMENT','VIOLET_PALETTE','ILLUSTRATIVE_HEADING','Make the prototype violet.']){assert.ok(!text.includes(excluded));assert.ok(!JSON.stringify(json).includes(excluded));}
  const handoff=await store.prepareHandoff('requirements-finish-test','cli',true);
  assert.equal(handoff.plan?.requirementsPath,result.requirementsPath);assert.equal(handoff.plan?.requirements.revision,1);assert.equal(handoff.feedback[0].id,note.id);assert.equal(handoff.feedback[0].text,note.text);
  assert.equal((await store.history()).length,1);assert.match(text,/Choose visual design separately/);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('checkpoint exports preserve an authored plan and discovery across revisions and repeated sessions',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-discovery-checkpoints-'));
 try{
  const plan='# Club bookings\n\nA hand-written plan with a different structure.\n';
  const discovery='Open: cancellation policy, blocked on venue policy.\nDeferred by user: billing.\n';
  const legacyRequirements='{"ownedBy":"user"}\n';
  await fs.mkdir(path.join(directory,'.formative'));
  await fs.writeFile(path.join(directory,'plan.md'),plan);
  await fs.writeFile(path.join(directory,'requirements.json'),legacyRequirements);
  await fs.writeFile(path.join(directory,'.formative','discovery.md'),discovery);
  const project=JSON.parse(await fs.readFile(new URL('../examples/workspace/project.json',import.meta.url),'utf8'));
  const store=new ProjectStore(directory);await store.init(project);
  const first=await store.deliveredHandoff(await store.prepareHandoff('discovery-checkpoint-one','pi',true));
  assert.equal(first.nextAction,'resume-discovery');
  assert.equal(first.plan?.kind,'requirements-snapshot');
  assert.equal(first.plan?.path,path.join(directory,'.formative','exports','requirements.md'));
  assert.equal(first.plan?.requirementsPath,path.join(directory,'.formative','exports','requirements.json'));
  const updated=structuredClone(project);updated.features[0].rules.push('Only workspace owners can invite.');
  await store.apply(updated,1);
  await store.exportPlan();
  const second=await store.prepareHandoff('discovery-checkpoint-two','cli',true);
  assert.equal(second.revision,2);assert.equal(second.nextAction,'resume-discovery');
  assert.ok(second.plan?.requirements.features[0].rules.includes('Only workspace owners can invite.'));
  const historical=JSON.parse(await fs.readFile(first.path,'utf8'));
  assert.equal(historical.revision,1);assert.equal(historical.status,'delivered');
  assert.ok(!historical.plan.requirements.features[0].rules.includes('Only workspace owners can invite.'));
  assert.equal(await fs.readFile(path.join(directory,'plan.md'),'utf8'),plan);
  assert.equal(await fs.readFile(path.join(directory,'requirements.json'),'utf8'),legacyRequirements);
  assert.equal(await fs.readFile(path.join(directory,'.formative','discovery.md'),'utf8'),discovery);
  assert.equal((await store.read()).project.features[0].status,project.features[0].status);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
