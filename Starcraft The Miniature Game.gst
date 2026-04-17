<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gameSystem id="sys-ce49-e853-2fea-6af1" name="Starcraft The Miniature Game" battleScribeVersion="2.03" revision="1" type="gameSystem" xmlns="http://www.battlescribe.net/schema/gameSystemSchema">
  <costTypes>
    <costType name=" Minerals" id="5bcf-897a-a5c9-d0e8" defaultCostLimit="2000"/>
    <costType name="  Gas" id="1719-6214-392e-e53f" defaultCostLimit="200"/>
    <costType name="   Core" id="472f-46af-8e02-bfbf" defaultCostLimit="0" hidden="true">
      <modifiers>
        <modifier type="set" value="false" field="hidden">
          <comment>Required so it does not show on list creation</comment>
        </modifier>
      </modifiers>
    </costType>
    <costType name="    Elite" id="f5f9-3591-0f2d-0a53" defaultCostLimit="0" hidden="true">
      <modifiers>
        <modifier type="set" value="false" field="hidden">
          <comment>Required so it does not show on list creation</comment>
        </modifier>
      </modifiers>
    </costType>
    <costType name="     Support" id="31a6-c1f1-3d47-fa76" defaultCostLimit="0" hidden="true">
      <modifiers>
        <modifier type="set" value="false" field="hidden">
          <comment>Required so it does not show on list creation</comment>
        </modifier>
      </modifiers>
    </costType>
    <costType name="     Hero" id="7e61-585f-b715-85e0" defaultCostLimit="0" hidden="true">
      <modifiers>
        <modifier type="set" value="false" field="hidden">
          <comment>Required so it does not show on list creation</comment>
        </modifier>
      </modifiers>
    </costType>
  </costTypes>
  <profileTypes>
    <profileType name="Unit" id="18be-d8b9-8024-4925" hidden="false" kind="model" sortIndex="1">
      <characteristicTypes>
        <characteristicType name="Shd" id="4301-e83c-7226-741a">
          <formatRules>
            <formatRule name="New Format Rule" id="7974-0f81-9640-c1e0" hidden="false" type="regex" match="^$" replace="-">
              <comment>Empty → -</comment>
            </formatRule>
          </formatRules>
        </characteristicType>
        <characteristicType name="Spd" id="1b39-d395-b125-7ea9"/>
        <characteristicType name="Eva" id="bc5e-a9b9-f09d-8dec"/>
        <characteristicType name="Arm" id="08b0-2471-8408-9222"/>
        <characteristicType name="HP" id="e275-f946-72ee-4a48"/>
        <characteristicType name="Size" id="357b-9a74-5a55-800e" defaultValue="
