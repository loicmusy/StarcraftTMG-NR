import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const minerals = '5bcf-897a-a5c9-d0e8';
const factions = { Terran: 'Terrans.cat', Zerg: 'Zergs.cat', Protoss: 'Protoss.cat' };
const normalize = (name) => name.toLowerCase().replace(/&apos;|[â€™']/g, '').replace(/[^a-z0-9]/g, '');
const displayNames = new Map([
  ['Marine', 'Marines'], ['Marauder', 'Marauders'], ['Medic', 'Medics'],
  ["Raynor's Raider (Marine)", "Raynor's Raiders"],
  ['Raynorâ€™s Raiders (Marine)', "Raynor's Raiders"], ['Zergling', 'Zerglings'],
  ['Raptor (Zergling)', 'Raptors (Zergling)'], ['Swarmling (Zergling)', 'Swarmlings'],
  ['Kerrigan Swarm Raptor (Zergling)', 'Kerrigan Swarm Raptors (Zergling)'],
  ['Hydralisk', 'Hydralisks'], ['Roach', 'Roaches'], ['Vile (Roach)', 'Viles (Roach)'],
  ['Corpser (Roach)', 'Corpsers (Roach)'], ['Ravager', 'Ravagers'],
  ['Zealot', 'Zealots'], ['Praetor Guard (Zealot)', 'Praetor Guards'],
  ['Adept', 'Adepts'], ['Sentry', 'Sentries'],
].map(([source, target]) => [normalize(source), target]));
const aliases = new Map([...displayNames].map(([key, name]) => [key, normalize(name)]));

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`${response.status} downloading ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const commandCenter = 'https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents';

function decodeValue(value) {
  if ('mapValue' in value) return decodeFields(value.mapValue.fields);
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('integerValue' in value) return Number(value.integerValue);
  const [type, data] = Object.entries(value)[0];
  if (['stringValue', 'doubleValue', 'booleanValue', 'timestampValue', 'nullValue'].includes(type)) return data;
  throw new Error(`Unsupported Command Center field type: ${type}`);
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

async function readCollection(name) {
  const records = [];
  let pageToken;
  do {
    const url = new URL(`${commandCenter}/${name}`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = JSON.parse(await download(url));
    for (const doc of page.documents ?? []) {
      records.push({ sourceId: basename(doc.name), ...decodeFields(doc.fields) });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  if (!records.length) throw new Error(`Empty Command Center collection: ${name}`);
  return records.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

const statFields = { Shd: 'shield', Spd: 'speed', Eva: 'evade', Arm: 'armor', HP: 'hp', Size: 'size' };

function updateStats(xml, units) {
  const byName = new Map();
  for (const unit of units) {
    if (typeof unit.name !== 'string' || !unit.stats) continue;
    const key = normalize(unit.name);
    for (const candidate of new Set([key, aliases.get(key) ?? key])) {
      const matches = byName.get(candidate) ?? [];
      matches.push(unit);
      byName.set(candidate, matches);
    }
  }
  return xml.replace(/<profile name="([^"]+)"[^<>]*typeName="Unit">[\s\S]*?<\/profile>/g, (profile, name) => {
    const matches = byName.get(normalize(name));
    if (matches?.length !== 1) return profile;
    const [{ stats }] = matches;
    return profile.replace(/<characteristic name="(Shd|Spd|Eva|Arm|HP|Size)" typeId="([^"]+)"(?:\/>|>([^<]*)<\/characteristic>)/g,
      (original, field, id, current) => {
        const value = stats[statFields[field]];
        if ((typeof value !== 'string' && typeof value !== 'number') ||
            !/^(?:-|\d+(?:[+/]\d*|\/\d+)?|\d+\/\d+)$/.test(String(value))) return original;
        if (String(value) === current || (value === '-' && !current)) return original;
        console.log(`  ${name} ${field}: ${current || '-'} -> ${value}`);
        return `<characteristic name="${field}" typeId="${id}">${value}</characteristic>`;
      });
  });
}

function replaceCost(entry, indent, value, type = minerals) {
  const cost = new RegExp(`^(${indent}<cost [^\\r\\n]*typeId="${type}" value=")(\\d+)("/>)$`, 'm');
  if (!cost.test(entry)) throw new Error('Missing direct cost field');
  return entry.replace(cost, (_, start, previous, end) => start + value + end);
}

const gas = '1719-6214-392e-e53f';
function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function ruleText(value) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:b|i|strong|em)>/gi, '')
    .replace(/&(?:quot|#34|#x22);|[\u201c\u201d\u2033]/gi, '"')
    .replace(/&(?:apos|#39|#x27);/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[ \t]*(?:<<|&lt;&lt;)[^\n]*\bplaceholder\b[^\n]*(?:>>|&gt;&gt;)[ \t]*$/gim, '')
    .replace(/^[ \t]*[\u2022\u25cf\u25e6\u2023][ \t]*/gm, '- ')
    .trim();
}

function formatWording(value, xml) {
  const text = ruleText(value)
    .replace(/\n[ \t]*\n(?=(?:[ \t]*\n)*- )/g, '\n')
    .replace(/(^- [^\n]*)\n{2,}/gm, '$1\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
  const newline = xml.includes('\r\n') ? '\r\n' : '\n';
  return escapeXml(text.replace(/\n/g, newline));
}

function updateAbilities(entry, unit) {
  return entry.replace(/<profile name="([^"]+)"[^<>]*typeName="Rules \(([^"]+)\)">[\s\S]*?<\/profile>/g, (profile, name, phase) => {
    const matches = (unit.upgrades ?? []).filter((ability) =>
      ability.name && normalize(ability.name) === normalize(name) && ability.phase === phase &&
      ability.activation && typeof ability.description === 'string' && !ability.description.includes('\uFFFD'));
    if (matches.length !== 1) return profile;
    const wording = formatWording(matches[0].description, entry);
    return profile.replace(/(<characteristic name="Effect"[^<>]*>)[\s\S]*?(<\/characteristic>)/,
      (_, opening, closing) => opening + wording + closing);
  });
}

function updateUpgradeCosts(entry, unit) {
  return entry.replace(/^( {10,})<selectionEntry name="([^"]+)"[^\n]*\n[\s\S]*?^\1<\/selectionEntry>/gm,
    (upgrade, indent, name) => {
      const matches = (unit.upgrades ?? []).filter((ability) =>
        ability.name && normalize(ability.name) === normalize(name) && Number.isSafeInteger(ability.costS) && ability.costS >= 0);
      if (matches.length !== 1 || !upgrade.includes('typeId="' + minerals + '"')) return upgrade;
      const [{ costS, costL }] = matches;
      const reinforce = new RegExp('(<modifier field="' + minerals + '" type="set" value=")\\d+(">\\s*<comment>Reinforce Cost</comment>)');
      if (unit.large?.models > unit.small.models && (!Number.isSafeInteger(costL) || costL < 0 ||
          (costL !== costS && !reinforce.test(upgrade)))) return upgrade;
      try {
        const updated = replaceCost(upgrade, indent + '    ', costS);
        return unit.large?.models > unit.small.models
          ? updated.replace(reinforce, (_, opening, closing) => opening + costL + closing) : updated;
      } catch {
        return upgrade;
      }
    });
}

function updateGlossary(xml, sections) {
  const glossary = sections.find((section) => section.title?.includes('KEYWORD GLOSSARY'));
  const entries = glossary?.items?.flatMap((item) => item.subItems ?? []) ?? [];
  return xml.replace(/(<rule name="([^"]+)"[^<>]*>\s*<description>)[\s\S]*?(<\/description>)/g,
    (original, opening, name, closing) => {
      const matches = entries.filter((entry) => entry.title && normalize(entry.title) === normalize(name));
      if (matches.length !== 1) return original;
      const { content, subSubItems } = matches[0];
      if (!content?.length || subSubItems?.length || content.some((part) =>
        part.type !== 'text' || typeof part.value !== 'string' || part.value.includes('\uFFFD'))) return original;
      return opening + formatWording(content.map((part) => part.value).join('\n\n'), xml) + closing;
    });
}

function generatedId(...parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16).match(/.{4}/g).join('-');
}

function appendEntries(xml, closing, entries) {
  if (!entries.length) return xml;
  const newline = xml.includes('\r\n') ? '\r\n' : '\n';
  const anchor = '  </' + closing + '>';
  const index = xml.indexOf(newline + anchor);
  if (index < 0) throw new Error('Missing XML container: ' + closing);
  return xml.slice(0, index) + newline + entries.join('\n').replace(/\n/g, newline) + xml.slice(index);
}

function definitions(xml, tag) {
  const pattern = new RegExp('<' + tag + ' name="([^"]+)" id="([^"]+)"', 'g');
  return new Map([...xml.matchAll(pattern)].map(([, name, id]) => [name.trim(), id]));
}

function makeProfile(game, id, name, type, values) {
  const types = [...game.matchAll(/<profileType name="([^"]+)" id="([^"]+)"[^>]*>([\s\S]*?)<\/profileType>/g)];
  const profile = types.find(([, candidate]) => candidate === type);
  if (!profile) return null;
  const fields = definitions(profile[3], 'characteristicType');
  return [
    '        <profile name="' + escapeXml(name) + '" id="' + id + '" hidden="false" typeId="' + profile[2] + '" typeName="' + type + '">',
    '          <characteristics>',
    ...[...fields].map(([field, target]) => '            <characteristic name="' + field + '" typeId="' + target + '">' + formatWording(String(values[field] ?? ''), '') + '</characteristic>'),
    '          </characteristics>',
    '        </profile>',
  ];
}

function makeUnit(unit, game, categories) {
  const { name, sourceId, small, large, stats, unitType } = unit;
  const rosterName = displayNames.get(normalize(name)) ?? name;
  if (!name || !sourceId || !small || !stats || !categories.has(unitType) ||
      !Number.isSafeInteger(small.models) || small.models < 1 ||
      !Number.isSafeInteger(small.cost) || small.cost < 0 ||
      !Number.isSafeInteger(small.supply) || small.supply < 0) return null;
  const reinforced = large?.models > small.models;
  if (reinforced && (!Number.isSafeInteger(large.models) || !Number.isSafeInteger(large.supply) ||
      !Number.isSafeInteger(large.cost) || large.cost < small.cost)) return null;

  const id = (...parts) => generatedId(unit.faction, sourceId, ...parts);
  const costs = definitions(game, 'costType');
  const cost = (label, value) => '        <cost name="' + label + '" typeId="' + costs.get(label) + '" value="' + value + '"/>';
  const unitStats = Object.fromEntries(Object.entries(statFields).map(([field, source]) => [field, stats[source] === '-' ? '' : stats[source]]));
  unitStats.Supply = (unit.squadProfile ?? []).filter((tier) => tier.modelCount && tier.modelCount !== '-')
    .map((tier) => tier.modelCount.replace(/\s*-\s*/g, '-').replace(/^(\d+)-\1$/, '$1') + ': ' + tier.supply).join(' | ');
  const profile = makeProfile(game, id('unit-profile'), rosterName, 'Unit', unitStats);
  const upgrades = [];
  for (const [index, ability] of (unit.upgrades ?? []).entries()) {
    if (!ability.name || !ability.description || ability.description.includes('\uFFFD')) continue;
    const values = { Effect: ability.description, Cost: (ability.activation ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').replace(/Command Points?/g, 'CP').replace(/Biomass/g, 'BM').replace(/Psionic Energy/g, 'EN') };
    let type = 'Rules (' + ability.phase + ')';
    const weapon = /^RANGE:\s*(.*?)\s*\|\s*TARGET:\s*(.*?)\s*\|\s*RoA:\s*(.*?)\s*\|\s*HIT:\s*(.*?)\s*\|\s*DMG:\s*(.*?)\s*\r?\nSURGE:\s*([^\r\n(]*?)(?:\s+\(([^\r\n]*)\))?[ \t]*(\r?\n[\s\S]*)?$/i.exec(ability.description);
    if (weapon) {
      type = ability.phase === 'Combat Phase' ? 'Combat Weapon' : 'Assault Weapon';
      ['Rng', 'Tgt', 'RoA', 'Hit', 'Dmg', 'Surge', 'S.Die', 'Keyword'].forEach((field, i) => {
        values[field] = (weapon[i + 1] ?? '').trim().replace(/^-$|''/g, (value) => value === '-' ? '' : '"');
      });
    }
    if (weapon && /^\d+$/.test(values.Rng)) values.Rng += '"';
    const abilityProfile = makeProfile(game, id('profile', index), ability.name, type, values);
    if (!abilityProfile || (!ability.activation && !weapon)) continue;
    if (ability.costS > 0 || (ability.linkedTo && ability.linkedTo !== '-')) {
      const entryId = id('upgrade', index);
      upgrades.push(
        '        <selectionEntry name="' + escapeXml(ability.name) + '" id="' + entryId + '" hidden="false" import="true" type="upgrade">',
        '          <constraints><constraint id="' + id('upgrade-max', index) + '" field="selections" scope="parent" shared="true" type="max" value="1"/></constraints>',
        '          <costs>', '    ' + cost('Minerals', ability.costS ?? 0), '          </costs>',
        ...(reinforced && Number.isSafeInteger(ability.costL) && ability.costL !== (ability.costS ?? 0) ? [
          '          <modifiers>',
          '            <modifier field="' + minerals + '" type="set" value="' + ability.costL + '">',
          '              <comment>Reinforce Cost</comment>',
          '              <conditions><condition childId="' + id('reinforce') + '" field="selections" scope="unit" type="atLeast" value="1"/></conditions>',
          '            </modifier>', '          </modifiers>',
        ] : []),
        '          <profiles>', ...abilityProfile.map((line) => '    ' + line), '          </profiles>',
        '        </selectionEntry>',
      );
    } else profile.push(...abilityProfile);
  }
  const tags = [unitType, ...(unit.tags ?? '').split(',').map((tag) => tag.trim())];
  const links = [...new Set(tags)].filter((tag) => categories.has(tag)).map((tag) =>
    '        <categoryLink name="' + escapeXml(tag) + '" id="' + id('category', tag) + '" primary="' + (tag === unitType) + '" targetId="' + categories.get(tag) + '"/>');
  const models = ['        <selectionEntry name="' + escapeXml(name) + '" id="' + id('model') + '" hidden="false" import="true" type="model">',
    '          <constraints>'];
  for (const kind of ['min', 'max']) models.push('            <constraint id="' + id(kind) + '" automatic="true" field="selections" scope="parent" shared="true" type="' + kind + '" value="' + small.models + '"/>');
  models.push('          </constraints>');
  if (reinforced) {
    models.push('          <modifiers>');
    for (const kind of ['min', 'max']) models.push(
      '            <modifier field="' + id(kind) + '" type="set" value="' + large.models + '">',
      '              <conditions><condition childId="' + id('reinforce') + '" field="selections" scope="parent" type="atLeast" value="1"/></conditions>',
      '            </modifier>');
    models.push('          </modifiers>');
  }
  models.push('        </selectionEntry>');
  if (reinforced) models.push(
    '        <selectionEntry name="Reinforce" id="' + id('reinforce') + '" hidden="false" import="true" type="upgrade">',
    '          <constraints><constraint id="' + id('reinforce-max') + '" field="selections" scope="parent" shared="true" type="max" value="1"/></constraints>',
    '          <costs>', '    ' + cost('Minerals', large.cost - small.cost),
    ...(costs.has(unitType) ? ['    ' + cost(unitType, small.supply - large.supply)] : []),
    '          </costs>', '        </selectionEntry>');
  return [
    '    <selectionEntry name="' + escapeXml(rosterName) + '" id="' + id('unit') + '" hidden="' + (unitType === 'Other') + '" import="true" type="unit">',
    '      <categoryLinks>', ...links, '      </categoryLinks>',
    '      <costs>', cost('Minerals', small.cost), ...(costs.has(unitType) ? [cost(unitType, -small.supply)] : []), '      </costs>',
    '      <profiles>', ...profile, '      </profiles>',
    '      <selectionEntries>', ...models, ...upgrades, '      </selectionEntries>',
    '    </selectionEntry>',
  ].join('\n');
}

function addMissingUnits(xml, units, game) {
  const names = new Set([...xml.matchAll(/^    <selectionEntry name="([^"]+)"/gm)].map(([, name]) => normalize(name)));
  const categories = new Map([...definitions(game, 'categoryEntry'), ...definitions(xml, 'categoryEntry')]);
  const entries = [];
  for (const unit of units) {
    const name = normalize(unit.name);
    if (names.has(name) || names.has(aliases.get(name)) ||
        (name.startsWith('nova') && names.has('nova'))) continue;
    const entry = makeUnit(unit, game, categories);
    if (!entry) {
      console.warn('  Review missing unit: ' + unit.name);
      continue;
    }
    names.add(name);
    entries.push(entry);
    console.log('  Add unit: ' + unit.name);
  }
  return appendEntries(xml, 'selectionEntries', entries);
}

function addMissingRules(game, sections, catalogs) {
  const names = new Set([...definitions(game, 'rule').keys()].map(normalize));
  const glossary = sections.find((section) => section.title?.includes('KEYWORD GLOSSARY'));
  const entries = [];
  for (const rule of glossary?.items?.flatMap((item) => item.subItems ?? []) ?? []) {
    if (!rule.title || names.has(normalize(rule.title)) || !rule.content?.length || rule.subSubItems?.length ||
        rule.content.some((part) => part.type !== 'text' || typeof part.value !== 'string' || part.value.includes('\uFFFD'))) continue;
    const wording = formatWording(rule.content.map((part) => part.value).join('\n\n'), '');
    if (!wording) continue;
    const links = new Set(catalogs.flatMap((xml) => [...xml.matchAll(/<infoLink name="([^"]+)"[^>]*targetId="([^"]+)" type="rule"/g)]
      .filter(([, name]) => normalize(name) === normalize(rule.title)).map(([, , id]) => id)));
    if (links.size > 1) continue;
    const id = [...links][0] ?? generatedId('glossary', rule.title);
    if (game.includes('id="' + id + '"')) continue;
    entries.push('    <rule name="' + escapeXml(rule.title) + '" id="' + id + '" hidden="false">\n      <description>' + wording + '</description>\n    </rule>');
    names.add(normalize(rule.title));
    console.log('  Add rule: ' + rule.title);
  }
  return appendEntries(game, 'sharedRules', entries);
}

function updateCatalog(xml, units, cards) {
  const prices = units.filter((unit) => Number.isSafeInteger(unit.small?.cost) && unit.small.cost >= 0)
    .map((unit) => ({
      ...unit, base: unit.small.cost,
      reinforced: unit.large?.models > unit.small.models && Number.isSafeInteger(unit.large.cost) ? unit.large.cost : null,
    }));
  const cardNames = new Map(cards.filter((card) => !card.isFactionCard).map((card) => [normalize(card.name), card]));
  const byName = new Map();
  for (const row of prices) {
    const key = normalize(row.name);
    const target = aliases.get(key) ?? key;
    if (byName.has(target)) throw new Error(`Ambiguous points rows for ${row.name}`);
    byName.set(target, row);
  }
  const updated = xml.replace(/^    <selectionEntry name="([^"]+)"[^\n]*\n[\s\S]*?^    <\/selectionEntry>/gm, (entry, name) => {
    const key = normalize(name);
    const row = byName.get(key);
    if (!row) {
      const card = cardNames.get(key);
      if (!card || card.isFactionCard || !Number.isSafeInteger(card.cost) || card.cost < 0) return entry;
      cardNames.delete(key);
      try {
        return replaceCost(entry, '        ', card.cost, gas);
      } catch (error) {
        console.warn('  Review tactical card ' + name + ': ' + error.message);
        return entry;
      }
    }
    byName.delete(key);
    try {
      let result = updateUpgradeCosts(updateAbilities(entry, row), row);
      if (row.base > 0 || /^        <cost [^\n]*typeId=/m.test(result)) result = replaceCost(result, '        ', row.base);
      if (row.reinforced !== null) {
        if (row.reinforced < row.base) throw new Error('Reinforced price is below base price');
        const reinforce = /^        <selectionEntry name="Reinforce"[^\n]*\n[\s\S]*?^        <\/selectionEntry>/m;
        if (!reinforce.test(result)) throw new Error('Missing Reinforce entry');
        result = result.replace(reinforce, (child) => replaceCost(child, '            ', row.reinforced - row.base));
      }
      if (result !== entry) console.log(`  ${name}: ${row.base}${row.reinforced === null ? '' : ' / ' + row.reinforced}`);
      return result;
    } catch (error) {
      console.warn(`  Review ${name}: ${error.message}`);
      return entry;
    }
  });
  for (const row of byName.values()) console.warn(`  Review missing or renamed entry: ${row.name}`);
  for (const card of cardNames.values()) console.warn('  Review unmatched card: ' + card.name);
  return updated;
}

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const sourceOutput = args.find((arg) => arg.startsWith('--source-output='))?.slice('--source-output='.length);
const sourceInput = args.find((arg) => arg.startsWith('--source-input='))?.slice('--source-input='.length);
if (args.some((arg) => arg !== '--apply' && !arg.startsWith('--source-output=') && !arg.startsWith('--source-input='))) {
  throw new Error('Usage: node update-official.mjs [--apply] [--source-output=PATH] [--source-input=PATH]');
}

const collections = ['army_units', 'tactical_cards', 'rules_sections'];
const official = sourceInput ? JSON.parse(await readFile(sourceInput, 'utf8'))
  : Object.fromEntries(await Promise.all(collections.map(async (name) => [name, await readCollection(name)])));
for (const name of collections) {
  if (!Array.isArray(official[name]) || !official[name].length) throw new Error('Missing official collection: ' + name);
}
if (sourceOutput) await writeFile(sourceOutput, JSON.stringify(official, null, 2) + '\n');
console.log(collections.map((name) => name + ': ' + official[name].length).join(', '));

const changes = [];
const catalogs = [];
const game = join(root, 'Starcraft The Miniature Game.gst');
const previousRules = await readFile(game, 'utf8');
for (const [faction, filename] of Object.entries(factions)) {
  console.log(faction);
  const file = join(root, filename);
  const before = await readFile(file, 'utf8');
  const units = official.army_units.filter((unit) => unit.faction === faction);
  const cards = official.tactical_cards.filter((card) => card.faction === faction);
  if (!units.length || !cards.length) throw new Error('Incomplete Command Center data for ' + faction);
  const after = addMissingUnits(updateStats(updateCatalog(before, units, cards), units), units, previousRules);
  catalogs.push(after);
  if (after !== before) changes.push({ file, after });
}
const nextRules = addMissingRules(updateGlossary(previousRules, official.rules_sections), official.rules_sections, catalogs);
if (nextRules !== previousRules) changes.push({ file: game, after: nextRules });

for (const { file, after } of changes) {
  console.log((apply ? 'Updating ' : 'Would update ') + basename(file));
  if (apply) await writeFile(file, after);
}
console.log((apply ? 'Updated ' : 'Would update ') + changes.length + ' file(s). Review generated entries and unsupported fields before publishing.');
