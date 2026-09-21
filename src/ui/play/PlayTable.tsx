import { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { LocalPlay } from './LocalPlay';
import { OnlinePlay } from './OnlinePlay';

type Where = 'online' | 'local';

/** Chooses between playing across the network and sharing one screen. */
export function PlayTable() {
  const { t } = useI18n();
  const [where, setWhere] = useState<Where>('online');

  return (
    <div>
      <div className="tabs">
        {(['online', 'local'] as Where[]).map((w) => (
          <button key={w} className="tab" aria-selected={w === where} onClick={() => setWhere(w)}>
            {t(`ui.net.${w}`)}
          </button>
        ))}
      </div>

      {where === 'online' ? <OnlinePlay /> : <LocalPlay />}
    </div>
  );
}