"/>
      </characteristicTypes>
    </profileType>
    <profileType name="Assault Weapon" id="e8b6-5b29-e80c-a3b3" hidden="false" kind="weapon" sortIndex="2">
      <characteristicTypes>
        <characteristicType name="Rng" id="ebd0-74ec-d612-eac2"/>
        <characteristicType name="Tgt" id="ca62-f052-a905-5e3f"/>
        <characteristicType name="RoA" id="6594-a81b-03da-75a1"/>
        <characteristicType name="Hit" id="f193-00c0-1dbe-ecba"/>
        <characteristicType name="Surge" id="89cf-90ae-fc8c-167a">
          <formatRules>
            <formatRule name="New Format Rule" id="1cfd-db88-3efc-3d5b" hidden="false" type="regex" match="^$" replace="-">
              <comment>Empty → -</comment>
            </formatRule>
          </formatRules>
        </characteristicType>
        <characteristicType name="S.Die" id="3779-8372-ef25-255d">
          <formatRules>
            <formatRule name="New Format Rule" id="8846-7447-a110-6d45" hidden="false" type="regex" match="^$" replace="-">
              <comment>Empty → -</comment>
            </formatRule>
          </formatRules>
        </characteristicType>
        <characteristicType name="Dmg" id="a082-2247-4a81-d1e2"/>
        <characteristicType name="Keyword" id="454d-a5c1-6c5e-8a4e">
          <formatRules>
            <formatRule name="New Format Rule" id="8663-420a-0dff-1b63" hidden="false" type="regex" match="^$" replace="-">
              <comment>Empty → -</comment>
            </formatRule>
          </formatRules>
        </characteristicType>
      </characteristicTypes>
    </profileType>
    <profileType name="Rules (Movement Phase)" id="ec1d-63b8-de26-1894" hidden="false" kind="ability">
      <characteristicTypes>
        <characteristicType name="Effect" id="1c06-5502-fb5a-616e" kind="longText"/>
        <characteristicType name="Cost" id="e11e-d579-0142-8de4" kind="annotation"/>
      </characteristicTypes>
    </profileType>
    <profileType name="Rules (Any Phase)" id="a305-fb8b-8be3-f0fe" hidden="false" kind="ability" sortIndex="4">
      <characteristicTypes>
        <characteristicType name="Effect" id="616e-c7be-abff-a2bf" kind="longText"/>
        <characteristicType name="Cost" id="1696-5ea7-559b-bb8b" kind="annotation"/>
      </characteristicTypes>
    </profileType>
    <profileType name="Rules (Assault Phase)" id="07ee-ef54-fbf7-5ca9" hidden="false" kind="ability">
      <characteristicTypes>
        <characteristicType name="Effect" id="97a6-bd65-3d58-17e9" kind="longText"/>
        <characteristicType name="Cost" id="06d2-1c49-1cfc-44f5" kind="annotation"/>
      </characteristicTypes>
    </profileType>
    <profileType name="Rules (Combat Phase)" id="f61d-0471-085d-248c" hidden="false" kind="ability">
      <characteristicTypes>
        <characteristicType name="Effect" id="b94b-6a13-1240-6b8b" kind="longText"/>
        <characteristicType name="Cost" id="6f0c-b621-2f03-fe52" kind="annotation"/>
      </characteristicTypes>
    </profileType>
    <profileType name="Combat Weapon" id="7b96-11fe-e87a-e61c" hidden="false" kind="weapon" sortIndex="3">
      <characteristicTypes>
        <characteristicType name="Rng" id="f6d9-ff21-6fe9-b821"/>
        <characteristicType name="Tgt" id="0bf8-6c63-e593-8417"/>
        <characteristicType name="RoA" id="af32-03e6-6c32-3580"/>
        <characteristicType name="Hit" id="61d4-8e80-254a-ab52"/>
        <characteristicType name="Surge" id="d7e0-90d3-308e-c357">
          <formatRules>
            <formatRule name="New Format Rule" id="c607-5340-1040-b2c7" hidden="false" type="regex" match="^$" replace="-">
              <comment>Empty → -</comment>
            </formatRule>
          </formatRules>
        </characteristicType>
        <characteristicType name="S.Die" id="52f3-3434-e741-a217">
          <formatRules>
            <formatRule name="New Format Rule" id="5175-c978-a732-8149" hidden="false" type="regex" match="^$" replace="-">
              <comment>Empty → -</comment>
            </formatRule>
          </formatRules>
        </characteristicType>
        <characteristicType name="Dmg" id="5665-56ad-b90d-ffc7"/>
        <characteristicType name="Keyword" id="9b72-90e3-8130-46b1">
          <formatRules>
            <formatRule name="New Format Rule" id="4e94-ae81-0dc5-e91d" hidden="false" type="regex" match="^$" replace="-">
              <comment>Empty → -</comment>
            </formatRule>
          </formatRules>
        </characteristicType>
      </characteristicTypes>
    </profileType>
  </profileTypes>
  <sharedRules>
    <rule name="IMPACT (X) Y" id="7805-5c0f-7d68-90c8" hidden="false">
      <description>IMPACT (X) Y Immediately after this Unit completes a successful Charge, check every model in the Fighting Rank or Supporting Rank. For each eligible model, generate X Impact Dice:


-If the model is in the Fighting Rank or Supporting Rank against only one Enemy Unit, all X dice go to that Unit.
- If the model is in the Fighting Rank or Supporting Rank against multiple Enemy Units, the controlling player may split the dice between those Units.



Roll the allocated dice for each target Unit separately (this is the Impact Hit Roll). For each result of Y or higher, set 1 die into the target’s Armour Pool. Proceed immediately to Armour Rolls. These hits do not generate Surge and treat Damage as 1.</description>
      <alias>IMPACT</alias>
    </rule>
    <rule name="LONG RANGE (X&quot;)" id="a7d8-c669-4f19-2b97" hidden="false">
      <description>The maximum Range of this weapon increases to X&quot;.

