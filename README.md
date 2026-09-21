# Dice Throne

A web re-implementation of the Dice Throne board game: all eight Season 1
heroes, every table size in the rulebook, playable across the network or on one
shared screen, in English and Vietnamese.

Stack: React + TypeScript + Vite, served by a Cloudflare Worker with one
Durable Object per room.

```bash
npm install
npm run dev:all  # worker + web app (what you want to play)
npm run dev      # web app only, on :5173
npm run server   # worker only, on :8787 (wrangler dev, real Durable Objects)
npm run build    # typecheck + production build
npm test         # test suite
npm run deploy   # build, then publish to Cloudflare
```

Open the app, stay on **Online**, type a name and create a room. The other
players open the same URL on their own machines, enter their name and the
four-letter room code, and join. **Same screen** is the hot-seat fallback.

## How it is put together

```
src/
  engine/
    types.ts             Domain model. Everything else conforms to this.
    rng.ts               Seeded PRNG — the engine never calls Math.random
    dice.ts              Rolling, symbols, straights, N-of-a-kind
    combos.ts            Which abilities a hand of dice can activate
    damage.ts            The Final DMG Total pipeline
    targeting.ts         The Targeting Roll Phase tables
    statusBehaviour.ts   What each token mechanically does
    effects.ts           Executes an ability's Effect list
    state.ts             GameState, teams, setup, rulebook constants
    actions.ts           The Action union
    reducer.ts           reduce(state, action) -> state, plus legalActions()
    authority.ts         Who may act, and what each player may see
    __tests__/           The engine test suite
  data/
    statusEffects.ts     Status effects shared between heroes
    cards/
      common.ts          The 18 action cards every hero shares
      <hero>.ts          15 hero-specific cards each
    heroes/
      index.ts           Hero registry
      season1/*.ts       One file per hero — pure data, no logic
  i18n/
    types.ts             Lang list and the translation key builders
    en.ts                Interface strings (English is the source language)
    vi.ts                Vietnamese: interface plus every data string
    context.tsx          Provider; useI18n.ts is the hook
  net/
    client.ts            Websocket client; owns no rules
    useRoom.ts           React binding for it
  ui/
    card/                Card frame, icon set, registries, markup renderer
    board/               Ability cards and the folding hero board
    play/                GameTable (shared), LocalPlay (hot-seat), OnlinePlay
server/
  protocol.ts            Message types shared by client and worker
worker/
  index.ts               Worker: /api/new, /ws routing, static assets
  room.ts                One Durable Object per room — the authority
tools/                   One-shot data import scripts
```

The rule is that **adding a hero means writing one data file**. Nothing in
`engine/` or `ui/` should need to change unless the hero introduces a mechanic
the model cannot express yet.

### Text markup

Ability and card text is authored with inline tokens so the rendered text
matches the printed components:

```ts
text: ['Deal [[dmg:5]] dmg & roll [[die:2]]:', 'Heal [[heal:2]] × [[life]].']
```

Tokens: `dmg`, `heal`, `prevent`, `cp`, `card`, `die`, plus every die symbol and
status token. `*text*` renders italic and may itself contain tokens.

New symbols go in `SYMBOL_ICONS`, new status tokens in `STATUS_ICONS`
(`src/ui/card/icons.tsx`), then in `PLAIN_ICONS` in `markup.tsx`.

## The engine

`reduce(state, action, heroLookup)` is a pure function: it deep-clones the
state, applies one action and returns the result, so previous states stay valid
for undo or replay. All randomness comes from a seeded PRNG held in the state,
so a seed plus a list of actions reproduces a game exactly.

`legalActions(state, heroLookup)` returns everything that is currently allowed,
which is what the UI renders and what a bot would choose from. Illegal actions
throw rather than being silently ignored.

### Turn structure

Upkeep → Income → Main Phase 1 → Offensive Roll Phase → (Targeting Roll Phase)
→ (Defensive Roll Phase) → Main Phase 2 → Discard. The start player skips their
first Income Phase, so a new game opens in Main Phase 1.

### Damage

The Final DMG Total pipeline in `damage.ts` follows the rulebook literally:

1. Determine incoming damage.
2. Apply everything that adds or subtracts a specific amount → **subtotal**.
3. Apply everything that multiplies or divides — each computed independently
   from that same subtotal, in any declaration order, always rounding up.

Step 3 is the part that is easy to get wrong. Two Protect tokens spent on an
odd subtotal S each prevent `ceil(S/2)`, which together is `S + 1`, so they
prevent all of it. Chaining the halves sequentially would leave damage
through. There is a test for exactly this.

Damage types carry their rulebook attributes: `normal` is defendable, avoidable
and modifiable; `undefendable` drops defendable; `pure` and `collateral` also
drop modifiable; `ultimate` is not avoidable at all and may only be increased.

### Status effects

