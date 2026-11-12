// Level per format: manage international, domestic or both sides of the game, for each of Test, One Day and T20.
import { Seg } from './bits.jsx';
import { LEVELS } from '../world/state.js';

export const GROUPS = [['Test', 'Test / first-class'], ['ODI', 'One Day'], ['T20', 'T20']];
export const LEVEL_L = { both: 'Both', intl: 'International', dom: 'Domestic' };
const OPTS = LEVELS.map((k) => [k, LEVEL_L[k]]);
export const levelsLine = (levels) => GROUPS.map(([g, l]) => `${l}: ${LEVEL_L[(levels && levels[g]) || 'both']}`).join(' · ');
export const LEVEL_TEXT = 'Choose what you manage in each format. A match in a format or side you do not manage is played by the assistant squad without stopping the clock.';

export default function LevelPicker({ levels, onChange }) {
  return (
    <div className="field">
      <span className="lbl">Level per format</span>
      {GROUPS.map(([g, l]) => (
        <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <span className="t-small" style={{ minWidth: 130 }}>{l}</span>
          <Seg options={OPTS} value={(levels && levels[g]) || 'both'} onChange={(v) => onChange(g, v)} label={`${l} level`} />
        </div>))}
      <p className="faint t-small">{LEVEL_TEXT}</p>
    </div>
  );
}
