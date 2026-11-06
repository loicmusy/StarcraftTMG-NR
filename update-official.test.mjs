import test from 'node:test';
import assert from 'node:assert/strict';
import { formatWording } from './update-official.mjs';

test('Orders restores source paragraphs as a compact list', () => {
  assert.equal(formatWording('Apply one of the following effects:\n\n1 CP: First.\n\n2 CP: Second.', ''),
    'Apply one of the following effects:\n- 1 CP: First.\n- 2 CP: Second.');
});

test('list introduction can have additional sentences', () => {
  assert.equal(formatWording('Apply one of the following effects. Choose each Round:\n\nFirst.\n\nSecond.', ''),
    'Apply one of the following effects. Choose each Round:\n- First.\n- Second.');
});

test('HTML breaks, bullets and XML escaping preserve readable lines', () => {
  assert.equal(formatWording('Rules:<br><br>• A &amp; B<br><br>• Within 8"', '\r\n'),
    'Rules:\r\n- A &amp; B\r\n- Within 8&quot;');
});

test('prose keeps paragraphs and CRLF is not duplicated', () => {
  assert.equal(formatWording('First.\r\n\r\nSecond.', '\r\n'), 'First.\r\n\r\nSecond.');
});

test('closing condition after a list remains prose', () => {
  assert.equal(formatWording('The following effects:\nFirst.\nSecond.\nIf both apply, resolve in order.', ''),
    'The following effects:\n- First.\n- Second.\nIf both apply, resolve in order.');
});

test('formatting is idempotent', () => {
  const text = 'Apply the following effects:\n- First.\n- Second.';
  assert.equal(formatWording(text, ''), text);
});

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { makeUnit, addMissingUnits, setEntryCost } from './update-official.mjs';
const game = readFileSync(new URL('./Starcraft The Miniature Game.gst', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('./Terrans.cat', import.meta.url), 'utf8');
const categories = new Map([...game.matchAll(/<categoryEntry name="([^"]+)" id="([^"]+)"/g),
  ...catalog.matchAll(/<categoryEntry name="([^"]+)" id="([^"]+)"/g)].map((match) => [match[1].trim(), match[2]]));
const weapon = (name, linkedTo = '-', costS = 0, costL = costS) => ({ name, linkedTo, costS, costL,
  phase: 'Assault Phase', activation: '',
  description: 'RANGE: 12 | TARGET: All | RoA: 3 | HIT: 4+ | DMG: 1\nSURGE: Light (D3)\n\nPIERCE Armoured (2)' });
const newUnit = () => ({ sourceId: 'test_new_unit', name: 'Test & New Unit', faction: 'Terran', unitType: 'Core',
  tags: 'Biological, Ground, Unique', small: { models: 3, supply: 1, cost: 0 },
  large: { models: 6, supply: 2, cost: 100 }, stats: { shield: '-', speed: '4/7', evade: '6+', armor: '5+', hp: '1', size: '1' },
  squadProfile: [{ modelCount: '1 - 3', supply: 1 }, { modelCount: '4 - 6', supply: 2 }],
  upgrades: [weapon('Rifle'), weapon('Alternative A', 'Rifle', 10, 20), weapon('Alternative B', 'Rifle', 20, 30)] });

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

test('new units include valid weapons, replacement conditions, reinforcement and explicit zero costs', () => {
  const xml = makeUnit(newUnit(), game, categories);
  assert.ok(xml);
  parseXml(xml);
  assert.match(xml, /name="Minerals"[^>]*value="0"/);
  assert.match(xml, /name="Gas"[^>]*value="0"/);
  assert.match(xml, /name="Reinforce"/);
  assert.match(xml, /name="Supply"[^>]*>1-3: 1 \| 4-6: 2</);
  assert.match(xml, /scope="roster"[^>]*type="max" value="1"/);
  assert.equal((xml.match(/field="hidden" type="set" value="true"/g) ?? []).length, 2);
  assert.equal((xml.match(/type="set" value="0"><conditions>/g) ?? []).length, 2);
});

test('new unit import is repeatable and aliases do not create duplicates', () => {
  const u = newUnit();
  const first = addMissingUnits(catalog, [u], game);
  assert.equal(addMissingUnits(first, [u], game), first);
  assert.equal(addMissingUnits(first, [{ ...u, name: 'Renamed Unit' }], game), first);
  assert.equal(addMissingUnits(catalog, [{ ...u, name: 'Marine' }], game), catalog);
});

test('ability IDs survive source order changes and same names in different phases', () => {
  const u = newUnit();
  u.upgrades.push({ ...weapon('Rifle'), phase: 'Combat Phase' });
  const first = makeUnit(u, game, categories);
  const second = makeUnit({ ...u, upgrades: [...u.upgrades].reverse() }, game, categories);
  parseXml(first);
  const ids = (xml) => [...xml.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids(first), ids(second));
});

test('invalid new units are rejected instead of partially imported', () => {
  const u = newUnit();
  assert.equal(makeUnit({ ...u, stats: {} }, game, categories), null);
  assert.equal(makeUnit({ ...u, upgrades: [weapon('Alternative', 'Missing weapon')] }, game, categories), null);
  assert.equal(makeUnit({ ...u, upgrades: [weapon('Rifle'), weapon('Rifle')] }, game, categories), null);
  assert.equal(makeUnit({ ...u, unitType: 'Unknown' }, game, categories), null);
});

test('missing cost fields are created even for zero; other currencies remain unchanged', () => {
  const entry = '    <selectionEntry name="Free" id="free" type="upgrade">\n    </selectionEntry>';
  const gas = setEntryCost(entry, 0);
  assert.match(gas, /name="Gas"[^>]*value="0"/);
  assert.equal(setEntryCost(gas, 0), gas);
  const both = setEntryCost(gas, 0, '5bcf-897a-a5c9-d0e8', 'Minerals');
  assert.match(both, /name="Minerals"[^>]*value="0"/);
  assert.match(setEntryCost(both, 10), /name="Minerals"[^>]*value="0"/);
  parseXml(both);
});
