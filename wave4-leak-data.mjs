// Card transcription: https://www.reddit.com/r/StarCraftTMG/comments/1xx27yt/wave_4_cards_spoilers/?i=2
// Front: https://i.redd.it/gof1vsu4gt1i1.jpeg
// Back: https://i.redd.it/t06aluu4gt1i1.png
// Simulated database record. Prices and starting model counts are test assumptions.
export const firebat = {
  sourceId: 'firebat', id: 'firebat', name: 'Firebat', faction: 'Terran', unitType: 'Core',
  tags: 'Armoured, Biological, Ground', keywords: '',
  stats: { shield: '-', speed: '4/7', armor: '5+', evade: '6+', hp: '3', size: '2' },
  small: { models: 3, supply: 1, cost: 150 }, large: { models: 6, supply: 2, cost: 250 },
  squadProfile: [{ tier: 1, modelCount: '1 - 2', supply: 0 }, { tier: 2, modelCount: '3 - 4', supply: 1 }, { tier: 3, modelCount: '5 - 6', supply: 2 }],
  upgrades: [
    { name: 'Stimpack', phase: 'Movement Phase', activation: '<Active>\n(1 Command Point)', costS: 0, costL: 0, linkedTo: '',
      description: 'This Unit suffers NON-LETHAL DAMAGE (2). This Unit gains BUFF Speed (3), its Perdition Flamethrower, and all Close Combat Weapons gain PRECISION (3).' },
    { name: 'Perdition Flamethrower', phase: 'Assault Phase', activation: '', costS: 0, costL: 0, linkedTo: '-',
      description: 'RANGE: 8 | TARGET: Ground | RoA: 2 | HIT: 3+ | DMG: 1\nSURGE: Light (D3)\n\nANTI-EVADE (1), INSTANT' },
    { name: 'Fire It Up', phase: 'Assault Phase', activation: '<Passive>', costS: 0, costL: 0, linkedTo: '',
      description: 'When this Unit makes a Ranged Attack with its Perdition Flamethrower, you may choose 1 model in this Unit to attack using a Flamer Template (FT) instead of rolling its regular Rate of Attack (RoA). If this Unit’s Current Supply Value is 2, you may choose up to 2 models to attack using Flamer Templates instead.' },
    { name: 'Flame Strike', phase: 'Combat Phase', activation: '', costS: 0, costL: 0, linkedTo: '-',
      description: 'RANGE: E | TARGET: Ground | RoA: 2 | HIT: 3+ | DMG: 1\nSURGE: Light (D3)' },
    { name: 'Incinerator Gauntlets', phase: 'Movement Phase', activation: '<Active>\n(1 Command Point)', costS: 20, costL: 20, linkedTo: '',
      description: 'Set a Fire Wall token Within 4" in an unoccupied space. If a Unit’s Leading Model’s path of travel passes through this token, or if any model in a Unit ends either a Move, Deploy, Run, Charge, Disengage, or Close Ranks action, or is Set Within 1" of this token, remove the Fire Wall token from the battlefield before executing that move. If you do, that Unit suffers HITS 5 (1). If that Unit performed a Charge action, it cannot resolve the IMPACT effect.' },
    { name: 'Need a Light?', phase: 'Combat Phase', activation: '<Passive>', costS: 30, costL: 30, linkedTo: '',
      description: 'When this Unit makes a Close Combat Attack with its Flame Strike, you may choose 1 model in this Unit to attack using a Flamer Template (FT) instead of rolling its regular Rate of Attack (RoA).' },
  ],
};

// Transcribed from assets/rule-leaks/wave-4-2026-11-15; prices and unconfirmed starting sizes are simulated.
const ability = (name, phase, description, activation = '<Passive>', cost = 0) => ({name, phase, description, activation, costS:cost, costL:cost, linkedTo:''});
const weapon = (name, phase, range, target, roa, hit, damage, surge='-', dice='', keywords='', cost=0, linkedTo='-') => ({
  ...ability(name,phase,`RANGE: ${range} | TARGET: ${target} | RoA: ${roa} | HIT: ${hit} | DMG: ${damage}\nSURGE: ${surge}${dice ? ` (${dice})` : ''}${keywords ? `\n\n${keywords}` : ''}`,'',cost),linkedTo});
