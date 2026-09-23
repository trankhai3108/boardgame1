// Static audit: walk every ability's effect tree and report what is missing.
import { HERO_LIST } from './src/data/heroes/index.ts';

const walk = (effects, fn, path = []) => {
  for (const e of effects ?? []) {
    fn(e, path);
    if (e.t === 'subRoll') for (const o of e.outcomes ?? []) walk(o.effects, fn, [...path, `on:${o.on}`]);
    if (e.t === 'choose') walk(e.effects, fn, [...path, 'choose']);
    if (e.t === 'when') { walk(e.then, fn, [...path, 'then']); walk(e.otherwise, fn, [...path, 'else']); }
  }
};

const rows = [];
for (const hero of HERO_LIST) {
  const own = new Set(hero.statusEffects.map((s) => s.id));
  const symbols = new Set(hero.dieFaces.map((f) => f.symbol));

  for (const ability of hero.abilities) {
    const all = [
      ...(ability.passive?.upkeep ?? []),
      ...(ability.passive?.options ?? []).flatMap((o) => o.effects),
      ...ability.tiers.flatMap((t) => t.effects),
    ];
    const manual = [];
    const badStatus = [];
    const badSymbol = [];
    let doesSomething = all.length > 0;

    walk(all, (e, path) => {
      if (e.t === 'manual') manual.push(`${path.join('>')} ${e.note}`);
      if (e.t === 'gainStatus' && !own.has(e.status) && e.status !== 'stun' && e.status !== 'knockdown'
          && e.status !== 'burn' && e.status !== 'poison') {
        badStatus.push(`${e.status} (${path.join('>')})`);
      }
    });
    for (const tier of ability.tiers) {
      const r = tier.requirement;
      if (r.kind === 'symbols') {
        for (const sym of Object.keys(r.symbols)) if (!symbols.has(sym)) badSymbol.push(sym);
      }
    }
    if (ability.kind === 'passive') doesSomething = !!ability.passive;

    rows.push({
      hero: hero.name, ability: ability.name, id: ability.id, kind: ability.kind,
      tiers: ability.tiers.length, effects: all.length,
      manual, badStatus, badSymbol, doesSomething,
    });
  }
}

const broken = rows.filter((r) => !r.doesSomething);
const withManual = rows.filter((r) => r.manual.length);
const statusIssues = rows.filter((r) => r.badStatus.length);
const symbolIssues = rows.filter((r) => r.badSymbol.length);

console.log(`abilities: ${rows.length} across ${HERO_LIST.length} heroes`);
console.log(`  with no effects at all : ${broken.length}`);
console.log(`  with manual gaps       : ${withManual.length}`);
console.log(`  unknown status ref     : ${statusIssues.length}`);
console.log(`  unknown die symbol     : ${symbolIssues.length}`);

if (broken.length) {
  console.log('\n--- abilities that do nothing');
  broken.forEach((r) => console.log(`  ${r.hero} / ${r.ability} (${r.kind})`));
}
if (statusIssues.length) {
  console.log('\n--- status ids the hero does not carry');
  statusIssues.forEach((r) => console.log(`  ${r.hero} / ${r.ability}: ${r.badStatus.join(', ')}`));
}
if (symbolIssues.length) {
  console.log('\n--- die symbols the hero does not have');
  symbolIssues.forEach((r) => console.log(`  ${r.hero} / ${r.ability}: ${r.badSymbol.join(', ')}`));
}
console.log('\n--- abilities with rules left to the players');
withManual.forEach((r) => {
  console.log(`  ${r.hero} / ${r.ability}`);
  r.manual.forEach((m) => console.log(`      ${m}`));
});
