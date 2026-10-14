import { Link } from 'wouter';
import { ArrowRight, BarChart3, Brain, Check, Clock3, Code2, Flame, Gamepad2, Sparkles, Target, Trophy } from 'lucide-react';
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

function bestCount(runs: Run[]) {
  return new Set(
    runs
      .filter((run) => run.score >= Math.max(0, ...runs.filter((item) => item.game === run.game).map((item) => item.score)))
      .map((run) => run.game),
  ).size;
}

function relativeDate(date: string) {
  const value = new Date(date);
  return value.toDateString() === new Date().toDateString()
    ? 'Today'
    : value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MiniStat({ label, value, foot, icon: Icon, color = 'violet' }: {
  label: string;
  value: string | number;
  foot: string;
  icon: typeof Gamepad2;
  color?: string;
}) {
  return (
    <article className="stat-card" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className={`stat-icon ${color}`}><Icon size={17} /></div>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{foot}</small>
    </article>
  );
}

function getDailyChallenge() {
  const today = new Date();
  const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000);
  return games[((dayNumber % games.length) + games.length) % games.length];
}

function Achievement({ title, criteria, earned, testId }: {
  title: string;
  criteria: string;
  earned: boolean;
  testId: string;
}) {
  return (
    <article className={`achievement-card ${earned ? 'earned' : 'locked'}`} data-testid={testId}>
      <span className="achievement-mark">{earned ? <Check size={16} /> : <span aria-hidden="true">· · ·</span>}</span>
      <span className="achievement-copy">
        <b>{title}</b>
        <small>{criteria}</small>
      </span>
      <span className="achievement-state">{earned ? 'EARNED' : 'LOCKED'}</span>
    </article>
  );
}