const unit = (name,faction,unitType,stats,tags,models,supply,cost,upgrades,large) => ({
  sourceId:name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_$/,''),name,faction,unitType,
  stats:Object.fromEntries(['shield','speed','armor','evade','hp','size'].map((key,i)=>[key,String(stats[i])])),
  tags,small:{models,supply,cost},large,upgrades,squadProfile:[{modelCount:`1 - ${models}`,supply}],
});
const commander=ability('Commander','Any Phase','Treat this Unit’s Supply characteristic as increased by 1 for Controlling and Contesting Mission Markers, completing objectives, and resolving Disengage checks.');
const structure=ability('Structure','Any Phase','This Unit cannot be Activated in any Phase and cannot perform actions. Its Current Supply Value is treated as 0, and it can never Control or Contest Mission Markers, ignoring the standard Zero Supply Exception. This Unit cannot be a target of an ability, unless stated otherwise.');
const scarabRules=[
  ability('Timed Life','Any Phase','Remove this Unit at the End of the Round.'),
  ability('Nimble','Any Phase','This Unit is always eligible to use Evade Rolls against Attacks or Special Abilities.'),
  ability('Proximity Detonation','Assault Phase','When an Enemy Ground Unit ends its Activation Within 2" of this Unit, this Unit immediately performs a Close Combat Attack against that Enemy Unit. Immediately after this Close Combat Attack is resolved, remove this Unit from the battlefield.'),
  ability('Explosive Charge','Assault Phase','Immediately after this Unit completes a successful Charge, it performs a Close Combat Attack against one of the targets of that Charge. Immediately after this Close Combat Attack is resolved, remove this Unit from the battlefield.'),
];
const scarabs=[
  unit('Scarab','Protoss','Other',[1,3,'6+','3+',2,1],'Psionic, Ground',1,0,0,[...scarabRules,weapon('Scarab Detonation','Combat Phase','E','Ground',12,'2+',1,'-','','CRITICAL HIT (2)')]),
  unit('Solarite Scarab','Protoss','Other',[1,5,'6+','3+',2,1],'Psionic, Ground',1,0,0,[...scarabRules,weapon('Solarite Blast','Combat Phase','E','Ground',5,'2+',2,'-','','CRITICAL HIT (2), INSTANT')]),
  unit('Phasing Scarab','Protoss','Other',[1,3,'6+','3+',2,1],'Psionic, Ground',1,0,0,[...scarabRules,weapon('Phase Blast','Combat Phase','E','Ground',6,'2+',1,'Armoured','D3','CRITICAL HIT (2), PIERCE Armoured (2)')]),
];
const reaver=unit('Reaver','Protoss','Elite',[6,6,'5+','-',8,4],'Armoured, Mechanical, Ground',1,2,250,[
  ability('Large','Any Phase','When this Unit’s Leading Model moves, it cannot pass through physical gaps smaller than 3" wide, regardless of its size. If the Leading Model’s path of travel passes through, or any model in this Unit ends its movement on a Size 0 or Size 1 Impassable Terrain piece (excluding Tokens) during any movement action, that terrain piece is immediately removed from the game.'),
  ability('Limited Artificial Intelligence','Any Phase','If this Unit is a parent to any SUMMONED Unit, it cannot SUMMON another one.'),
  ability('Microfactory','Movement Phase','This Unit’s Scarab Special Ability can be used this Round even if it was already used.','<Active> (2 Psionic Energy)'),
  ability('Scarab','Movement Phase','Once per Game. Resolve the SUMMON (Scarab) effect. Then, the Scarab may immediately perform a Move action.','<Active> (0 Psionic Energy)'),
  ability('Siege Triangulation','Assault Phase','Move a Scarab, Solarite Scarab or Phasing Scarab created by this Unit up to 5".','<Active> (1 Psionic Energy)'),
  ability('Indomitable','Assault Phase','While Engaged, this Unit may target and be targeted by Unengaged Enemy Units. In both cases, the defending Unit gains an Evade Roll against those attacks.'),
  weapon('Crawl Over','Combat Phase','E','Ground',2,'2+',1),
  ...['Solarite Scarab','Phasing Scarab'].map((name,i)=>ability(name,'Movement Phase',`Once per Game. Resolve the SUMMON (${name}) effect. Then, the ${name} may immediately perform a Move action.`,'<Active> (0 Psionic Energy)',20+i*10)),
  ability('Shuttle','Movement Phase','Once per Game. This ability can be used while this Unit is in Reserves. Set a Faction Indicator anywhere on the battlefield more than 10" away from any Enemy model. At the End of the Round, the controlling player may Deploy this Unit in base-to-base contact with this Faction Indicator. This Unit’s Activation ends.','<Active> (0 Psionic Energy)',40),
]);
const alarak=unit('Alarak','Protoss','Hero',[3,7,'4+','5+',6,2],'Unique, Biological, Psionic, Ground',1,1,250,[commander,
  ability('Sacrifice','Any Phase','When this Unit receives Damage, target another Friendly Biological Unit Within 8". The targeted Unit suffers 2 Damage, and the Damage received by this Unit is reduced by 2 (when Empowered, reduced by 3).','<Reaction> (1 Psionic Energy)'),
  ability("Highlord of the Tal’darim",'Any Phase','Calculate the total lost Supply of all Friendly Units (a Unit’s lost Supply is its Initial Supply Value minus its Current Supply Value). While this total is:\n- 2 or more: When this Unit resolves IMPACT, it generates 3 additional IMPACT dice.\n- 4 or more: This Unit’s weapons gain INSTANT.\n- 6 or more: This Unit’s abilities are Empowered.'),
  ability('Wrath of the Highlord','Assault Phase','Target another Friendly Biological Unit Within 8". The targeted Unit suffers 2 Damage, and this Unit performs a 4" Run Action (when Empowered, perform a 6" Run Action).','<Active> (0 Psionic Energy)'),
  ability('Empower Me','Assault Phase','Target another Friendly Biological Unit Within 8". The targeted Unit suffers 2 Damage, and this Unit’s Bane Blades get BUFF RoA (4) (when Empowered, BUFF RoA (6)).','<Active> (0 Psionic Energy)'),
  ability('Destruction Wave','Assault Phase','Target another Friendly Biological Unit Within 8". The targeted Friendly Unit suffers 2 Damage. Then target an Enemy Unit Within 8" of this Unit. The targeted Enemy Unit suffers HITS 4 (1) (when Empowered, HITS 6 (1)).','<Active> (0 Psionic Energy)'),
  ability('Devastating Charge','Assault Phase','Immediately after this Unit completes a successful Charge, resolve the IMPACT (6) 4+ effect.'),
  weapon('Bane Blades','Combat Phase','E','Ground',6,'2+',1,'Light, Armoured','D3+1'),
]);
const slayer=unit('Slayer (Stalker)','Protoss','Elite',[3,'4/8','4+','6+',6,3],"Armoured, Mechanical, Ground",1,1,150,[
  ability('Squadron','Any Phase','This Unit’s Horizontal Coherency is 4".'),
  ability('Seek Bloodshed','Any Phase','When the Current Supply Value of another Friendly Unit Within 12" of this Unit is reduced, this Unit, if Unengaged, may perform a Move action Directly Towards that Friendly Unit.','<Reaction> (1 Psionic Energy)'),
  ability('Bloodshard Blink','Any Phase','Immediately before this Unit resolves any PLACE effect, you may target one Enemy Unit. This Unit’s weapons gain BUFF RoA (1) against the targeted Unit, but this Unit must perform PLACE Directly Towards the chosen Unit.'),
  ability('Blink','Movement Phase','Resolve the PLACE (6) effect. Models set by this effect cannot be set up Within the Engagement Range of any Enemy Unit.','<Active> (1 Psionic Energy)'),
  weapon('Particle Disruptors','Assault Phase',12,'All',4,'3+',2,'Armoured','D3'),weapon('Stomp','Combat Phase','E','Ground',2,'5+',1),
],{models:2,supply:2,cost:250});
slayer.squadProfile=[{modelCount:'1 - 1',supply:1},{modelCount:'2 - 2',supply:2}];
const pylon=unit("Tal’darim Pylon",'Protoss','Other',[2,'-','5+','-',6,3],'Unique, Armoured, Ground',1,0,0,[structure,
  ability('Bloodshard Monument','Any Phase','When the Current Supply Value of a Unit Within 8" is reduced, return one non-Unique Exhausted Tactical Card to the Ready state.'),
  ability('Warp Conduit','Any Phase','Once per Round, the controlling player may deploy a Ground Unit from Reserves using this Pylon base as the Entry Edge. This Unit’s Activation ends.'),
  weapon('Overcharged Pylon','Assault Phase',8,'All',3,'3+',1,'-','','PIERCE Armoured (2), PINPOINT'),
  ability('Overwatch','Assault Phase','When an Enemy Unit ends its Activation Within 8", this Unit immediately performs a Ranged Attack against that Enemy Unit.','<Reaction> (1 Psionic Energy)'),
]);
pylon.additionalFrom=[{sourceId:'tal_darim'}];
const live=ability('Live for the Swarm!','Any Phase','When this Unit attacks an Enemy Unit with the INFESTATION Status or a Unit Within 6" of any Source of Creep or Creep Tumor, its Infested C-14 Rifle and all Close Combat Attacks gain PRECISION (2).');
const detonation=ability('Detonation','Any Phase','Immediately before any models in this Unit are Destroyed, Enemy Units Within 2" suffer HITS (1) 1 for each model in this Unit that will be Destroyed.');
const spread=ability('Spread Infestation','Movement Phase','Target an Enemy Unit Within 8". The targeted Unit gains the INFESTATION Status. For the purposes of resolving Special Abilities, this effect is treated as a DEBUFF.','<Active> (1 Biomass)');
const devastating=ability('Devastating Charge','Assault Phase','Immediately after this Unit completes a successful Charge, resolve the IMPACT (2) 4+ effect.');
const rifle=weapon('Infested C-14 Rifle','Assault Phase',12,'All',2,'4+',1,'Light','D3','BURST FIRE 6" (2)');
const plague=ability('Plagued Munitions','Assault Phase','Immediately after an attack with the Infested C-14 Rifle, if the attacked Unit suffered Damage, it also suffers NON-LETHAL DAMAGE (1).','<Passive>',30);
const ambush=ability('Burrow Ambush','Movement Phase','When this Unit is nominated to deploy from the Reserves, it may resolve the PLACE (18) effect from the controlling player’s Entry Edge. No model may be set Within 10" of any Enemy model. This Unit’s Activation ends.','<Passive>',20);
const marines=unit('Infested Marine','Zerg','Core',['-','3/6','4+','6+',2,2],'Biological, Infested, Ground',3,1,150,[live,detonation,devastating,rifle,weapon('Strike','Combat Phase','E','Ground',1,'5+',1),ambush,
  weapon('Infested Missile Launcher - Acid Blast','Assault Phase',6,'All',3,'3+',1,'-','','CRITICAL HIT (1), LONG RANGE (12"), PIERCE Armoured (2), SPECIALIST',20,'Infested C-14 Rifle'),
  weapon('Infested Missile Launcher - Scourgeshot','Assault Phase',12,'All',3,'3+',1,'-','','BURST FIRE 6" (2), SPECIALIST',20,'Infested C-14 Rifle'),plague,
  weapon('Wild Mutation','Combat Phase','E','Ground',2,'3+',1,'Armoured','D3+1','',40,'Infested C-14 Rifle'),
],{models:6,supply:2,cost:250});
marines.squadProfile=[{modelCount:'1 - 3',supply:1},{modelCount:'4 - 6',supply:2}];
for(const upgrade of marines.upgrades) if(upgrade.name.startsWith('Infested Missile Launcher -')) upgrade.optionGroup='Infested Missile Launcher';
const troopers=unit('Infested Trooper (Infested Marine)','Zerg','Core',['-','3/6','4+','6+',2,2],'Biological, Infested, Light, Ground',1,1,100,[live,detonation,{...ambush,costS:0,costL:0},spread,devastating,{...plague,costS:0,costL:0},
  {...rifle,description:rifle.description.replace('HIT: 4+','HIT: 3+')},weapon('Bayonet','Combat Phase','E','Ground',2,'5+',1)
],{models:3,supply:2,cost:180});
troopers.squadProfile=[{modelCount:'1 - 1',supply:1},{modelCount:'2 - 3',supply:2}];
const stukov=unit('Stukov','Zerg','Hero',['-',7,'4+','6+',10,2],'Unique, Biological, Infested, Ground',1,1,250,[commander,spread,
  ability('Admiral of the Infested','Movement Phase','Target an Enemy Unit Within 8" that has the INFESTATION Status. That Unit counts as Activated in this Phase (set an Activation Marker next to it) and remove the INFESTATION Status from that Unit. You may target any non-Unique Friendly Unit with the Infested Combat Tag that is Within 8" of the previously targeted Enemy Unit. Remove the Activation Marker from that targeted Friendly Unit.','<Active> (1 Biomass)'),
  weapon('Corrosive Blast','Assault Phase',10,'Ground',3,'3+',1,'Light, Armoured','D3'),
  ability('Corrode Armor','Assault Phase','Immediately after this Unit resolves a Ranged Attack against an Enemy Unit, the target Unit gains the DEBUFF Armour (1).','<Reaction> (1 Biomass)'),
  ability('Devastating Charge','Assault Phase','Immediately after this Unit completes a successful Charge, resolve the IMPACT (6) 4+ effect.'),
  weapon('Infested Arm','Combat Phase','E','Ground',3,'3+',1,'Armoured','D3'),
  ability('Plague Warden','Any Phase','Treat the Supply characteristic of any Enemy Unit that has the INFESTATION Status and is Within 6" as reduced by 1 (to a minimum of 0) for Controlling and Contesting Mission Markers, and completing objectives.','<Passive>',20),
  ability('Bio-Kill Switch','Assault Phase','Each Enemy Unit with the INFESTATION Status on the Battlefield suffers Damage (2). Immediately after this Special Ability is resolved, remove the INFESTATION Status from Units that suffered Damage.','<Active> (0 Biomass)',30),
]);
const turret=unit('Infested Missile Turret','Zerg','Support',['-','-','5+','-',8,3],'Unique, Armoured, Biological, Infested, Ground',1,1,100,[
  ability('Detection','Any Phase','While Enemy Units are Within 8" of this Unit, they lose the HIDDEN Status.'),
  ability('Infestation','Any Phase','When the Supply of an Enemy Unit with the INFESTATION Status is reduced to 0, or when that Unit is Destroyed, you can apply the INFESTATION Status to another Enemy Unit Within 8" of that Unit. For the purposes of resolving Special Abilities, this effect is treated as a DEBUFF.'),
  ability('Source of Creep','Any Phase','A Friendly or Enemy Ground Zerg Unit Within 6" of this Unit counts as being ON CREEP.'),structure,
  weapon('Firefly Missiles','Assault Phase',16,'Flying',8,'4+',1,'Light, Armoured','D3','ANTI-EVADE (1)'),
  ability('Ocular Overwatch','Assault Phase','When an Enemy Flying Unit ends its Activation Within 14", this Unit immediately performs a Ranged Attack against that Enemy Unit.','<Reaction> (1 Biomass)'),
]);
export const leakUnits=[firebat,reaver,...scarabs,alarak,slayer,pylon,marines,troopers,stukov,turret];
const card=(name,faction,boosts,cost=30,resource=0,isFactionCard=false,tags='')=>({sourceId:name.toLowerCase().replace(/[^a-z0-9]+/g,'_'),name,faction,boosts,cost,resource,isFactionCard,isUnique:true,tags,slots:isFactionCard?{Core:3,Elite:1,Support:1,Hero:1}:{Core:0,Elite:0,Support:0,Hero:0},factionTags:[]});
const creep=ability('Stukov’s Creep','Any Phase','If an Enemy Unit ends a Move, Deploy, Run, Charge or Disengage action Within 1" of a Friendly Creep Tumor token, remove that token from the battlefield. Creep Tumor tokens have STAY IN PLAY and DISPLACEMENT.');
export const leakCards=[
  card('Tal’darim','Protoss',[
    ability('Chain of Ascension','Any Phase','Calculate the total lost Supply of all Friendly Units. While this total is:\n- 4 or more: All your Units’ first used weapons gain PRECISION (1).\n- 6 or more: All your Units’ first used weapons gain CRITICAL HIT (1).'),
    ability('Proxy Pylon','Movement Phase','If there is no Friendly Tal’darim Pylon on the battlefield, set a Friendly Tal’darim Pylon Unit anywhere on the GROUND LEVEL of the battlefield more than 10" away from any Enemy model. This Round, the Tal’darim Pylon is not eligible to use its Special Abilities (excluding Structure).','<Active>'),
  ],0,1,true),
  card('Robotics Support Bay','Protoss',[ability('Master of Robotics','Movement Phase','The active Mechanical Unit resolves the HEAL (2) effect.','<Active>')],30,1),
  card('Infested Command Center','Zerg',[
    ability('Parasitic Bio-Toxins','Movement Phase','Immediately after a Friendly Infested Unit ends their action Within 8" of an Enemy Unit, that Enemy Unit gains the INFESTATION Status; this effect is treated as a DEBUFF.','<Reaction>'),
    ability('Scanner Sweep','Movement Phase','Set a Faction Indicator anywhere on the battlefield. While Enemy Units are Within 6" of this Faction Indicator, they lose the HIDDEN Status.','<Active>'),
  ],30,1),
  card('Weighted Pustule','Zerg',[ability('Fetid Touch','Any Phase','While an Enemy Unit has the INFESTATION Status, it cannot resolve the PLACE and set effects and cannot be returned to Reserves.'),creep],0,0,false,'Creep'),
  card('Hungering Infestation','Zerg',[ability('Growing Infestation','Any Phase','While an Enemy Unit has the INFESTATION Status, it is not eligible to use or to be targeted by any Enemy Reaction Special Ability, except Restoration.'),creep],10,0,false,'Creep'),
  card('Healing Pathogen','Zerg',[ability('Universal Carrier','Any Phase','While an Enemy Unit has the INFESTATION Status, immediately after its Supply is reduced or it is destroyed, target any Friendly Biological Unit Within 12". This Friendly Unit resolves the HEAL (2) effect.'),creep],10,0,false,'Creep'),
  card('Infested Barracks','Zerg',[ability('For the Swarm!','Movement Phase','The active Biological Ground Unit performs a 2" Move action. This does not count towards its action limit.','<Active>')],30,1),
  card('Hive','Zerg',[ability('Brutal Instinct','Movement Phase','Immediately after an Enemy Unit ends its Activation Within 12" of a Friendly Ground Unit, that Friendly Unit gains or loses the BURROWED Status.','<Reaction>'),ability('Creep Spread','Movement Phase','Set a Creep Tumor token on the battlefield Within 6" (Line of Sight is not required) of either a Friendly Entry Edge or an existing Friendly Creep Tumor token.','<Active>')],40,1),
];