`statusBehaviour.ts` maps each token id to what it mechanically does — spend to
prevent, spend to boost, upkeep damage, roll-attempt penalties and so on. Hero
data only declares which tokens a hero brings; the engine decides how they
behave. Anything that needs a human decision the engine cannot make carries a
`manual` note instead of being silently approximated.

Implemented mechanically: Protect, Retribution, Crit, Accuracy, Blessing of
Divinity, Stun, Concussion, Chi, Evasive, Knockdown, Blind, Entangle, Targeted,
Burn, Fire Mastery, Shadows, Sneak Attack, Poison, Delayed Poison, Smoke Bomb,
Ninjutsu, Dryad, Barbed Vine.

## Tables

Every mode in the rulebook, with the seating and health rules each one asks for.

| Mode | Players | Teams | Health |
| --- | --- | --- | --- |
| 1v1 | 2 | 2 × 1 | 50 each |
| 2v2 | 4 | 2 × 2 | 50 shared per team |
| 3v3 | 6 | 2 × 3 | 50 shared per team |
| 2v2v2 | 6 | 3 × 2 | 50 shared per team |
| King of the Hill | 3–5 | free-for-all | 35 / 25 / 20 by head count |

Health lives on the **team**, not the player: `healthOf(state, playerIndex)`
reads the dial the player's team shares. Seats are dealt so that seat `i`
belongs to team `i % teams`. Walking clockwise then alternates teams, which is
exactly the zigzag turn order the rulebook describes, and in 2v2v2 it puts
teammates three seats apart as required.

With three teams on the table, one going out does not end the game; play
continues until a single team is left.

### Targeting Roll Phase

With more than one possible defender the attacker rolls a die before the
ability resolves, because most effects need to know who they hit.

- Two opponents: 1–2 left, 3–4 right, 5 the opponents choose, 6 the attacker
  chooses.
- Three opponents: 1–2 left, 3–4 middle, 5–6 right.
- King of the Hill: the attacker picks freely, and draws a bonus card for
  attacking a Leader.

"Left to right" is read as clockwise seat order starting from the seat after
the attacker's.

## Playing across the network

The engine is a pure reducer over a seeded RNG, which is what makes this
straightforward: the server holds the one true `GameState`, clients send
`Action`s, and the server broadcasts the result. Clients hold no rules at all,
so they cannot disagree with the server or be trusted to cheat.

Two checks sit between a click and the state:

- `legalActions(state)` — what the rules allow right now.
- `canAct(state, playerIndex, action)` — whose click it is. Most of a turn
  belongs to the active player, but defending, spending a token and picking a
  target do not.

`redactFor(state, playerIndex)` strips what a player may not see before the
state goes out: other teams' hands, and every deck. Teammates keep each other's
hands visible, which the rulebook explicitly encourages.

Room codes are four characters from an alphabet with no `0/O` or `1/I`, so a
code survives being read aloud. A dropped socket keeps its seat and the client
stores the session, so refreshing rejoins the same game.

### Where it runs

One Worker serves both the built site and the websocket, so the page and the
game share an origin: no CORS, no second deploy, no server URL to configure.

- `GET /api/new` allocates a free room code, probing room objects until one is
  unused.
- `/ws?code=XXXX` routes to `ROOM.idFromName(code)` — the Durable Object for
  that room.
- Everything else is served from `dist`.

Each room is a single Durable Object, so every socket for a code lands on the
same instance: actions serialise naturally and the state has nowhere to
diverge. Rooms are written to the object's storage, so they survive eviction.

`wrangler dev` runs the same Worker and real Durable Objects locally, so there
is only one server implementation to keep correct. In dev Vite proxies `/api`
and `/ws` through to it, so the client only ever talks to its own origin and
dev behaves like production — `npm run dev` alone will not work, because
nothing is listening on `:8787`.

`VITE_SERVER_URL` overrides where the client looks, for hosting the site apart
from the Worker. That is the only case where the API's CORS headers matter.

## Deploying to Cloudflare

Requires a Cloudflare account. Durable Objects with the SQLite backend used
here are available on the free plan.

```bash
npx wrangler login     # opens a browser; do this once
npm run deploy
```

That builds the site and publishes the Worker, its assets and the Durable
Object together. Wrangler prints the `*.workers.dev` URL — send that to the
other players. In CI, set `CLOUDFLARE_API_TOKEN` instead of logging in.

Change the deployed name in `wrangler.jsonc` (`"name"`), which decides the
subdomain.

## Languages

English and Vietnamese, switchable in the header and remembered in
`localStorage`.

English is the source language: hero, ability, card and status text lives in
the data files, so `en.ts` only carries interface strings. Every lookup takes
the data's own English as its fallback, which means a missing translation
degrades to English rather than to a raw key.

```tsx
const { t, tList } = useI18n();
t(K.abilityName(hero.id, ability.id), ability.name)
tList((i) => K.abilityTier(hero.id, ability.id, tier, i), tier.text)
```

