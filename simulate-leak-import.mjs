import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { leakUnits, leakCards } from './wave4-leak-data.mjs';

const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--apply' && !arg.startsWith('--source-input=') && !arg.startsWith('--source-output='))) {
  throw Error('Usage: node simulate-leak-import.mjs [--apply] [--source-input=OFFICIAL.json] [--source-output=MERGED.json]');
}
const directory=await mkdtemp(join(tmpdir(),'starcraft-leak-'));
const importer=fileURLToPath(new URL('./update-official.mjs',import.meta.url));
const run=arguments_=>{
  const result=spawnSync(process.execPath,[importer,...arguments_],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error('Importer exited with '+result.status);
};
try {
  const supplied=args.find(arg=>arg.startsWith('--source-input='))?.slice('--source-input='.length);
  const officialPath=supplied ? resolve(supplied) : join(directory,'official.json');
  if(!supplied)run(['--source-output='+officialPath]);
  const official=JSON.parse(await readFile(officialPath,'utf8'));
  // The official source remains untouched. Simulation rows are merged into a separate snapshot.
  for(const [collection,fixtures]of [['army_units',leakUnits],['tactical_cards',leakCards]]) {
    if(!Array.isArray(official[collection]))throw Error('Missing '+collection);
    const ids=new Set(fixtures.map(row=>row.sourceId));
    official[collection]=[...official[collection].filter(row=>!ids.has(row.sourceId)),...fixtures];
  }
  const merged=args.find(arg=>arg.startsWith('--source-output='))?.slice('--source-output='.length) ?? join(directory,'merged.json');
  await writeFile(merged,JSON.stringify(official,null,2)+'\n');
  run(['--source-input='+merged,...(args.includes('--apply')?['--apply']:[])]);
} finally { await rm(directory,{recursive:true,force:true}); }
