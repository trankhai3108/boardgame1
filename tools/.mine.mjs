import { HERO_LIST } from '../src/data/heroes';
const sig = (r) => {
  if (r.kind === 'symbols') return Object.entries(r.symbols).sort().map(([s, n]) => `${s}${n}`).join('+');
  if (r.kind === 'straight') return `straight${r.length}`;
  if (r.kind === 'ofAKind') return `kind${r.count}`;
  if (r.kind === 'defenseRoll') return `defence${r.dice}`;
  return 'other';
};
const out = {};
for (const h of HERO_LIST) {
  out[h.id] = h.abilities.map((a) => ({
    id: a.id, kind: a.kind, ult: !!a.ultimate,
    tiers: a.tiers.map((t) => ({ sig: sig(t.requirement), text: t.text.join(' ') })),
  }));
}
console.log(JSON.stringify(out, null, 1));
