#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const isSkillInstall=process.argv[2]==='install-skill';
if(isSkillInstall){process.argv.splice(2,1);await import('../scripts/install-skill.mjs');}
else{
const isMcp=process.argv[2]==='mcp';
const child=spawn(process.execPath,['--import',import.meta.resolve('tsx'),fileURLToPath(new URL(isMcp?'src/adapters/mcp.ts':'src/cli/main.ts',root)),...process.argv.slice(isMcp?3:2)],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',(code,signal)=>process.exit(code??(signal==='SIGINT'?130:143)));
child.on('error',error=>{console.error(error.message);process.exit(1);});
}
