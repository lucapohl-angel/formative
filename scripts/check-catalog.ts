import { promises as fs } from 'node:fs';
import { manifests } from '../src/catalog/definitions.js';
for(const [name,m]of Object.entries(manifests)){m.props.parse(m.example);if(m.props.safeParse({...m.example,style:{color:'red'}}).success)throw new Error(`${name} accepts raw styling`);await fs.access(m.implementation);}
const components=await fs.readFile('src/catalog/components.tsx','utf8');
for(const name of Object.keys(manifests))if(!new RegExp(`\\b${name}:`).test(components))throw new Error(`Missing renderer ${name}`);
if(/#[0-9a-f]{3,8}\b/i.test(components))throw new Error('Raw colors in component implementations');
console.log(`${Object.keys(manifests).length} catalog entries have schemas, implementations, and no raw styling escape.`);
