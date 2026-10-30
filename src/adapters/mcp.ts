import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {createMcpSession} from './mcp-session.js';

const session=createMcpSession();
const instructions='Use the Formative skill for relentless product discovery and prototype checkpoints. Supply absolute cwd on project actions. Delegate live feedback to a dedicated host subagent using preview, wait, read, and apply; do not require Pi. A waiting agent is required: MCP does not universally wake idle hosts. Finish ends a checkpoint and returns a discovery handoff, not approval or implementation authorization.';
const server=new Server({name:'formative',version:'0.2.1'},{capabilities:{tools:{}},instructions});
const schema={type:'object',properties:{action:{type:'string',enum:['catalog','init','read','apply','preview','feedback','failFeedback','history','restore','export','wait','stop']},cwd:{type:'string',description:'Absolute project directory; required except for global catalog.'},file:{type:'string'},query:{type:'string'},name:{type:'string'},expectedRevision:{type:'integer',minimum:1},revision:{type:'integer',minimum:1},feedbackIds:{type:'array',items:{type:'string'}},feedbackId:{type:'string'},reason:{type:'string'},openBrowser:{type:'boolean'},timeoutSeconds:{type:'number',minimum:0,maximum:50}},required:['action'],additionalProperties:false} as const;
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[{name:'formative_project',description:instructions,inputSchema:schema}]}));
server.setRequestHandler(CallToolRequestSchema,async(request,extra)=>{
 try{if(request.params.name!=='formative_project')throw new Error('Unknown tool.');const result=await session.call(request.params.arguments??{},{signal:extra.signal});return {content:[{type:'text',text:JSON.stringify(result)}]};}
 catch(error:any){return {isError:true,content:[{type:'text',text:error.message}]};}
});
let closing:Promise<void>|undefined;
function close(){return closing??=(async()=>{await session.close();await server.close();})();}
server.onclose=()=>{void close();};
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>{void close().finally(()=>process.exit(0));});
process.stdin.on('end',()=>{void close();});
await server.connect(new StdioServerTransport());