Keys are built by `K` in `i18n/types.ts` so the components, the dictionary and
the coverage test cannot drift apart. `src/i18n/__tests__` fails the build if a
data string has no Vietnamese, if `vi.ts` carries a key the data no longer has,
if a translation loses or gains icon markup, or if a `{placeholder}` goes
missing.

Adding a language: add it to `LANGS`, write the dictionary, register it in
`DICTS`.

## Data status

All eight Season 1 heroes are complete: boards, dice, status effects and a
33-card deck each.

| Hero | Complexity | Board | Deck |
| --- | --- | --- | --- |
| Barbarian | 1 | complete | 33 |
| Moon Elf | 2 | complete | 33 |
| Ninja | 2 | complete | 33 |
| Pyromancer | 3 | complete | 33 |
| Monk | 4 | complete | 33 |
| Paladin | 5 | complete | 33 |
| Shadow Thief | 5 | complete | 33 |
| Treant | 6 | complete | 33 |

Boards, dice faces and status effects are transcribed from photographs of the
printed components, so they follow the printed English exactly. 65 of the 138
distinct cards carry artwork; see Artwork below for why the other 73 do not.

### Where the cards came from

The decks are generated from [zhuanggenhua/BoardGame](https://github.com/zhuanggenhua/BoardGame)
(MIT), a Chinese Dice Throne implementation, by the scripts in `tools/`. Each
deck is 15 hero cards plus the 18 shared action cards.

Two things to know about that data:

- **The rules text is faithful.** Spot-checked against cards transcribed
  independently: their `card-gods-grace` is exactly the printed *Divine Favor!*
  promo, down to the die outcomes.
- **The card names are not.** They are a Chinese round-trip, so a card's name
  often differs from the printed English one — and the same round-trip renamed
  abilities too ("Slap" for Smack, "Holy Defense" for Divine Defense). Ability
  ids were therefore matched to ours **by dice signature, not by name**, and
  upgrade cards were renamed after the ability as the board prints it. The
  vocabulary of tokens and die faces is rewritten to match the boards as well.

## Artwork

Icons, card frames and ability cards are original SVG and CSS, written to match
the *shape language* and layout of the printed components.

Two sets of bitmaps are not ours, and are here only because this is a personal
fan reimplementation — do not ship them:

- **Hero portraits** (`public/heroes/`), cropped from photographs of the printed
  hero boards and tidied up (the die-cut notch above the art is filled and
  faded).
- **Card art** (`public/cards/`), sliced out of the Chinese card scans served by
  the reference project. Only the illustration window is taken; our own frame
  draws the title and rules text over it in English or Vietnamese.

Both are Roxley's artwork. A hero without a `portrait` and a card without `art`
both fall back to a placeholder frame, so deleting either folder degrades
gracefully.

**Action cards have art; upgrade cards do not.** Action cards have a clean
illustration window under the title. Upgrade cards print their rules *over* the
artwork, at a height that varies from card to card — no single crop window is
clean for them, and about 40% of the attempts came out with Chinese text across
the image. They keep the placeholder rather than showing text in a third
language.

### Portraits

`public/heroes/<hero-id>.webp` is referenced by each hero's `portrait` field.
They were generated by cropping the centre panel of each board scan; the board
scans themselves are not in the repo.

### Theming

Each hero's `palette` drives the board through CSS custom properties, so a
dark-boarded hero (Barbarian) and a pale-boarded one (Paladin) share the same
components. Only `primary`, `accent` and `board` are required; the `ability*`
and `ultimate*` fields override the pale default.

## What is not built yet

- **Level II and III ability rules.** Upgrade cards are in the decks and the
  engine tracks the level on the ability slot, but the upgraded rules are not
  modelled: the board keeps showing level I. Upgrade cards therefore print only
  "Upgrade X to level N" rather than restating rules the engine will not apply.
- **Card effects.** Cards can be played and sold and cost the right CP, but
  most carry no executable `effects`, so their text is the rule and the players
  apply it.
- **Choices the engine makes for you.** "A chosen player" resolves to yourself,
  and "remove a status effect of your choice" is only logged. These need a
  prompt in the UI.
- **Effects recorded as `{ t: 'manual', note: '...' }`** — mostly abilities that
  scale off tokens held (Hot Streak, Nature's Grasp) or offer a choice
  (Meditate). Grep for `'manual'` to list them; they are logged during play so
  nothing is silently skipped.
- **Room cleanup.** A room's Durable Object storage is deleted when the last
  player leaves a lobby, but a game abandoned mid-flight keeps its storage
  until the object is manually cleared.
- **Spectators.** The protocol allows a seat-less client, but there is no UI
  for it.
- **Reconnect UX.** A dropped player keeps their seat and can rejoin, but the
  others are not told to wait for them.
