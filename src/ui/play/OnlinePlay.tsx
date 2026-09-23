import { useRef, useState } from 'react';
import { HERO_LIST, HEROES } from '../../data/heroes';
import { MODES, type GameMode } from '../../engine/state';
import { fill } from '../../i18n';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { apiBase, loadSession } from '../../net/client';
import { useRoom } from '../../net/useRoom';
import { GameTable } from './GameTable';

const MODE_IDS: GameMode[] = ['1v1', '2v2', '3v3', '2v2v2', 'koth'];

function seatsWanted(mode: GameMode): string {
  if (mode === 'koth') return '3-5';
  return String(MODES[mode].teams * MODES[mode].perTeam);
}

/**
 * A quiet badge that only speaks up when the connection is not healthy, so a
 * dropped socket never looks like a frozen game.
 */
function ConnectionBadge() {
  const { t } = useI18n();
  const { status } = useRoom();
  if (status === 'open' || status === 'idle') return null;
  return <span className={`conn conn--${status}`}>{t(`ui.net.status.${status}`)}</span>;
}

/** Room code entry and creation. */
function Doorway() {
  const { t } = useI18n();
  const { client, status, error } = useRoom();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<GameMode>('1v1');
  const [hint, setHint] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  /**
   * The buttons stay enabled on purpose. A disabled button that does nothing
   * when clicked reads as a broken page; this says what is missing instead.
   */
  const guard = (needCode: boolean): boolean => {
    if (!name.trim()) {
      setHint(t('ui.net.needName'));
      nameRef.current?.focus();
      return false;
    }
    if (needCode && code.trim().length < 4) {
      setHint(t('ui.net.needCode'));
      return false;
    }
    setHint(null);
    return true;
  };

  // Offer to walk back into a game that is still running.
  const session = loadSession();
  const trimmed = name.trim();

  return (
    <div className="doorway">
      {error ? <p className="notice">{error}</p> : null}
      {status === 'closed' ? (
        <p className="notice">
          {fill(t('ui.net.offline'), { url: apiBase() })}
          <br />
          <code>npm run server</code>
        </p>
      ) : null}

      <label className="doorway__field">
        <span>{t('ui.net.yourName')}</span>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setHint(null);
          }}
          maxLength={20}
          placeholder={t('ui.net.namePlaceholder')}
          autoFocus
        />
        {hint ? <span className="doorway__hint">{hint}</span> : null}
      </label>

      <div className="doorway__panels">
        <section className="doorway__panel">
          <h3>{t('ui.net.host')}</h3>
          <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>
            {MODE_IDS.map((m) => (
              <option key={m} value={m}>
                {MODES[m].label} ({seatsWanted(m)})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="play__button"
            onClick={() => {
              if (guard(false)) void client.create(trimmed, mode);
            }}
          >
            {t('ui.net.createRoom')}
          </button>
        </section>

        <section className="doorway__panel">
          <h3>{t('ui.net.joinRoom')}</h3>
          <input
            className="doorway__code"
            value={code}
            placeholder="ABCD"
            maxLength={4}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            type="button"
            className="play__button"
            onClick={() => {
              if (guard(true)) client.join(code, trimmed);
            }}
          >
            {t('ui.net.join')}
          </button>
        </section>
      </div>

      {session ? (
        <button
          type="button"
          className="play__button play__button--ghost"
          onClick={() => client.resume(session.code, session.playerId)}
        >
          {fill(t('ui.net.resume'), { code: session.code })}
        </button>
      ) : null}
    </div>
  );
}

/** Seat list, hero picks and the start button. */
function Lobby() {
  const { t } = useI18n();
  const { client, room, playerId, error } = useRoom();
  if (!room) return null;

  const isHost = room.hostId === playerId;
  const mine = room.seats.find((s) => s.playerId === playerId);
  const wanted = seatsWanted(room.mode);
  const everyonePicked = room.seats.every((s) => s.heroId);

  return (
    <div className="lobby">
      {error ? <p className="notice">{error}</p> : null}

      <div className="lobby__head">
        <div>
          <div className="app__subtitle">{t('ui.net.roomCode')}</div>
          <div className="lobby__code">{room.code}</div>
        </div>
        <ConnectionBadge />
        <div className="lobby__mode">
          {isHost ? (
            <select
              value={room.mode}
              onChange={(e) => client.setMode(e.target.value as GameMode)}
            >
              {MODE_IDS.map((m) => (
                <option key={m} value={m}>
                  {MODES[m].label} ({seatsWanted(m)})
                </option>
              ))}
            </select>
          ) : (
            <span className="app__subtitle">{MODES[room.mode].label}</span>
          )}
          <span className="app__subtitle">
            {room.seats.length} / {wanted}
          </span>
        </div>
        <button type="button" className="play__button play__button--ghost" onClick={() => client.leave()}>
          {t('ui.net.leave')}
        </button>
      </div>

      <p className="notice">{t('ui.net.shareCode')}</p>

      <div className="lobby__seats">
        {room.seats.map((seat) => {
          const hero = seat.heroId ? HEROES[seat.heroId] : null;
          return (
            <div
              key={seat.playerId}
              className={`lobby__seat${seat.playerId === playerId ? ' lobby__seat--you' : ''}${
                seat.connected ? '' : ' lobby__seat--away'
              }`}
            >
              {hero?.portrait ? (
                <img className="player-panel__avatar" src={hero.portrait} alt="" />
              ) : (
                <span className="lobby__avatar-blank" />
              )}
              <div>
                <div className="player-panel__name">
                  {seat.name}
                  {seat.playerId === room.hostId ? (
                    <span className="lobby__host">{t('ui.net.hostTag')}</span>
                  ) : null}
                  {seat.isBot ? (
                    <span className="player-panel__bot">{t('ui.play.bot')}</span>
                  ) : null}
                </div>
                <div className="player-panel__hero">
                  {hero ? t(K.hero(hero.id, 'name'), hero.name) : t('ui.net.picking')}
                  {seat.connected ? '' : ` · ${t('ui.net.away')}`}
                </div>
              </div>
              {isHost && seat.isBot ? (
                <button
                  type="button"
                  className="lobby__drop"
                  title={t('ui.net.removeBot')}
                  onClick={() => client.removeBot(seat.playerId)}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}

        {isHost && room.seats.length < Number(wanted.split('-').pop()) ? (
          <button type="button" className="lobby__add-bot" onClick={() => client.addBot()}>
            + {t('ui.net.addBot')}
          </button>
        ) : null}
      </div>

      <h2 className="section-title">{t('ui.net.pickHero')}</h2>
      <div className="tabs">
        {HERO_LIST.map((h) => (
          <button
            key={h.id}
            className="tab"
            aria-selected={mine?.heroId === h.id}
            onClick={() => client.pickHero(h.id)}
          >
            {t(K.hero(h.id, 'name'), h.name)}
          </button>
        ))}
      </div>

      {isHost ? (
        <button
          type="button"
          className="play__button"
          style={{ marginTop: '1.25rem' }}
          disabled={!everyonePicked}
          onClick={() => client.start()}
        >
          {t('ui.net.startGame')}
        </button>
      ) : (
        <p className="app__subtitle" style={{ marginTop: '1.25rem' }}>
          {t('ui.net.waitingForHost')}
        </p>
      )}
    </div>
  );
}

/** Online play: lobby until the host starts, then the shared table. */
export function OnlinePlay() {
  const { t } = useI18n();
  const { client, room, game, you, error } = useRoom();

  if (!room) return <Doorway />;
  if (!game) return <Lobby />;

  return (
    <>
      {error ? (
        <p className="notice" onClick={() => client.clearError()}>
          {error}
        </p>
      ) : null}
      <GameTable
        game={game}
        you={you}
        onAction={(action) => client.act(action)}
        toolbar={
          <>
            <span className="lobby__code lobby__code--small">{room.code}</span>
            <ConnectionBadge />
            <button
              type="button"
              className="play__button play__button--ghost"
              onClick={() => client.leave()}
            >
              {t('ui.net.leave')}
            </button>
          </>
        }
      />
    </>
  );
}