Measure each attacking model’s distance to the target individually:
- Within normal profile Range: attack resolves normally.
- Beyond profile Range but Within X&quot;: the model suffers a -1 Modifier to its Hit roll.

If a Batch contains models at both Standard and Long Range, generate the total dice but roll the two groups separately to account for different Hit Target Numbers.</description>
      <alias>LONG RANGE</alias>
    </rule>
    <rule name="SIDEARM" id="870d-b754-2961-8cb6" hidden="false">
      <description>When this Unit performs a Ranged Attack or Close Combat Attack, models equipped with this weapon may use it, ignoring the normal restriction of one weapon per model (Part 8.7.3). If a model is equipped with multiple SIDEARM weapons, it may use all of them in the same activation.

Attacks made with each SIDEARM must be resolved in separate Batches. Because they are separate Batches, SIDEARM attacks may target a different Enemy Unit than the Unit&apos;s other weapons, subject to all standard target eligibility requirements.</description>
    </rule>
    <rule name="INDIRECT FIRE" id="a19f-0594-dd63-2656" hidden="false">
      <description>Ranged Attacks with this weapon may ignore Line of Sight when selecting a target and resolving Damage. The target must still be Within Range. If the target is not Visible, it may make an Evade Roll against this attack.</description>
    </rule>
    <rule name="SPECIALIST" id="1974-2d46-8d07-3b29" hidden="false">
      <description>A Unit may include only one model equipped with this weapon. Multiple upgrades configuring more than one instance of this weapon are not permitted (Part 9.1.7).</description>
    </rule>
    <rule name="REPETABLE" id="f895-258a-9487-f59a" hidden="false">
      <description>REPEATABLE. Select another Friendly Biological Unit Within 8&quot;, spend CP and apply one of the following effects: 1 CP: That Unit’s first used weapon gains the CRITICAL HIT (2). 1 CP: That Unit ignores the Disengage penalty for the remainder of the Round. 2 CP: Remove the Activation Marker from that Unit.</description>
    </rule>
    <rule name="BULKY" id="f460-74cd-768c-a9e4" hidden="false">
      <description>This weapon cannot be used to make a Ranged Attack while the Unit is currently Engaged (Part 8.7.3).</description>
    </rule>
    <rule name="PIERCE [TAG] X" id="8a5b-c6c7-6abf-6879" hidden="false">
      <alias>PIERCE</alias>
      <description>When attacking a Unit with the specified Combat Tag, treat this weapon’s Damage characteristic as X.</description>
    </rule>
    <rule name="DEBUFF" id="db39-98a1-2d62-0e5c" hidden="false">
      <description>DEBUFF [Characteristic] (X) The Unit suffers a penalty of X to the specified Characteristic until the End of the Round.