export function HomePage() {
  const data = useStore();
  const total = data.runs.length;
  const avg = total ? Math.round(data.runs.reduce((sum, run) => sum + run.accuracy, 0) / total) : 0;
  const recent = data.runs.slice(0, 3);
  const todayKey = new Date().toDateString();
  const todayRuns = data.runs.filter((run) => new Date(run.date).toDateString() === todayKey);
  const dailyDone = new Set(todayRuns.map((run) => run.game)).size;
  const dailyChallenge = getDailyChallenge();
  const challengeCompleted = todayRuns.some((run) => run.game === dailyChallenge.id);
  const playedGames = new Set(data.runs.map((run) => run.game));
  const streak = streakCount(data.runs);
  const achievements = [
    { id: 'first-rep', title: 'First rep', criteria: 'Save your first completed game run.', earned: total >= 1 },
    { id: 'four-corners', title: 'Four corners', criteria: 'Complete at least one run in all four games.', earned: games.every((game) => playedGames.has(game.id)) },
    { id: 'steady-hand', title: 'Steady hand', criteria: 'Reach 80% accuracy in a completed run.', earned: data.runs.some((run) => run.accuracy >= 80) },
    { id: 'three-day-rhythm', title: 'Three-day rhythm', criteria: 'Practice on three consecutive days.', earned: streak >= 3 },
    { id: 'deep-practice', title: 'Deep practice', criteria: 'Save ten completed game runs.', earned: total >= 10 },
  ];

  return (
    <div className="page-stack">
      <div className="welcome-line">
        <div>
          <div className="eyebrow"><span className="live-dot" /> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
          <h1>Good to see you, {data.profile.name.split(' ')[0]}<span className="violet-dot">.</span></h1>
          <p>Your mind is a muscle. Give it a few good reps today.</p>
        </div>
        <Link className="outline-button" href="/dashboard" data-testid="link-view-progress"><BarChart3 size={16} /> View progress</Link>
      </div>

      <section className="hero-banner">
        <div className="hero-copy">
          <span className="pill"><Sparkles size={13} /> TODAY'S MINDSET</span>
          <h2>Make a little<br /><em>room to think.</em></h2>
          <p>Four quick challenges. A clearer head. Start wherever your curiosity lands.</p>
          <a className="button-primary" href="#challenges" onClick={(event) => {
            event.preventDefault();
            document.getElementById('challenges')?.scrollIntoView({ behavior: 'smooth' });
          }} data-testid="button-start-practice">Choose your first rep <ArrowRight size={16} /></a>
        </div>
        <div className="brain-art" aria-label="Abstract neural network illustration">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="brain-core"><Brain size={76} strokeWidth={1.2} /></div>
          <span className="node node-a" /><span className="node node-b" /><span className="node node-c" /><span className="node node-d" />
          <span className="art-tag">NEURAL<br />ACTIVITY</span>
          <div className="art-readout"><span>FOCUS INDEX</span><b>{total ? Math.min(99, 71 + avg % 21) : '—'}<small>/100</small></b></div>
        </div>
        <div className="hero-meta">
          <span><i className="hero-bullet mint" /> {Math.min(4, dailyDone)} / 4 daily sessions</span>
          <span><i className="hero-bullet violet" /> BUILT FOR 5-MIN BREAKS</span>
        </div>
      </section>

      <section className="metric-row">
        <MiniStat label="Sessions played" value={total} foot={total ? 'Every rep counts' : 'Your first rep starts here'} icon={Gamepad2} />
        <MiniStat label="Average accuracy" value={`${avg}%`} foot={total ? 'Across all challenges' : 'Tracked as you play'} icon={Target} color="mint" />
        <MiniStat label="Current streak" value={`${streak} days`} foot="Keep the rhythm going" icon={Flame} color="amber" />
        <MiniStat label="Personal bests" value={bestCount(data.runs)} foot="Records across 4 games" icon={Trophy} color="pink" />
      </section>

      <section className="daily-challenge-card" data-testid="daily-challenge-card">
        <div className="daily-challenge-copy">
          <span className="eyebrow">TODAY'S DAILY CHALLENGE · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</span>
          <h2>{dailyChallenge.title}</h2>
          <p>{challengeCompleted
            ? 'Completed today. Your saved run counts toward this challenge.'
            : `Train ${dailyChallenge.skill.toLowerCase()} with today's featured session.`}</p>
          <Link href={`/games/${dailyChallenge.id}`} className={challengeCompleted ? 'outline-button' : 'button-primary'} data-testid="link-play-daily-challenge">
            {challengeCompleted ? 'Play another run' : 'Play today’s challenge'} <ArrowRight size={15} />
          </Link>
        </div>
        <span className={`daily-challenge-icon ${dailyChallenge.color}`}>{dailyChallenge.icon}</span>
        <span className={`daily-challenge-status ${challengeCompleted ? 'complete' : ''}`} data-testid="status-daily-challenge">
          {challengeCompleted ? <><Check size={13} /> COMPLETE</> : 'READY'}
        </span>
      </section>

      <section id="challenges" className="section-block">
        <div className="section-heading">
          <div><div className="eyebrow">PICK YOUR PRACTICE</div><h2>Today's challenges</h2></div>
          <span className="section-note"><Clock3 size={14} /> All under 2 minutes</span>
        </div>
        <div className="challenge-grid">
          {games.map((game, index) => (
            <Link href={`/games/${game.id}`} key={game.id} className={`game-card ${game.color}`} data-testid={`link-game-${game.id}`}>
              <span className="game-card-index">0{index + 1} / 04</span>
              <div className="game-symbol">{game.icon}</div>
              <span className="game-skill">{game.skill}</span>
              <h3>{game.title}</h3><p>{game.description}</p>
              <div className="game-card-foot"><span><Clock3 size={13} />{game.time}</span><span className="card-arrow"><ArrowRight size={16} /></span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block achievements-section">
        <div className="section-heading">
          <div><div className="eyebrow">MILESTONES, NOT MEDALS</div><h2>Achievements</h2></div>
          <span className="section-note" data-testid="text-achievement-count">{achievements.filter((achievement) => achievement.earned).length} earned · {achievements.length - achievements.filter((achievement) => achievement.earned).length} locked</span>
        </div>
        <div className="achievement-grid">
          {achievements.map((achievement) => (
            <Achievement key={achievement.id} testId={`achievement-${achievement.id}`} {...achievement} />
          ))}
        </div>
      </section>

      <div className="home-bottom">
        <section className="panel daily-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">THE DAILY FOUR</span><h3>Practice, in any order</h3></div>
            <span className="daily-count">{dailyDone}<small>/4</small></span>
          </div>
          <p>Every game trains a different kind of attention. Pick one, or make a circuit of all four.</p>
          <div className="daily-track">{games.map((game) => {
            const completed = todayRuns.some((run) => run.game === game.id);
            return <span key={game.id} className={completed ? 'done' : ''} title={`${game.title}${completed ? ' completed today' : ''}`}><i>{completed ? <Check size={13} /> : null}</i></span>;
          })}</div>
          <Link href="/dashboard" className="text-link" data-testid="link-daily-progress">See your practice rhythm <ArrowRight size={14} /></Link>
        </section>
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">JUST PLAYED</span><h3>Recent sessions</h3></div>
            <Link href="/history" className="subtle-link" data-testid="link-all-history">All history <ArrowRight size={14} /></Link>
          </div>
          {recent.length ? (
            <div className="recent-list">{recent.map((run) => {
              const game = games.find((item) => item.id === run.game);
              return <div className="recent-row" key={run.id}>
                <span className={`recent-icon ${game?.color}`}>{game?.icon}</span>
                <span className="recent-name"><b>{game?.title ?? run.game}</b><small>{relativeDate(run.date)} · {run.duration}s</small></span>
                <strong>{run.score}<small> pts</small></strong>
              </div>;
            })}</div>
          ) : (
            <div className="empty-small"><span className="empty-orbit"><Gamepad2 size={19} /></span><b>No sessions yet</b><small>Your first result will appear here.</small></div>
          )}
        </section>
      </div>

      <section className="lab-teaser">
        <div className="lab-chip"><Code2 size={18} /></div>
        <div><span className="eyebrow">A LITTLE DEEPER</span><h3>Want to see your score in assembly?</h3><p>Step through real 8085 instructions and watch the machine evaluate your result.</p></div>
        <Link href="/lab" className="outline-button" data-testid="link-open-lab">Open the 8085 lab <ArrowRight size={15} /></Link>
        <span className="binary-decoration">MOV A, 2AH<br />CMP B<br />JZ PASS</span>
      </section>
    </div>
  );
}
