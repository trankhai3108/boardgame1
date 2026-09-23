import { HEROES } from '../src/data/heroes';
const h = HEROES[process.argv[2] ?? 'barbarian'];
for (const a of h.abilities) {
  const req = (t) => {
    const r = t.requirement;
    if (r.kind === 'symbols') return Object.entries(r.symbols).map(([s, n]) => `${n}${s}`).join('+');
    if (r.kind === 'straight') return `straight${r.length}`;
    if (r.kind === 'ofAKind') return `${r.count}ofAKind`;
    return JSON.stringify(r);
  };
  console.log(`\n${a.id}  [${a.kind}${a.ultimate ? ',ULT' : ''}]`);
  a.tiers.forEach((t, i) => console.log(`  t${i} ${req(t).padEnd(16)} ${JSON.stringify(t.effects)}`));
}