- Target Number Characteristic: increase the value by X (harder to roll).
- Value Characteristic: decrease the value by X (minimum 0).</description>
    </rule>
    <rule name="PRECISION (X)" id="d05b-cebb-50d1-ad49" hidden="false">
      <description>After rolling to Hit, move up to X failed Attack Dice directly into the Armour Pool. Treat them as successful Hits for all purposes, including Surge.</description>
      <alias>PRECISION</alias>
    </rule>
    <rule name="NON-LETHAL DAMAGE (X)" id="0ecb-de24-de57-9c58" hidden="false">
      <alias>NON-LETHAL DAMAGE</alias>
      <description>The Unit suffers X points of Damage. Add this amount effectively to the Unit’s Damage Marker. Unlike standard Damage, NON-LETHAL DAMAGE does not trigger the Remove Casualties step (Part 8.7.4, Step 5), even if Total Damage exceeds a model’s HP. If the Unit subsequently suffers standard Damage, the combined Total Damage triggers casualty removal normally.</description>
    </rule>
    <rule name="CRITICAL HIT (X)" id="3f61-d287-410a-0484" hidden="false">
      <description>Move X dice from the Armour Pool directly to the Damage Pool, bypassing Armour. CRITICAL HIT can never move more dice than are in the Armour Pool.</description>
      <alias>CRITICAL HIT</alias>
    </rule>
    <rule name="ON CREEP" id="b8db-d01a-89fd-efd3" hidden="false">
      <description>A Friendly or Enemy Ground Zerg Unit is considered to be ON CREEP while it is Within 6&quot; of any Creep Tumor Token or any model designated as a Source of Creep. While satisfying this condition, the Unit gains the ON CREEP Keyword. This allows the Unit to trigger specific Special Abilities or Upgrades that require this state.</description>
    </rule>
    <rule name="HIDDEN" id="4bf6-1de9-71aa-02a4" hidden="false">
      <description>This Unit cannot be selected as the target of a Ranged Attack or any LoS-requiring Special Ability unless the acting model is Within 4&quot; of it. A HIDDEN Unit is immune to the IMPACT Keyword. A HIDDEN Unit may make an Evade Roll against every attack targeting it.</description>
    </rule>
    <rule name="LOCKED IN (X)" id="7cfe-f96a-bbcb-8220" hidden="false">
      <alias>LOCKED IN</alias>
      <description>When making a Ranged Attack with this weapon, add X to its RoA if the target Unit has Stationary Status.</description>
    </rule>
    <rule name="HEAL (X)" id="9499-b51b-c280-c0bf" hidden="false">
      <alias>HEAL</alias>
      <description>Remove X points of accumulated Damage from the Unit (reduce its Damage Marker accordingly). HEAL cannot return Destroyed models - it only reduces existing Damage. See also: RESPAWN.</description>
    </rule>
    <rule name="PLACE (X)" id="1a3d-86d9-8aa7-68ab" hidden="false">
      <description>Choose a Leading Model. Remove it and set it Wholly Within X&quot; of its starting position. Then remove and replace all other models in the Unit, maintaining Coherency (Part 4.4). PLACE ignores Gap Clearance, terrain restrictions, and elevation requirements. The Leading Model is removed and set directly, not moved along a path. However, they must end in a legal position. Models may be set Within the Engagement Range of Enemy models (the Unit becomes Engaged) unless stated otherwise.</description>
      <alias>PLACE</alias>
    </rule>
    <rule name="INSTANT" id="d2f3-d719-3a86-b444" hidden="false">
      <description>Enemy Units cannot declare or resolve Reaction abilities in response to attacks made with this weapon.</description>
    </rule>
    <rule name="DISPLACEMENT" id="eb27-1500-88ca-d0f0" hidden="false">
      <description>The Leading Model may end a move Overlapping this Token or Unit (overrides Part 7.3.1).


If the Leading Model ends any Move, Deploy, Run, Charge, Disengage, Close Ranks or Special Ability move Overlapping this Token or model, the controlling player of the Leading Model immediately set it in Base-to-Base contact with the Leading Model. If Base-to-Base is not possible, set it as close as possible.</description>
    </rule>
    <rule name="TOUGH (X)" id="9928-edb1-53e5-438f" hidden="false">
      <description>When this Unit resolves an Armour Roll, change up to X failed results into successes. Treat them as meeting or exceeding the Armour characteristic - discard them without moving to the Damage Pool.</description>
      <alias>TOUGH</alias>
    </rule>
    <rule name="SUMMON (Unit Name)" id="1a39-f874-fdf2-c983" hidden="false">
      <description>SUMMON (Unit Name) Set the Leading Model of the named Unit in Base-to-Base contact with the Parent Unit. Set remaining models In Coherency. Models cannot be set Within the Engagement Range of any Enemy Unit.


Set an Activation Marker next to the summoned Unit - it cannot be Activated during the Phase in which it was summoned. In subsequent Phases, this Unit must be Activated immediately after its Parent Unit’s activation ends, before the opponent’s next activation.


The Summoned Unit cannot be set Within the opponent’s Zone of Influence.


The player must have sufficient Available Supply. If the Unit’s Current Supply Value would cause Total Current Supply to exceed the Supply Pool, it cannot be Summoned.


If the Parent is not present on the battlefield, this Unit can be Activated normally.</description>
      <alias>SUMMON</alias>
    </rule>
    <rule name="RESPAWN (X)" id="d273-74d1-fff7-7002" hidden="false">
      <description>Return up to X Destroyed models to this Unit.
- The return cannot increase the Unit’s Current Supply Value. Do not return a model if doing so would push the Unit into a higher Supply bracket.
- Set each returned model in Base-to-Base contact with an existing model in the Unit. Returned models cannot be set Within the Engagement Range of any Enemy Unit.
- If a model cannot be set legally, it cannot be returned.</description>
      <alias>RESPAWN</alias>
    </rule>
    <rule name="ON CREEP" id="6a15-064c-2136-2005" hidden="false">
      <description>A Friendly or Enemy Ground Zerg Unit is considered to be ON CREEP while it is Within 6&quot; of any Creep Tumor Token or any model designated as a Source of Creep. While satisfying this condition, the Unit gains the ON CREEP Keyword. This allows the Unit to trigger specific Special Abilities or Upgrades that require this state.</description>
    </rule>
    <rule name="DEBUFF" id="e9c5-7999-24b7-4858" hidden="false">
      <description>DEBUFF [Characteristic] (X) The Unit suffers a penalty of X to the specified Characteristic until the End of the Round.
