import {createInterface} from 'node:readline';
import {promises as fs} from 'node:fs';
import {ProjectStore} from '../../src/store/index.js';
const store=new ProjectStore(process.cwd());
await fs.writeFile('.fake-worker-pid',String(process.pid));
createInterface({input:process.stdin}).on('line',async line=>{
 const request=JSON.parse(line);
 if(request.type==='get_state'){console.log(JSON.stringify({type:'response',id:request.id,command:'get_state',success:true}));return;}
 if(request.type!=='prompt')return;
 const id=request.message.match(/feedback ID ([\w-]+)/)[1],note=(await store.inbox()).find(f=>f.id===id)!;
 if(note.text==='hang')return;
 if(note.text==='late'){process.once('SIGTERM',()=>{setTimeout(()=>console.log(JSON.stringify({type:'agent_end',messages:[]})),40);setTimeout(()=>process.exit(0),70);});return;}
 if(note.text==='crash')process.exit(3);
 if(note.text!=='fail'){
  const current=await store.read();current.project.screens[0].spec.elements.heading.props.text=note.text;await store.apply(current.project,current.revision,[id]);
 }
 console.log(JSON.stringify({type:'agent_end',messages:[]}));
});
