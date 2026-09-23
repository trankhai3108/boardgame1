import { HERO_LIST } from '../src/data/heroes';
let missing = 0;
for (const h of HERO_LIST) {
  const want = new Map();
  for (const c of h.cards) {
    if (c.type !== 'upgrade') continue;
    want.set(`${c.upgrades}:${c.upgradeLevel}`, c.name);
  }
  const gaps = [];
  for (const [key, name] of want) {
    const [id, lvl] = key.split(':');
    const a = h.abilities.find((x) => x.id === id);
    if (!a?.upgrades?.[lvl]) gaps.push(`${id} ${lvl}`);
  }
  missing += gaps.length;
  console.log(`${h.name.padEnd(14)} ${String(want.size).padStart(2)} upgrade cards, ${String(gaps.length).padStart(2)} without rules${gaps.length ? '  -> ' + gaps.join(', ') : ''}`);
}
console.log('\ntotal without rules:', missing);
