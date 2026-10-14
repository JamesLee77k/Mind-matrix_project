import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ArrowRight, BarChart3, Brain, ChevronRight, Code2, Flame, History, Home as HomeIcon, Moon, Sparkles, Sun, Trophy } from 'lucide-react';
import { useStore, type Run } from '@/lib/local-data';
import { DashboardPage } from '@/pages/dashboard';
import { GamePage } from '@/pages/game';
import { HistoryPage } from '@/pages/history';
import { HomePage } from '@/pages/home';
import { LabPage } from '@/pages/lab';
import { LeaderboardPage } from '@/pages/leaderboard';
import NotFound from '@/pages/not-found';
import { ProfilePage } from '@/pages/profile';

const queryClient = new QueryClient();

const navItems = [
  { path: '/', label: 'Today', icon: HomeIcon },
  { path: '/dashboard', label: 'Progress', icon: BarChart3 },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/history', label: 'Session history', icon: History },
  { path: '/lab', label: '8085 assembly lab', icon: Code2 },
];

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'MM';
}

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

function AppShell({ children }: { children: React.ReactNode }) {
  const [path] = useLocation();
  const store = useStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', store.profile.theme === 'dark');
  }, [store.profile.theme]);

  const currentPage = navItems.find((item) => item.path === path)?.label
    ?? (path.startsWith('/games') ? 'Training room' : path.slice(1));
  const todayKey = new Date().toDateString();
  const sessionsToday = new Set(store.runs.filter((run) => new Date(run.date).toDateString() === todayKey).map((run) => run.game)).size;

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand" data-testid="link-home">
          <span className="brand-mark"><Brain size={21} /></span>
          <span>mind<span className="brand-light">matrix</span><small>COGNITIVE STUDIO</small></span>
        </Link>
        <div className="nav-label">YOUR SPACE</div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = path === item.path;
            return (
              <Link href={item.path} key={item.path} className={`nav-link ${active ? 'active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon size={17} /><span>{item.label}</span>{item.path === '/lab' && <span className="nav-new">CPU</span>}
              </Link>
            );
          })}
        </nav>
        <div className="side-challenge">
          <div className="challenge-spark"><Sparkles size={16} /></div>
          <span className="eyebrow">DAILY FOCUS</span>
          <strong>One good rep<br />at a time.</strong>
          <span className="challenge-progress"><i style={{ width: `${Math.min(100, sessionsToday * 25)}%` }} /></span>
          <small>{sessionsToday} of 4 sessions today</small>
        </div>
        <Link href="/profile" className={`profile-mini ${path === '/profile' ? 'active' : ''}`} data-testid="link-profile">
          <span className="avatar">{initials(store.profile.name)}</span>
          <span className="profile-copy"><b>{store.profile.name}</b><small><Flame size={12} /> {streakCount(store.runs)} day streak</small></span>
          <ChevronRight size={15} />
        </Link>
        <button className="theme-toggle" onClick={() => store.update({ profile: { ...store.profile, theme: store.profile.theme === 'dark' ? 'light' : 'dark' } })} data-testid="button-toggle-theme">
          {store.profile.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>Switch to {store.profile.theme === 'dark' ? 'light' : 'dark'} mode</span>
        </button>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="crumb"><span>MindMatrix</span><ChevronRight size={14} /><b>{currentPage}</b></div>
          <div className="top-actions"><span className="top-today"><span className="live-dot" /> YOUR DAILY PRACTICE</span><Link href="/profile" className="top-avatar" data-testid="link-account">{initials(store.profile.name)}</Link></div>
        </header>
        <main className="page-content">{children}</main>
        <footer className="page-footer"><span>MindMatrix <i>·</i> Small reps. Stronger focus.</span><Link href="/lab" data-testid="link-footer-lab">Explore the 8085 lab <ArrowRight size={13} /></Link></footer>
      </div>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/lab" component={LabPage} />
          <Route path="/games/:id" component={GamePage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
