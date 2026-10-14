import { Link } from 'wouter';
import { Activity, ArrowRight, Flame, Gamepad2, Lightbulb, Target, Trophy } from 'lucide-react';
import { games, useStore, type Run } from '@/lib/local-data';

function streakCount(runs: Run[]) {
  const days = new Set(runs.map((run) => new Date(run.date).toDateString()));
  let count = 0;
  const day = new Date();
  if (!days.has(day.toDateString())) day.setDate(day.getDate() - 1);
  while (days.has(day.toDateString())) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

function relativeDate(date: string) {
  const value = new Date(date);
  return value.toDateString() === new Date().toDateString()
    ? 'Today'
    : value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function PageTitle({ kicker, title, description, side }: {
  kicker: string;
  title: string;
  description?: string;
  side?: React.ReactNode;
}) {
  return (
    <div className="page-title-row">
      <div><div className="eyebrow">{kicker}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {side}
    </div>
  );
}

function MiniStat({ label, value, foot, icon: Icon, color = 'violet' }: {
  label: string;
  value: string | number;
  foot: string;
  icon: typeof Activity;
  color?: string;
}) {
  return (
    <article className="stat-card" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className={`stat-icon ${color}`}><Icon size={17} /></div>
      <span className="stat-label">{label}</span><strong>{value}</strong><small>{foot}</small>
    </article>
  );
}

export function DashboardPage() {
  const { runs } = useStore();
  const total = runs.length;
  const average = total ? Math.round(runs.reduce((sum, run) => sum + run.accuracy, 0) / total) : 0;
  const topScore = total ? Math.max(...runs.map((run) => run.score)) : 0;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dayRuns = runs.filter((run) => new Date(run.date).toDateString() === date.toDateString());
    return { day: date.toLocaleDateString(undefined, { weekday: 'short' }), count: dayRuns.length };
  });

  return (
    <div className="page-stack">
      <PageTitle kicker="YOUR COGNITIVE PROFILE" title="Progress, in perspective." description="Every session adds a little more signal to the picture." side={<span className="date-chip"><Activity size={14} /> LAST 7 DAYS</span>} />
      <div className="metric-row">
        <MiniStat label="Total sessions" value={total} foot="Across all challenges" icon={Gamepad2} />
        <MiniStat label="Average accuracy" value={`${average}%`} foot="All-time performance" icon={Target} color="mint" />
        <MiniStat label="Top score" value={topScore} foot="Your highest single run" icon={Trophy} color="amber" />
        <MiniStat label="Practice streak" value={`${streakCount(runs)} days`} foot="Consecutive days active" icon={Flame} color="pink" />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">CONSISTENCY OVER TIME</span><h3>Your practice rhythm</h3></div>
            <span className="chart-legend"><i /> Sessions</span>
          </div>
          <div className="bar-chart" data-testid="chart-weekly-sessions">
            {week.map((day, index) => (
              <div className="bar-column" key={`${day.day}-${index}`}>
                <span className="bar-count">{day.count || ''}</span>
                <div className="bar-track"><i style={{ height: `${day.count ? Math.max(14, Math.min(100, day.count * 28)) : 4}%` }} /></div>
                <small>{day.day}</small>
              </div>
            ))}
          </div>
          <div className="chart-foot"><span><span className="live-dot" /> {total ? `${total} sessions logged` : 'Your sessions will build this chart'}</span><span>LAST 7 DAYS</span></div>
        </section>
        <section className="panel accuracy-panel">
          <div className="panel-heading"><div><span className="eyebrow">PRECISION CHECK</span><h3>Accuracy by game</h3></div><Target size={17} className="muted-icon" /></div>
          {games.map((game) => {
            const gameRuns = runs.filter((run) => run.game === game.id);
            const accuracy = gameRuns.length
              ? Math.round(gameRuns.reduce((sum, run) => sum + run.accuracy, 0) / gameRuns.length)
              : 0;
            return (
              <div className="accuracy-row" key={game.id} data-testid={`data-accuracy-${game.id}`}>
                <span className={`accuracy-dot ${game.color}`} /><span>{game.title}</span>
                <div className="accuracy-line"><i style={{ width: `${accuracy}%` }} /></div>
                <b>{gameRuns.length ? `${accuracy}%` : '—'}</b>
              </div>
            );
          })}
          <div className="accuracy-foot"><Lightbulb size={15} /> Accuracy grows with consistent reps.</div>
        </section>
      </div>
      <section className="panel records-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">YOUR PERSONAL RECORDS</span><h3>Best runs</h3></div>
          <Link href="/history" className="subtle-link" data-testid="link-record-history">Session history <ArrowRight size={14} /></Link>
        </div>
        <div className="record-list">
          {games.map((game, index) => {
            const bestRun = runs.filter((run) => run.game === game.id).sort((a, b) => b.score - a.score)[0];
            return (
              <div className="record-row" key={game.id} data-testid={`record-best-${game.id}`}>
                <span className="record-rank">0{index + 1}</span>
                <span className={`recent-icon ${game.color}`}>{game.icon}</span>
                <b>{game.title}</b><span className="record-date">{bestRun ? relativeDate(bestRun.date) : 'No record yet'}</span>
                <strong>{bestRun ? bestRun.score : '—'}{bestRun && <small> pts</small>}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