- Target Number Characteristic: increase the value by X (harder to roll).
- Value Characteristic: decrease the value by X (minimum 0).</description>
    </rule>
    <rule name="IMPASSABLE TERRAIN" id="0c68-af78-c6ca-9cf8" hidden="false">
      <description>A terrain piece is Impassable if it has no Access Point connecting it to an adjacent elevation level. Models cannot move through, onto, or across IMPASSABLE TERRAIN, and no model may end its movement overlapping it. Terrains of sizes 0 and 1 are never considered IMPASSABLE TERRAIN.</description>
    </rule>
    <rule name="INSTANT" id="a6a8-9065-8680-ddbd" hidden="false">
      <description>Enemy Units cannot declare or resolve Reaction abilities in response to attacks made with this weapon.</description>
    </rule>
    <rule name="ANTI-EVADE (X)" id="cfd0-ab4b-fc25-34be" hidden="false">
      <description>When resolving an attack with this weapon against Enemy Units, the target Unit suffers a -X Modifier to its Evade Roll for this attack (Part 8.7.4, Step 4).</description>
      <alias>ANTI-EVADE</alias>
    </rule>
  </sharedRules>
  <categoryEntries>
    <categoryEntry name="Armoured" id="03d5-bf1b-74fa-ae6a" hidden="false"/>
    <categoryEntry name="Light" id="8312-ca6b-fa38-deef" hidden="false"/>
    <categoryEntry name="Ground" id="b947-4784-f388-d6a2" hidden="false"/>
    <categoryEntry name="Biological" id="8b0f-c3cd-9487-5030" hidden="false"/>
    <categoryEntry name="Unique" id="5adb-d04b-d3a5-9c7b" hidden="false"/>
    <categoryEntry name=" Mechanical" id="e9d0-aa9f-8c5e-a2c3" hidden="false"/>
    <categoryEntry name="Flying" id="46e8-c643-c323-b4c1" hidden="false"/>
    <categoryEntry name="Psionic" id="b915-b8d0-e25e-d12c" hidden="false"/>
  </categoryEntries>
  <sharedProfiles>
    <profile name="Squadron" typeId="a305-fb8b-8be3-f0fe" typeName="Rules (Any Phase)" hidden="false" id="fc8c-6bff-6d80-b316">
      <characteristics>
        <characteristic name="Effect" typeId="616e-c7be-abff-a2bf">This Unit’s Horizontal Coherency is 4&quot;.</characteristic>
        <characteristic name="Cost" typeId="1696-5ea7-559b-bb8b">Passive</characteristic>
      </characteristics>
    </profile>
    <profile name="Commander" typeId="a305-fb8b-8be3-f0fe" typeName="Rules (Any Phase)" hidden="false" id="c429-c517-b5d9-8e78">
      <characteristics>
        <characteristic name="Effect" typeId="616e-c7be-abff-a2bf">Treat this Unit’s Supply characteristic as increased by 1 for Controlling and Contesting Mission Markers, completing objectives, and resolving Disengage checks.</characteristic>
        <characteristic name="Cost" typeId="1696-5ea7-559b-bb8b">Passive</characteristic>
      </characteristics>
    </profile>
    <profile name="Structure" typeId="a305-fb8b-8be3-f0fe" typeName="Rules (Any Phase)" hidden="false" id="d3a4-0dbc-a379-e0fa">
      <characteristics>
        <characteristic name="Effect" typeId="616e-c7be-abff-a2bf">This Unit cannot be Activated in any Phase and cannot perform actions. Additionally, its Current Supply Value is treated as 0, and it can never Control or Contest Mission Markers, ignoring the standard Zero Supply Exception. This Unit cannot be a target of an ability, unless stated otherwise.</characteristic>
        <characteristic name="Cost" typeId="1696-5ea7-559b-bb8b">Passive</characteristic>
      </characteristics>
    </profile>
  </sharedProfiles>
</gameSystem>
