import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const minerals = '5bcf-897a-a5c9-d0e8';
const factions = { Terran: 'Terrans.cat', Zerg: 'Zergs.cat', Protoss: 'Protoss.cat' };
const normalize = (name) => name.toLowerCase().replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;|[â€™']/g, '').replace(/[^a-z0-9]/g, '');
const displayNames = new Map([
  ['Firebat', 'Firebats'], ['Marine', 'Marines'], ['Marauder', 'Marauders'], ['Medic', 'Medics'],
  ["Raynor's Raider (Marine)", "Raynor's Raiders"],
  ['Raynorâ€™s Raiders (Marine)', "Raynor's Raiders"], ['Zergling', 'Zerglings'],
  ['Raptor (Zergling)', 'Raptors (Zergling)'], ['Swarmling (Zergling)', 'Swarmlings'],
  ['Kerrigan Swarm Raptor (Zergling)', 'Kerrigan Swarm Raptors (Zergling)'],
  ['Roachling', 'Roachlings'], ['Vileling (Zergling)', 'Vilelings (Zergling)'],
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

export function updateStats(xml, units) {
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

export function setEntryCost(entry, value, type = gas, label = 'Gas') {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid cost');
  if (new RegExp('^        <cost [^\\n]*typeId="' + type + '"', 'm').test(entry)) {
    return replaceCost(entry, '        ', value, type);
  }
  const newline = entry.includes('\r\n') ? '\r\n' : '\n';
  const cost = '        <cost name="' + label + '" typeId="' + type + '" value="' + value + '"/>';
  if (/^      <costs>/m.test(entry)) return entry.replace(/^(      <costs>)/m, '$1' + newline + cost);
  return entry.replace(/^(    <selectionEntry[^\n]*\n)/, '$1      <costs>' + newline + cost + newline + '      </costs>' + newline);
}

function ensureZeroCost(entry, type, label) {
  return new RegExp('^        <cost [^\\n]*typeId="' + type + '"', 'm').test(entry)
    ? entry : setEntryCost(entry, 0, type, label);
}

const gas = '1719-6214-392e-e53f';
function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function ruleText(value) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ' | ')
    .replace(/<\/(?:tr|p|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/?(?:table|tbody|thead|tfoot|tr|td|th|colgroup|col|p|div|span|ul|ol|li|h[1-6])\b[^>]*>/gi, '')
    .replace(/&nbsp;|\u00a0/gi, ' ')
    .replace(/<\/?(?:b|i|strong|em)>/gi, '')
    .replace(/&(?:quot|#34|#x22);|[\u201c\u201d\u2033]/gi, '"')
    .replace(/&(?:apos|#39|#x27);/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\r\n?/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[ \t]*(?:<<|&lt;&lt;)[^\n]*\bplaceholder\b[^\n]*(?:>>|&gt;&gt;)[ \t]*$/gim, '')
    .replace(/^[ \t]*(?:<<|&lt;&lt;)[^\n]*\bVISUAL\b[^\n]*(?:>>|&gt;&gt;)[ \t]*$/gim, '')
    .replace(/^[ \t]*VISUAL[^\n]*\bplaceholder\b[^\n]*$/gim, '')
    .replace(/^[ \t]*[\u2022\u25cf\u25e6\u2023][ \t]*/gm, '- ')
    .trim();
}

export function formatWording(value, xml) {
  // The source sometimes encodes choices as bare paragraphs rather than bullets.
  // Only infer lists after an explicit list introduction; keep prose paragraphs.
  let wording = ruleText(value);
  wording = wording.replace(/((?:following effects[^\n]*|following rules|for):[ \t]*\n)([\s\S]*)/gi,
    (whole, introduction, rest) => {
      const lines = rest.split('\n');
      const choices = lines.filter((line) => line.trim());
      if (choices.length < 2) return whole;
      return introduction + lines.map((line) => {
        if (!line.trim() || /^- /.test(line)) return line;
        if (/^If |^When |^Then |^After /i.test(line)) return line;
        return '- ' + line.trimStart();
      }).join('\n');
    });
  const text = wording
    .replace(/\n(?:[ \t]*\n)+(?=- )/g, '\n')
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
  return entry.replace(/^( {8,})<selectionEntry name="([^"]+)"[^\n]*\n[\s\S]*?^\1<\/selectionEntry>/gm,
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

export function makeUnit(unit, game, categories) {
  if (!unit || typeof unit !== 'object') return null;
  const { name, sourceId, small, large, stats, unitType } = unit;
  if (typeof sourceId !== 'string' || !sourceId.trim() ||
      (unit.tags !== undefined && typeof unit.tags !== 'string') ||
      (unit.upgrades !== undefined && !Array.isArray(unit.upgrades)) ||
      (unit.squadProfile !== undefined && (!Array.isArray(unit.squadProfile) || unit.squadProfile.some(tier =>
        !tier || typeof tier.modelCount !== 'string' || !Number.isSafeInteger(tier.supply) || tier.supply < 0)))) return null;
  if (typeof name !== 'string' || !name.trim()) return null;
  const rosterName = displayNames.get(normalize(name)) ?? name;
  if (!name || !sourceId || !small || !stats || !categories.has(unitType) ||
      !Number.isSafeInteger(small.models) || small.models < 1 ||
      !Number.isSafeInteger(small.cost) || small.cost < 0 ||
      !Number.isSafeInteger(small.supply) || small.supply < 0) return null;
  if (Object.values(statFields).some((field) => stats[field] === undefined ||
      !/^(?:-|\d+(?:[+/]\d*)?)$/.test(String(stats[field])))) return null;
  const reinforced = large?.models > small.models;
  if (reinforced && (!Number.isSafeInteger(large.models) || !Number.isSafeInteger(large.supply) ||
      large.supply < 0 || !Number.isSafeInteger(large.cost) || large.cost < small.cost)) return null;

  const abilities = unit.upgrades ?? [];
  const abilityKey = (ability) => normalize(ability.name) + ':' + normalize(ability.phase ?? '');
  const abilityNames = new Set();
  for (const ability of abilities) {
    if (!ability || typeof ability.name !== 'string' || typeof ability.phase !== 'string' ||
        (ability.linkedTo !== undefined && typeof ability.linkedTo !== 'string') ||
        (ability.activation !== undefined && typeof ability.activation !== 'string')) return null;
    const key = ability.name ? abilityKey(ability) : '';
    if (!key || abilityNames.has(key) || typeof ability.description !== 'string' ||
        !ability.description.trim() || ability.description.includes('\uFFFD') ||
        !Number.isSafeInteger(ability.costS) || ability.costS < 0 ||
        (reinforced && (!Number.isSafeInteger(ability.costL) || ability.costL < 0))) return null;
    abilityNames.add(key);
  }
  const baseFor = (ability) => {
    const candidates=abilities.filter(base=>normalize(base.name)===normalize(ability.linkedTo ?? '') && (!base.linkedTo || base.linkedTo==='-'));
    const samePhase=candidates.filter(base=>base.phase===ability.phase);
    return samePhase.length===1 ? samePhase[0] : candidates.length===1 ? candidates[0] : null;
  };
  for (const ability of abilities) {
    if (ability.linkedTo && ability.linkedTo !== '-' &&
        !baseFor(ability)) return null;
  }
  const id = (...parts) => generatedId(unit.faction, sourceId, ...parts);
  const costs = definitions(game, 'costType');
  if (!costs.has('Minerals') || !costs.has('Gas') || (unitType !== 'Other' && !costs.has(unitType))) return null;
  const cost = (label, value) => '        <cost name="' + label + '" typeId="' + costs.get(label) + '" value="' + value + '"/>';
  const unitStats = Object.fromEntries(Object.entries(statFields).map(([field, source]) => [field, stats[source] === '-' ? '' : stats[source]]));
  unitStats.Supply = (unit.squadProfile ?? []).filter((tier) => tier.modelCount && tier.modelCount !== '-')
    .map((tier) => tier.modelCount.replace(/\s*-\s*/g, '-').replace(/^(\d+)-\1$/, '$1') + ': ' + tier.supply).join(' | ');
  const profile = makeProfile(game, id('unit-profile'), rosterName, 'Unit', unitStats);
  if (!profile) return null;
  const upgrades = [];
  const groupedUpgrades = new Map();
  const selectionKey = ability => ability.optionGroup ? 'option:'+normalize(ability.optionGroup) : abilityKey(ability);
  for (const ability of abilities) {
    const index = abilityKey(ability);
    if (!ability.name || !ability.description || ability.description.includes('\uFFFD')) continue;
    const values = { Effect: ability.description, Cost: (ability.activation ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').replace(/Command Points?/g, 'CP').replace(/Biomass/g, 'BM').replace(/Psionic Energy/g, 'EN') };
    let type = 'Rules (' + ability.phase + ')';
    const weapon = /^RANGE:\s*(.*?)\s*\|\s*TARGET:\s*(.*?)\s*\|\s*RoA:\s*(.*?)\s*\|\s*HIT:\s*(.*?)\s*\|\s*DMG:\s*(.*?)\s*\r?\nSURGE:\s*([^\r\n(]*?)(?:\s+\(([^\r\n]*)\))?[ \t]*(\r?\n[\s\S]*)?$/i.exec(ability.description);
    if (!weapon && /^RANGE:/i.test(ability.description.trim())) return null;
    if (weapon) {
      type = ability.phase === 'Combat Phase' ? 'Combat Weapon' : 'Assault Weapon';
      ['Rng', 'Tgt', 'RoA', 'Hit', 'Dmg', 'Surge', 'S.Die', 'Keyword'].forEach((field, i) => {
        values[field] = (weapon[i + 1] ?? '').trim().replace(/^-$|''/g, (value) => value === '-' ? '' : '"');
      });
    }
    if (weapon && /^\d+$/.test(values.Rng)) values.Rng += '"';
    const abilityProfile = makeProfile(game, id('profile', index), ability.name, type, values);
    if (!abilityProfile || (weapon && !['Assault Phase', 'Combat Phase'].includes(ability.phase))) return null;
    const replacements = abilities.filter((candidate) => candidate.linkedTo && candidate.linkedTo !== '-' &&
      baseFor(candidate) === ability && !/\bSPECIALIST\b/i.test(candidate.description));
    if (replacements.length) {
      abilityProfile.splice(abilityProfile.length - 1, 0,
        '          <modifiers>',
        ...replacements.map((replacement) =>
          '            <modifier field="hidden" type="set" value="true"><conditions><condition childId="' +
          id('upgrade', selectionKey(replacement)) + '" field="selections" scope="unit" type="atLeast" value="1"/></conditions></modifier>'),
        '          </modifiers>');
    }
    if (ability.costS > 0 || ability.costL > 0 || (ability.linkedTo && ability.linkedTo !== '-')) {
      const selectionIndex=selectionKey(ability);
      const entryId = id('upgrade', selectionIndex);
      const upgrade = [
        '        <selectionEntry name="' + escapeXml(ability.optionGroup ?? ability.name) + '" id="' + entryId + '" hidden="false" import="true" type="upgrade">',
        '          <constraints><constraint id="' + id('upgrade-max', selectionIndex) + '" field="selections" scope="parent" shared="true" type="max" value="1"/></constraints>',
        '          <costs>', '    ' + cost('Minerals', ability.costS ?? 0), '    ' + cost('Gas', 0), '          </costs>',
        ...(reinforced && Number.isSafeInteger(ability.costL) && ability.costL !== (ability.costS ?? 0) ? [
          '          <modifiers>',
          '            <modifier field="' + minerals + '" type="set" value="' + ability.costL + '">',
          '              <comment>Reinforce Cost</comment>',
          '              <conditions><condition childId="' + id('reinforce') + '" field="selections" scope="unit" type="atLeast" value="1"/></conditions>',
          '            </modifier>', '          </modifiers>',
        ] : []),
        ...(ability.linkedTo && ability.linkedTo !== '-' ? [
          '          <modifiers>',
          ...abilities.filter((other) => selectionKey(other) !== selectionIndex && baseFor(other) && baseFor(other) === baseFor(ability))
            .map((other) => '            <modifier field="' + id('upgrade-max', selectionIndex) + '" type="set" value="0"><conditions><condition childId="' +
              id('upgrade', selectionKey(other)) + '" field="selections" scope="unit" type="atLeast" value="1"/></conditions></modifier>'),
          '          </modifiers>',
        ] : []),
        '          <profiles>', ...abilityProfile.map((line) => '    ' + line), '          </profiles>',
        '        </selectionEntry>',
      ];
      const previous=groupedUpgrades.get(selectionIndex);
      if(previous) {
        if(previous.costS!==ability.costS || previous.costL!==ability.costL || previous.base!==baseFor(ability)) return null;
        previous.lines.splice(previous.lines.indexOf('          </profiles>'),0,...abilityProfile.map(line=>'    '+line));
      } else {
        upgrades.push(upgrade);
        if(ability.optionGroup) {
          groupedUpgrades.set(selectionIndex,{costS:ability.costS,costL:ability.costL,base:baseFor(ability),lines:upgrade});
        }
      }
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
    '          <costs>', '    ' + cost('Minerals', large.cost - small.cost), '    ' + cost('Gas', 0),
    ...(costs.has(unitType) ? ['    ' + cost(unitType, small.supply - large.supply)] : []),
    '          </costs>', '        </selectionEntry>');
  return [
    '    <selectionEntry name="' + escapeXml(rosterName) + '" id="' + id('unit') + '" hidden="' + (unitType === 'Other') + '" import="true" type="unit">',
    '      <comment>Generated by update-official: ' + escapeXml(sourceId) + '</comment>',
    ...(tags.includes('Unique') && !unit._additionalParents?.length ? ['      <constraints><constraint id="' + id('unique') + '" field="selections" scope="roster" includeChildSelections="true" shared="true" type="max" value="1"/></constraints>'] : []),
    ...(unit._additionalParents?.length ? [
      '      <constraints><constraint id="'+id('additional-min')+'" automatic="true" field="selections" scope="roster" shared="true" type="min" value="0"/><constraint id="'+id('additional-max')+'" field="selections" scope="roster" shared="true" type="max" value="1"/></constraints>',
      '      <modifiers>',
      ...unit._additionalParents.flatMap(parent=>['hidden',id('additional-min')].map(field=>
        '        <modifier field="'+field+'" type="set" value="'+(field==='hidden'?'false':'1')+'"><conditions><condition childId="'+parent+'" field="selections" scope="roster" includeChildForces="true" includeChildSelections="true" shared="true" type="atLeast" value="1"/></conditions></modifier>')),
      '      </modifiers>',
    ] : []),
    '      <categoryLinks>', ...links, '      </categoryLinks>',
    '      <costs>', cost('Minerals', small.cost), cost('Gas', 0), ...(costs.has(unitType) ? [cost(unitType, -small.supply)] : []), '      </costs>',
    '      <profiles>', ...profile, '      </profiles>',
    '      <selectionEntries>', ...models, ...upgrades.flat(), '      </selectionEntries>',
    '    </selectionEntry>',
  ].join('\n').replace(/<\/modifiers>\s*<modifiers>/g, '');
}

export function addMissingUnits(xml, units, game, cards = []) {
  const names = new Set([...xml.matchAll(/^    <selectionEntry name="([^"]+)"/gm)].map(([, name]) => normalize(name)));
  const categories = new Map([...definitions(game, 'categoryEntry'), ...definitions(xml, 'categoryEntry')]);
  const missingTags=[...new Set(units.flatMap(unit=>typeof unit?.tags==='string'?unit.tags.split(',').map(tag=>tag.trim()).filter(Boolean):[]))].filter(tag=>!categories.has(tag));
  for(const tag of missingTags){const id=generatedId('category',tag);categories.set(tag,id);xml=appendEntries(xml,'categoryEntries',['    <categoryEntry name="'+escapeXml(tag)+'" id="'+id+'" hidden="false"/>']);}
  const entries = [];
  const sourceIds = new Set([...xml.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]));
  for (const unit of units) {
    if (!unit || typeof unit.name !== 'string' || !unit.name.trim()) {
      console.warn('  Review missing unit: invalid or missing name');
      continue;
    }
    const name = normalize(unit.name);
    const sourceId = generatedId(unit.faction, unit.sourceId, 'unit');
    if (sourceIds.has(sourceId)) {
      const pattern=new RegExp('^    <selectionEntry name="[^\"]+" id="'+sourceId+'"[^\\n]*\\n[\\s\\S]*?^    </selectionEntry>','m');
      const current=xml.match(pattern)?.[0];
      if(current?.includes('<comment>Generated by update-official:')) {
        const rebuilt=makeUnit({...unit,_additionalParents:additionalParents(unit,units,cards,xml)},game,categories);
        if(rebuilt) xml=xml.replace(pattern,()=>rebuilt.replace(/\n/g,xml.includes('\r\n')?'\r\n':'\n'));
        else console.warn('  Review generated unit: '+unit.name);
      }
      continue;
    }
    if (names.has(name) || names.has(aliases.get(name)) ||
        (name.startsWith('nova') && names.has('nova'))) continue;
    const parents = additionalParents(unit,units,cards,xml);
    const entry = makeUnit({...unit,_additionalParents:parents}, game, categories);
    if (!entry) {
      console.warn('  Review missing unit: ' + unit.name);
      continue;
    }
    names.add(name);
    names.add(aliases.get(name) ?? name);
    sourceIds.add(sourceId);
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

export function updateCatalog(xml, units, cards) {
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
        return ensureZeroCost(setEntryCost(entry, card.cost), minerals, 'Minerals');
      } catch (error) {
        console.warn('  Review tactical card ' + name + ': ' + error.message);
        return entry;
      }
    }
    byName.delete(key);
    try {
      let result = updateUpgradeCosts(updateAbilities(entry, row), row);
      result = ensureZeroCost(setEntryCost(result, row.base, minerals, 'Minerals'), gas, 'Gas');
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


export function addMissingCards(xml, cards, game) {
  const categories = new Map([...definitions(game, 'categoryEntry'), ...definitions(xml, 'categoryEntry')]);
  const costs = definitions(game, 'costType');
  const names = new Set([...xml.matchAll(/^    <selectionEntry name="([^"]+)"/gm)].map(m => normalize(m[1])));
  const entries = [];
  for (const card of cards) {
    const existingId=generatedId(card.faction,card.sourceId,'card','entry');
    const pattern=new RegExp('^    <selectionEntry name="[^"]+" id="'+existingId+'"[^\\n]*\\n[\\s\\S]*?^    </selectionEntry>','m');
    const current=xml.match(pattern)?.[0];
    if (names.has(normalize(card.name)) && !current?.includes('<comment>Generated card by update-official:')) continue;
    const primary = card.isFactionCard ? 'Faction' : (card.tags === 'Creep' ? 'Creep' : 'Tactical');
    if (!categories.has(primary) || !Array.isArray(card.boosts) || !Number.isSafeInteger(card.cost) || card.cost < 0) continue;
    const profiles = [];
    let valid = true;
    for (const boost of card.boosts) {
      // Native database boosts embed their activation and phase in the description.
      const embedded = /^.*?<(Active|Passive|Reaction)>\s*<(.*?)>:\s*([\s\S]*)$/i.exec(boost.description ?? '');
      const phase = boost.phase ?? embedded?.[2];
      const description = embedded?.[3] ?? boost.description;
      const activation = boost.activation ?? embedded?.[1] ?? '';
      if (typeof description !== 'string' || description.includes('\uFFFD')) { valid = false; break; }
      const profile = makeProfile(game, generatedId(card.faction,card.sourceId,'boost',boost.name,phase),boost.name,'Rules ('+phase+')',
        {Effect:description, Cost:activation.replace(/[<>]/g,'').replace(/\s+/g,' ')});
      if (!profile) { valid = false; break; }
      profiles.push(...profile);
    }
    if (!valid || !profiles.length) { console.warn('  Review missing card: '+card.name); continue; }
    const id = (...parts) => generatedId(card.faction,card.sourceId,'card',...parts);
    const values = [['Minerals',0],['Gas',card.cost],...Object.entries(card.slots ?? {}).filter(([label])=>costs.has(label)),
      [card.faction === 'Zerg' ? 'BM' : card.faction === 'Protoss' ? 'EN' : 'CP',card.resource ?? 0]];
    if (values.some(([,value])=>!Number.isSafeInteger(value) || value < 0)) continue;
    const generated=[
      '    <selectionEntry name="'+escapeXml(card.name)+'" id="'+id('entry')+'" hidden="false" import="true" type="upgrade">',
      '      <comment>Generated card by update-official: '+escapeXml(card.sourceId)+'</comment>',
      '      <categoryLinks><categoryLink name="'+primary+'" id="'+id('category')+'" primary="true" targetId="'+categories.get(primary)+'"/></categoryLinks>',
      ...(card.isUnique || card.isFactionCard ? ['      <constraints><constraint id="'+id('max')+'" field="selections" scope="roster" includeChildSelections="true" shared="true" type="max" value="1"/></constraints>'] : []),
      '      <costs>',...values.map(([name,value])=>'        <cost name="'+name+'" typeId="'+costs.get(name)+'" value="'+value+'"/>'),'      </costs>',
      '      <profiles>',...profiles,'      </profiles>','    </selectionEntry>',
    ].join('\n');
    if(current) xml=xml.replace(pattern,()=>generated.replace(/\n/g,xml.includes('\r\n')?'\r\n':'\n'));
    else {entries.push(generated);console.log('  Add card: '+card.name);}
    names.add(normalize(card.name));
  }
  return appendEntries(xml,'selectionEntries',entries);
}

function unitIdentity(unit) { return generatedId(unit.faction,unit.sourceId,'unit'); }
function abilityIdentity(unit,ability) { return generatedId(unit.faction,unit.sourceId,'upgrade',normalize(ability.name)+':'+normalize(ability.phase ?? '')); }

export function additionalParents(unit, units, cards, xml) {
  const existing = new Map([...xml.matchAll(/^    <selectionEntry name="([^"]+)" id="([^"]+)"/gm)].map(m=>[normalize(m[1]),m[2]]));
  const result=[];
  for (const parent of units) {
    if (parent.sourceId === unit.sourceId) continue;
    for (const ability of parent.upgrades ?? []) {
      const explicit = (unit.additionalFrom ?? []).some(link=>link.sourceId===parent.sourceId && (!link.ability || link.ability===ability.name));
      const summoned = [...(ability.description ?? '').matchAll(/SUMMON\s*\(([^)]+)\)/gi)].some(m=>normalize(m[1])===normalize(unit.name));
      if (!explicit && !summoned) continue;
      const optional = ability.costS>0 || ability.costL>0 || (ability.linkedTo && ability.linkedTo!=='-');
      if (optional && existing.has(normalize(parent.name)) && !xml.includes('id="'+abilityIdentity(parent,ability)+'"')) {
        // Hand-authored upgrade IDs are not derivable from the source. Resolve by name within its unit.
        const block=[...xml.matchAll(/^    <selectionEntry name="([^"]+)"[^\n]*\n[\s\S]*?^    <\/selectionEntry>/gm)].find(m=>normalize(m[1])===normalize(parent.name))?.[0];
        const match=block && [...block.matchAll(/<selectionEntry name="([^"]+)" id="([^"]+)"/g)].find(m=>normalize(m[1])===normalize(ability.name));
        if (!match) continue;
        result.push(match[2]);
      } else result.push(optional ? abilityIdentity(parent,ability) : existing.get(normalize(displayNames.get(normalize(parent.name)) ?? parent.name)) ?? unitIdentity(parent));
    }
  }
  for (const card of cards) if ((unit.additionalFrom ?? []).some(link=>link.sourceId===card.sourceId)) {
    result.push(existing.get(normalize(card.name)) ?? generatedId(card.faction,card.sourceId,'card','entry'));
  }
  return [...new Set(result)];
}

export function importRulebook(game, sections) {
  const rules=[];
  const children=node=>node.items ?? node.subItems ?? node.subSubItems ?? [];
  const text=node=>(node.content ?? []).filter(p=>p.type==='text' && typeof p.value==='string').map(p=>p.value).join('\n\n');
  const full=node=>[text(node),...children(node).map(child=>[child.title==='Ogólne' ? '' : child.title,full(child)].filter(Boolean).join('\n\n'))].filter(Boolean).join('\n\n');
  function walk(node,path,section) {
    if (typeof node.title!=='string') return;
    const title=node.title==='Ogólne' ? section.title+' — Introduction' : node.title;
    const content=full(node);
    if (content.trim() && !content.includes('\uFFFD')) rules.push({name:title,id:generatedId('rulebook',section.sourceId ?? section.title,...path),text:content});
    for(const child of children(node)) walk(child,[...path,child.title],section);
  }
  for (const section of [...sections].sort((a,b)=>(a.order??0)-(b.order??0))) {
    // Glossary is maintained by the existing glossary importer, including aliases.
    if (!section.title?.includes('KEYWORD GLOSSARY')) walk(section,[section.title],section);
  }
  const find=title=>rules.find(r=>r.name===title)?.text;
  for(const [name,chapter] of [['Flamer Template (FT)','8.7.6 Template Weapons'],['Blast Template (BT)','8.7.6 Template Weapons'],
    ['Rate of Attack (RoA)','5.1 Unit Cards'],['Surge Dice and Surge Results','8.7.4 Ranged Attack Resolution']]) {
    const value=find(chapter); if(value)rules.push({name,id:generatedId('rulebook-topic',name),text:chapter+'\n\n'+value});
  }
  const pending=[];
  for(const rule of rules) {
    const description=formatWording(rule.text,game);
    const pattern=new RegExp('(<rule name="[^"]*" id="'+rule.id+'"[^>]*>[\\s\\S]*?<description>)[\\s\\S]*?(</description>)');
    if(pattern.test(game)) game=game.replace(pattern,(_,opening,closing)=>(opening.includes('Official rulebook section') ? opening : opening.replace(/>\s*<description>$/, '>\n      <comment>Official rulebook section</comment>\n      <description>'))+description+closing);
    else pending.push('    <rule name="'+escapeXml(rule.name)+'" id="'+rule.id+'" hidden="false">\n      <comment>Official rulebook section</comment>\n      <description>'+description+'</description>\n    </rule>');
  }
  return appendEntries(game,'sharedRules',pending);
}

export function linkRulebook(xml,game) {
  const profiles=new Map([...game.matchAll(/<profile name="[^"]+" id="([^"]+)"[^>]*>[\s\S]*?<\/profile>/g),...xml.matchAll(/<profile name="[^"]+" id="([^"]+)"[^>]*>[\s\S]*?<\/profile>/g)].map(m=>[m[1],m[0]]));
  const rules=[...game.matchAll(/<rule name="([^"]+)" id="([^"]+)"[^>]*>([\s\S]*?)<\/rule>/g)].map(m=>({name:m[1],id:m[2],body:m[3]}));
  const links=(entry,selected,key)=>{
    const existing=new Set([...entry.matchAll(/<infoLink[^>]*targetId="([^"]+)"/g)].map(m=>m[1]));
    const lines=selected.filter(r=>!existing.has(r.id)).map(r=>'        <infoLink name="'+r.name+'" id="'+generatedId('reference-link',key,r.id)+'" hidden="false" targetId="'+r.id+'" type="rule"/>');
    if(!lines.length)return entry;
    const newline=xml.includes('\r\n')?'\r\n':'\n';
    const additions=lines.join(newline);
    if(/^      <\/infoLinks>/m.test(entry))return entry.replace(/^      <\/infoLinks>/m,additions+newline+'      </infoLinks>');
    return entry.replace(/\r?\n    <\/selectionEntry>$/,newline+'      <infoLinks>'+newline+additions+newline+'      </infoLinks>'+newline+'    </selectionEntry>');
  };
  const topics=[['Flamer Template (FT)',/\bflamer templates?\b|\bFT\b/i],['Blast Template (BT)',/\bblast templates?\b|\bBT\b/i],
    ['Rate of Attack (RoA)',/\bRoA\b|\brate of attack\b/i],['Surge Dice and Surge Results',/\bsurge\b/i]];
  xml=xml.replace(/^    <selectionEntry name="([^"]+)" id="([^"]+)"[^\n]*\n[\s\S]*?^    <\/selectionEntry>/gm,(entry,name,id)=>{
    entry=entry.replace(/^        <infoLink name="[^"]+" id="([^"]+)"[^>]*targetId="([^"]+)"[^>]*\/>\r?\n/gm,(link,linkId,target)=>linkId===generatedId('reference-link',id,target)?'':link);
    const referenced=[...entry.matchAll(/<infoLink[^>]*targetId="([^"]+)"[^>]*type="profile"/g)].map(m=>profiles.get(m[1]) ?? '').join('\n');
    const source=entry+referenced;
    const text=ruleText(source.replace(/<infoLinks>[\s\S]*?<\/infoLinks>/g,'').replace(/<[^>]*>/g,' '));
    const selected=rules.filter(r=>!r.body.includes('Official rulebook section') && !/^\d|^PART | — Introduction/.test(r.name) &&
      r.name.length>=4 && new RegExp('\\b'+r.name.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&').trim()+'\\b','i').test(text));
    for(const [name,pattern]of topics)if(pattern.test(text) || (['Rate of Attack (RoA)','Surge Dice and Surge Results'].includes(name) && /typeName="(?:Assault|Combat) Weapon"/.test(source))){const rule=rules.find(r=>r.name===name);if(rule)selected.push(rule);}
    return links(entry,[...new Map(selected.map(r=>[r.id,r])).values()],id);
  });
  const referenceId=generatedId('rulebook-reference',xml.match(/<catalogue[^>]* id="([^"]+)"/)?.[1] ?? 'catalogue');
  const pattern=new RegExp('^    <selectionEntry name="Rules Reference" id="'+referenceId+'"[^\\n]*\\n[\\s\\S]*?^    </selectionEntry>','m');
  const reference=links('    <selectionEntry name="Rules Reference" id="'+referenceId+'" hidden="false" import="true" type="upgrade">\n      <categoryLinks><categoryLink name="Pre-Game" id="'+generatedId(referenceId,'category')+'" primary="true" targetId="9b82-d933-7075-8237"/></categoryLinks>\n    </selectionEntry>',rules,referenceId);
  return pattern.test(xml)?xml.replace(pattern,()=>reference):appendEntries(xml,'selectionEntries',[reference]);
}

async function main() {
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
const originals = new Map();
const catalogs = [];
const game = join(root, 'Starcraft The Miniature Game.gst');
const previousRules = await readFile(game, 'utf8');
originals.set(game,previousRules);
for (const [faction, filename] of Object.entries(factions)) {
  console.log(faction);
  const file = join(root, filename);
  const before = await readFile(file, 'utf8');
  originals.set(file,before);
  const units = official.army_units.filter((unit) => unit.faction === faction);
  const cards = official.tactical_cards.filter((card) => card.faction === faction);
  if (!units.length || !cards.length) throw new Error('Incomplete Command Center data for ' + faction);
  const after = addMissingCards(addMissingUnits(updateStats(updateCatalog(before, units, cards), units), units, previousRules, cards),cards,previousRules);
  catalogs.push(after);
  if (after !== before) changes.push({ file, after });
}
const nextRules = importRulebook(addMissingRules(updateGlossary(previousRules, official.rules_sections), official.rules_sections, catalogs),official.rules_sections);
for (let i=0;i<catalogs.length;i++) {
  const file=join(root,Object.values(factions)[i]);
  const after=linkRulebook(catalogs[i],nextRules);
  const existing=changes.find(change=>change.file===file);
  if(existing)existing.after=after;
  else if(after!==catalogs[i])changes.push({file,after});
}
if (nextRules !== previousRules) changes.push({ file: game, after: nextRules });

for(let index=changes.length-1;index>=0;index--) if(changes[index].after===originals.get(changes[index].file)) changes.splice(index,1);
for (const { file, after } of changes) {
  console.log((apply ? 'Updating ' : 'Would update ') + basename(file));
  if (apply) await writeFile(file, after);
}
console.log((apply ? 'Updated ' : 'Would update ') + changes.length + ' file(s). Review generated entries and unsupported fields before publishing.');

}

if (process.argv[1] && await realpath(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) await main();
