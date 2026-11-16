import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { makeUnit, addMissingUnits } from './update-official.mjs';
const game = readFileSync(new URL('./Starcraft The Miniature Game.gst', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('./Terrans.cat', import.meta.url), 'utf8');
const mineralId = '5bcf-897a-a5c9-d0e8';
const categories = new Map([...game.matchAll(/<categoryEntry name="([^"]+)" id="([^"]+)"/g),...catalog.matchAll(/<categoryEntry name="([^"]+)" id="([^"]+)"/g)].map(m=>[m[1].trim(),m[2]]));
function parseXml(xml) {
  const result = spawnSync('python3', ['-c', `import sys, xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read())
ids=[e.get('id') for e in r.iter() if e.get('id')]
assert len(ids)==len(set(ids)), 'Duplicate IDs'
for e in r.iter():
 assert e.get('typeId')!='undefined'
 if e.tag=='condition': assert e.get('childId') in ids
 if e.tag=='modifier' and e.get('field') not in ['hidden','${'5bcf-897a-a5c9-d0e8'}']: assert e.get('field') in ids
 assert len(e.findall('modifiers'))<=1, 'Multiple modifier containers'
`], { input: xml, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
function inspectUnit(xml) {
  const result = spawnSync('python3', ['-c', `import sys,json,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read())
def costs(e): return {c.get('typeId'):float(c.get('value')) for c in e.findall('./costs/cost')}
print(json.dumps({'costs':costs(r),'upgrades':{e.get('name'):{'costs':costs(e),'modifiers':[m.attrib for m in e.findall('./modifiers/modifier')]} for e in r.findall('./selectionEntries/selectionEntry')},'profiles':{e.get('name'):{c.get('name'):c.text or '' for c in e.findall('./characteristics/characteristic')} for e in r.findall('./profiles/profile')}}))
`], {input: xml, encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

import { firebat } from './wave4-leak-data.mjs';
test('Firebat database simulation imports both sizes, weapons and optional rules', () => {
  const xml = makeUnit(firebat,game,categories);
  parseXml(xml);
  const data = inspectUnit(xml);
  assert.equal(data.costs[mineralId],150);
  assert.equal(data.upgrades.Reinforce.costs[mineralId],100);
  assert.equal(data.upgrades['Incinerator Gauntlets'].costs[mineralId],20);
  assert.equal(data.upgrades['Need a Light?'].costs[mineralId],30);
  assert.equal(data.profiles.Firebats.Supply,'1-2: 0 | 3-4: 1 | 5-6: 2');
  assert.equal(data.profiles['Perdition Flamethrower'].Rng,'8"');
  assert.equal(data.profiles['Perdition Flamethrower'].Surge,'Light');
  assert.equal(data.profiles['Perdition Flamethrower']['S.Die'],'D3');
  assert.equal(data.profiles['Flame Strike'].Rng,'E');
  assert.equal(data.profiles['Flame Strike'].RoA,'2');
  assert.equal(data.profiles['Flame Strike'].Hit,'3+');
  assert.equal(data.profiles.Stimpack.Cost,'Active (1 CP)');
  const empty = catalog.replace(/^  <selectionEntries>[\s\S]*?^  <\/selectionEntries>/m, '  <selectionEntries>\n  </selectionEntries>');
  const imported = addMissingUnits(empty,[firebat],game);
  assert.match(imported,/selectionEntry name="Firebats"/);
  assert.equal(addMissingUnits(imported,[firebat],game),imported);
});

import { leakUnits, leakCards } from './wave4-leak-data.mjs';
import { addMissingCards, additionalParents, importRulebook, linkRulebook } from './update-official.mjs';
function emptyCatalog(faction) {
  const filename={Terran:'Terrans.cat',Zerg:'Zergs.cat',Protoss:'Protoss.cat'}[faction];
  return readFileSync(new URL('./'+filename,import.meta.url),'utf8').replace(/^  <selectionEntries>[\s\S]*?^  <\/selectionEntries>/m,'  <selectionEntries>\n  </selectionEntries>');
}
function topEntries(xml) { xml=xml.match(/^  <selectionEntries>([\s\S]*?)^  <\/selectionEntries>/m)?.[1] ?? xml; return [...xml.matchAll(/^    <selectionEntry name="[^"]+"[^\n]*\n[\s\S]*?^    <\/selectionEntry>/gm)].map(m=>m[0]); }
function entryNamed(xml,name) {return topEntries(xml).find(entry=>entry.startsWith('    <selectionEntry name="'+name+'"'));}

test('all leak unit and card records can be imported together with resolved conditions', () => {
  const fragments=[];
  for(const faction of ['Terran','Zerg','Protoss']) {
    const units=leakUnits.filter(u=>u.faction===faction), cards=leakCards.filter(c=>c.faction===faction);
    const before=emptyCatalog(faction);
    const unitsXml=addMissingUnits(before,units,game,cards);
    const after=addMissingCards(unitsXml,cards,game);
    assert.equal(topEntries(after).length,units.length+cards.length);
    fragments.push(...topEntries(after));
    assert.equal(addMissingCards(addMissingUnits(after,units,game,cards),cards,game),after);
  }
  parseXml('<root>'+fragments.join('\n')+'</root>');
});

test('Scarabs are hidden additional units unlocked by Reaver and the matching paid upgrade', () => {
  const units=leakUnits.filter(u=>u.faction==='Protoss');
  const reaver=units.find(u=>u.name==='Reaver');
  const reaverXml=makeUnit(reaver,game,categories);
  const base=emptyCatalog('Protoss');
  const xml=addMissingUnits(base,units,game,leakCards);
  const id=reaverXml.match(/selectionEntry name="Reaver" id="([^"]+)"/)[1];
  assert.deepEqual(additionalParents(units.find(u=>u.name==='Scarab'),units,leakCards,base),[id]);
  for(const name of ['Scarab','Solarite Scarab','Phasing Scarab']) {
    const entry=entryNamed(xml,name);
    assert.match(entry,/hidden="true"/);
    assert.match(entry,/categoryLink name="Other"/);
    assert.match(entry,/field="hidden" type="set" value="false"/);
    const parent=additionalParents(units.find(u=>u.name===name),units,leakCards,base);
    assert.equal(parent.length,1);
    if(name!=='Scarab')assert.ok(reaverXml.includes('name="'+name+'" id="'+parent[0]+'"'));
    assert.match(entry,/scope="roster" includeChildForces="true" includeChildSelections="true"/);
    assert.match(entry,/automatic="true"[^>]*type="min" value="0"/);
  }
  const pylon=units.find(u=>u.name==='Tal’darim Pylon');
  const parent=additionalParents(pylon,units,leakCards,base);
  const cards=addMissingCards(base,leakCards.filter(c=>c.faction==='Protoss'),game);
  assert.equal(parent.length,1);
  assert.ok(entryNamed(cards,'Tal’darim').includes('id="'+parent[0]+'"'));
});

test('cross-phase replacement is valid and SPECIALIST retains the standard weapon for other models', () => {
  const marine=leakUnits.find(u=>u.name==='Infested Marine');
  const zerg=emptyCatalog('Zerg');
  const cats=new Map([...game.matchAll(/<categoryEntry name="([^"]+)" id="([^"]+)"/g),...zerg.matchAll(/<categoryEntry name="([^"]+)" id="([^"]+)"/g)].map(m=>[m[1].trim(),m[2]]));
  const xml=makeUnit(marine,game,cats);
  parseXml(xml);
  const rifle=xml.match(/<profile name="Infested C-14 Rifle"[\s\S]*?<\/profile>/)[0];
  const mutations=xml.match(/<selectionEntry name="Wild Mutation" id="([^"]+)"/)[1];
  const acid=xml.match(/<selectionEntry name="Infested Missile Launcher" id="([^"]+)"/)[1];
  assert.ok(rifle.includes('childId="'+mutations+'"'));
  assert.ok(!rifle.includes('childId="'+acid+'"'));
});

const chapterFixture=[{sourceId:'chapter-test',title:'PART 8: THE GAME SEQUENCE',order:10,items:[
  {title:'8.7 Assault Phase Actions',content:[],subItems:[{title:'8.7.6 Template Weapons',content:[{type:'text',value:'<b>Flamer Template (FT)</b><br>Roll to Hit.<table><tr><td>Type</td><td>Attack dice</td></tr><tr><td>Flamer</td><td>Affected models</td></tr></table>'}]}]},
]},{sourceId:'characteristics-test',title:'PART 5: CARDS AND CHARACTERISTICS',order:7,items:[{title:'5.1 Unit Cards',content:[{type:'text',value:'Rate of Attack: dice per firing model.'}]}]}];

test('full chapter import preserves hierarchy and readable tables and updates in place', () => {
  const before=importRulebook(game,chapterFixture);
  assert.match(before,/name="8.7.6 Template Weapons"/);
  assert.match(before,/name="Flamer Template \(FT\)"/);
  assert.match(before,/Type \| Attack dice/);
  assert.match(before,/Flamer \| Affected models/);
  assert.ok(!before.includes('&lt;table'));
  assert.equal(importRulebook(before,chapterFixture),before);
  const changed=structuredClone(chapterFixture);
  changed[0].items[0].subItems[0].content[0].value='Updated template rules.';
  const after=importRulebook(before,changed);
  const testId=before.match(/<rule name="8.7.6 Template Weapons" id="([^"]+)"/)[1];
  assert.ok(after.includes('name="8.7.6 Template Weapons" id="'+testId+'"'));
  assert.match(after,/Updated template rules\./);
});

test('Rules Reference exposes all chapters and Firebats get template and RoA links without duplicates', () => {
  const rules=importRulebook(game,chapterFixture);
  const source=addMissingUnits(emptyCatalog('Terran'),[firebat],rules);
  const linked=linkRulebook(source,rules);
  const firebats=entryNamed(linked,'Firebats');
  assert.match(firebats,/<infoLink name="Flamer Template \(FT\)"/);
  assert.match(firebats,/<infoLink name="Rate of Attack \(RoA\)"/);
  const reference=entryNamed(linked,'Rules Reference');
  assert.match(reference,/<infoLink name="8.7.6 Template Weapons"/);
  assert.equal(linkRulebook(linked,rules),linked);
  const targets=[...rules.matchAll(/<rule name="[^"]+" id="([^"]+)"/g)].map(m=>m[1]);
  for(const link of linked.matchAll(/<infoLink[^>]*targetId="([^"]+)" type="rule"/g)) assert.ok(targets.includes(link[1]),link[1]);
});

test('weapon modes share one paid upgrade and source revisions refresh generated units and cards', () => {
  const source=structuredClone(leakUnits.filter(u=>u.faction==='Zerg'));
  const cards=structuredClone(leakCards.filter(c=>c.faction==='Zerg'));
  let xml=addMissingCards(addMissingUnits(emptyCatalog('Zerg'),source,game,cards),cards,game);
  const marine=entryNamed(xml,'Infested Marine');
  assert.equal((marine.match(/selectionEntry name="Infested Missile Launcher"/g)??[]).length,1);
  const launcher=marine.match(/        <selectionEntry name="Infested Missile Launcher"[^\n]*\n[\s\S]*?        <\/selectionEntry>/)[0];
  assert.equal((launcher.match(/<profile name="Infested Missile Launcher - /g)??[]).length,2);
  assert.equal(inspectUnit(marine).upgrades['Infested Missile Launcher'].costs[mineralId],20);
  source.find(u=>u.name==='Stukov').stats.hp='11';
  cards.find(c=>c.name==='Weighted Pustule').boosts[0].description='Updated source wording.';
  xml=addMissingCards(addMissingUnits(xml,source,game,cards),cards,game);
  assert.equal(inspectUnit(entryNamed(xml,'Stukov')).profiles.Stukov.HP,'11');
  assert.match(entryNamed(xml,'Weighted Pustule'),/Updated source wording\./);
});
