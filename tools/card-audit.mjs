/**
 * What every card in the game actually does when it is played.
 *
 * A card with no `effects` is playable, costs its CP and goes to the discard
 * pile having changed nothing: its text is the rule and the players have to
 * apply it themselves. This counts those, and checks that the ones which do
 * have effects refer to things the engine knows about.
 */
import { HERO_LIST, HEROES } from '../src/data/heroes';

const STATUS_IDS = new Set(HERO_LIST.flatMap((h) => h.statusEffects.map((s) => s.id)));
const SYMBOLS = new Set(HERO_LIST.flatMap((h) => h.dieFaces.map((f) => f.symbol)));

const problems = [];
const walk = (effects, note) => {
  for (const e of effects ?? []) {
    if (typeof e.status === 'string' && !STATUS_IDS.has(e.status)) {
      problems.push(`${note}: unknown status "${e.status}"`);
    }
    if (e.t === 'manual') problems.push(`${note}: left to the players — ${e.note}`);
    if (e.t === 'choose') walk(e.effects, note);
    if (e.t === 'when') { walk(e.effects, note); walk(e.otherwise, note); }
    if (e.t === 'subRoll') {
      for (const o of e.outcomes) {
        if (typeof o.on === 'string' && !SYMBOLS.has(o.on)) {
          problems.push(`${note}: unknown die symbol "${o.on}"`);
        }
        walk(o.effects, note);
      }
      walk(e.otherwise, note);
      walk(e.total, note);
    }
  }
};

const seen = new Map();
for (const hero of HERO_LIST) {
  for (const card of hero.cards) {
    if (seen.has(card.id)) continue;
    seen.set(card.id, { card, hero });
  }
}

const byType = {};
const inert = [];
for (const { card, hero } of seen.values()) {
  byType[card.type] ??= { total: 0, inert: 0 };
  byType[card.type].total += 1;
  const note = `${hero.name} · ${card.name}`;
  // An upgrade card's job is to raise a slot's level, so it "does something"
  // when the hero has rules for the level it grants.
  const upgradeLands =
    card.type === 'upgrade' &&
    hero.abilities.some((a) => a.id === card.upgrades && a.upgrades?.[card.upgradeLevel]);

  if (!card.effects?.length && !upgradeLands) {
    byType[card.type].inert += 1;
    inert.push(`${card.type.padEnd(10)} ${card.name.padEnd(24)} ${card.text.join(' ').slice(0, 74)}`);
  }
  walk(card.effects, note);
}

console.log(`${seen.size} distinct cards\n`);
for (const [type, n] of Object.entries(byType)) {
  console.log(`  ${type.padEnd(11)} ${String(n.total).padStart(3)} cards, ${String(n.inert).padStart(3)} do nothing when played`);
}
console.log(`\n--- cards that do nothing when played (${inert.length}) ---`);
for (const line of inert) console.log('  ' + line);
if (problems.length) {
  console.log(`\n--- broken references (${problems.length}) ---`);
  for (const p of problems) console.log('  ' + p);
}
void HEROES;
