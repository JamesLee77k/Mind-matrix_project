import { Trophy } from 'lucide-react';
import { useStore } from '@/lib/local-data';

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'MM';
}

export function LeaderboardPage() {
  const { runs, profile } = useStore();
  const personal = runs.length ? Math.max(...runs.map((run) => run.score)) : 0;
  const rows = [
    { name: 'Mira Chen', score: 1840, sessions: 42, demo: true },
    { name: 'Theo Park', score: 1612, sessions: 37, demo: true },
    { name: 'Noah Williams', score: 1438, sessions: 31, demo: true },
    { name: profile.name, score: personal, sessions: runs.length, you: true },
    { name: 'Iris Okafor', score: 1266, sessions: 29, demo: true },
    { name: 'Luca Moretti', score: 1104, sessions: 24, demo: true },
  ].sort((a, b) => b.score - a.score);
  const rank = rows.findIndex((row) => 'you' in row && row.you) + 1;

  return (
    <div className="page-stack">
      <div className="page-title-row">
        <div><div className="eyebrow">THE PRACTICE BOARD</div><h1>A little friendly focus.</h1><p>A local leaderboard for your circle of one—and a few demo rivals.</p></div>
      </div>
      <div className="leaderboard-wrap">
        <section className="leaderboard-feature">
          <div>
            <span className="eyebrow">YOUR PERSONAL SCORE</span>
            <h2>{personal.toLocaleString()}<small> pts</small></h2>
            <p>{runs.length ? `${runs.length} sessions in your practice log.` : 'Play a challenge to put your score on the board.'}</p>
          </div>
          <div className="leader-trophy"><Trophy size={35} /><span>RANK<br /><b>#{rank}</b></span></div>
        </section>
        <section className="panel leaderboard-table">
          <div className="table-head"><span>RANK / PLAYER</span><span>SESSIONS</span><span>POINTS</span></div>
          {rows.map((row, index) => {
            const isYou = 'you' in row && row.you;
            return (
              <div className={`leader-row ${isYou ? 'your-row' : ''}`} key={`${row.name}-${index}`} data-testid={`row-leaderboard-${isYou ? 'you' : index}`}>
                <span className="rank-name">
                  <b className={`rank-number ${index < 3 ? 'top' : ''}`}>{String(index + 1).padStart(2, '0')}</b>
                  <span className="avatar small">{initials(row.name)}</span>
                  <span><strong>{row.name} {isYou && <i>YOU</i>}</strong><small>{'demo' in row && row.demo ? 'DEMO PLAYER' : 'Your local profile'}</small></span>
                </span>
                <span className="leader-sessions">{row.sessions}</span>
                <strong className="leader-score">{row.score.toLocaleString()}</strong>
              </div>
            );
          })}
        </section>
        <p className="demo-note"><span className="live-dot" /> Demo players are illustrative. Scores are stored only on this device.</p>
      </div>
    </div>
  );
}
