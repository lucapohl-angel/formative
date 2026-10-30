import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { build } from 'esbuild';
import { manifests, type Manifest } from './definitions.js';

const exec=promisify(execFile),packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const manifestSchema=z.object({name:z.string().regex(/^[A-Z][A-Za-z0-9]{1,50}$/),version:z.string().regex(/^\d+\.\d+\.\d+$/),description:z.string().min(10),props:z.record(z.string(),z.unknown()),example:z.record(z.string(),z.unknown()),slots:z.array(z.enum(['default'])),events:z.array(z.string()),bindings:z.array(z.string()),states:z.array(z.string()).min(1),designRoles:z.array(z.string()).min(1),source:z.string(),license:z.string()}).strict();
export type CustomManifest=z.infer<typeof manifestSchema>&{hash:string};
export async function loadCustom(projectDir:string):Promise<{manifests:Record<string,Manifest>;entries:CustomManifest[]}> {
  const root=path.join(projectDir,'.formative','components'),result:Record<string,Manifest>={},entries:CustomManifest[]=[];
  const names=await fs.readdir(root).catch((e:any)=>{if(e.code==='ENOENT')return [];throw e;});
  for(const name of names){
    if(!/^[A-Z][A-Za-z0-9]{1,50}$/.test(name))continue;
    const raw=JSON.parse(await fs.readFile(path.join(root,name,'manifest.json'),'utf8'));
    const {hash,...rest}=raw,m=manifestSchema.parse(rest);
    if(m.name!==name||manifests[name])throw new Error('Custom component name conflicts with the catalog');
    const code=await fs.readFile(path.join(root,name,'bundle.js'));
    if(createHash('sha256').update(code).digest('hex')!==hash)throw new Error(`Component ${name} changed after registration. Register it again.`);
    const props=z.fromJSONSchema(m.props as any);if(!(props instanceof z.ZodObject))throw new Error('Component properties must be an object schema');
    result[name]={...m,props:props.strict(),pack:'project',implementation:`.formative/components/${name}/source.tsx`};entries.push({...m,hash});
  }
  return {manifests:result,entries};
}
export async function registerCustom(projectDir:string,sourceFile:string,manifestFile:string){
  const project=await fs.realpath(projectDir);
  for(const file of [sourceFile,manifestFile]){const real=await fs.realpath(file);if(!real.startsWith(project+path.sep))throw new Error('Component source and manifest must be inside the selected project.');}
  const m=manifestSchema.parse(JSON.parse(await fs.readFile(manifestFile,'utf8')));
  if(manifests[m.name])throw new Error('Use a new component name; core components cannot be shadowed.');
  const code=await fs.readFile(sourceFile,'utf8');
  if(/dangerouslySetInnerHTML|\beval\s*\(|new\s+Function|\bstyle\s*=|className\s*=\s*\{/.test(code))throw new Error('Use semantic classes and shared primitives; raw styles, HTML, and executable strings are not admitted.');
  for(const match of code.matchAll(/className\s*=\s*["']([^"']+)["']/g))if(!match[1].split(/\s+/).every(c=>/^f-[a-z0-9-]+$/.test(c)))throw new Error('Custom components use shared f- design classes.');
  const schema=z.fromJSONSchema(m.props as any);if(!(schema instanceof z.ZodObject))throw new Error('Properties must be an object schema');schema.strict().parse(m.example);
  if(Object.keys(schema.shape).some(k=>['style','className','html','script'].includes(k)))throw new Error('Custom properties cannot expose styling or code escape routes');
  const temp=path.join(packageRoot,'artifacts','typecheck',randomUUID());await fs.mkdir(temp,{recursive:true});
  await fs.writeFile(path.join(temp,'component.tsx'),code);
  await fs.writeFile(path.join(temp,'runtime.d.ts'),'declare module "@formative/runtime" { export const React: typeof import("react"); export const ActionButton: typeof import("../../../src/catalog/components.js").ActionButton; export const useBoundProp: typeof import("@json-render/react").useBoundProp; }\n');
  try{
    await exec(process.execPath,[fileURLToPath(new URL('bin/tsc',import.meta.resolve('typescript/package.json'))),'--ignoreConfig','--noEmit','--strict','--skipLibCheck','--jsx','react','--target','ES2023','--module','ESNext','--moduleResolution','bundler',path.join(temp,'component.tsx'),path.join(temp,'runtime.d.ts')],{cwd:packageRoot});
    const result=await build({stdin:{contents:code,sourcefile:'component.tsx',loader:'tsx',resolveDir:project},bundle:true,write:false,format:'esm',platform:'browser',jsx:'transform',plugins:[{name:'formative-runtime-only',setup(b){b.onResolve({filter:/.*/},args=>{if(args.path==='@formative/runtime')return {path:'/api/component-runtime.js',external:true};return {errors:[{text:'Custom components may import only @formative/runtime. Add a reviewed adapter for other libraries.'}]};});}}]});
    const bundle=result.outputFiles[0].contents,hash=createHash('sha256').update(bundle).digest('hex');
    const root=path.join(project,'.formative','components',m.name);await fs.mkdir(root,{recursive:true});
    await fs.writeFile(path.join(root,'source.tsx'),code);await fs.writeFile(path.join(root,'bundle.js'),bundle);await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({...m,hash},null,2));
    return {name:m.name,version:m.version,hash,note:'Registered locally after schema, type, and design-source checks. Exercise its interactive specimen and compare themes before using it in an accepted prototype.'};
  }catch(e:any){throw new Error(e.stdout||e.stderr||e.message);}finally{await fs.rm(temp,{recursive:true,force:true});}
}
