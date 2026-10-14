import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, History } from 'lucide-react';
import { games, useStore } from '@/lib/local-data';

export function HistoryPage() {
  const { runs } = useStore();
  const [filter, setFilter] = useState('all');
  const filteredRuns = filter === 'all' ? runs : runs.filter((run) => run.game === filter);

  return (
    <div className="page-stack">
      <div className="page-title-row">
        <div><div className="eyebrow">YOUR TRAINING LOG</div><h1>Session history</h1><p>A record of the work you put in.</p></div>
        <span className="date-chip">{runs.length} SESSION{runs.length === 1 ? '' : 'S'}</span>
      </div>
      <div className="filter-row">
        <button className={filter === 'all' ? 'filter active' : 'filter'} onClick={() => setFilter('all')} data-testid="filter-history-all">All sessions</button>
        {games.map((game) => (
          <button key={game.id} className={filter === game.id ? 'filter active' : 'filter'} onClick={() => setFilter(game.id)} data-testid={`filter-history-${game.id}`}>{game.title}</button>
        ))}
      </div>
      {filteredRuns.length ? (
        <section className="panel history-table">
          <div className="history-head"><span>CHALLENGE</span><span>DATE</span><span>DIFFICULTY</span><span>ACCURACY</span><span>SCORE</span></div>
          {filteredRuns.map((run) => {
            const game = games.find((item) => item.id === run.game);
            return (
              <div className="history-row" key={run.id} data-testid={`row-history-${run.id}`}>
                <span className="history-game"><span className={`recent-icon ${game?.color}`}>{game?.icon}</span><b>{game?.title ?? run.game}</b></span>
                <span>{new Date(run.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <span className="difficulty-tag">{run.difficulty}</span><span>{run.accuracy}%</span><strong>{run.score}</strong>
              </div>
            );
          })}
        </section>
      ) : (
        <div className="empty-state">
          <span className="empty-orbit"><History size={23} /></span>
          <h3>{runs.length ? 'No sessions in this view' : 'Your next session starts the story.'}</h3>
          <p>{runs.length ? 'Try another filter to see your activity.' : 'Play a quick challenge and your results will be saved here.'}</p>
          <Link href={runs.length ? '/' : '/games/memory-match'} className="button-primary" data-testid="link-history-empty">
            {runs.length ? 'Explore challenges' : 'Play memory matrix'} <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
