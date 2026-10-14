import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Check, Moon, Sun } from 'lucide-react';
import { useStore } from '@/lib/local-data';

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'MM';
}

export function ProfilePage() {
  const { profile, update, runs } = useStore();
  const [name, setName] = useState(profile.name);
  const [saved, setSaved] = useState(false);

  useEffect(() => setName(profile.name), [profile.name]);

  const save = () => {
    update({ profile: { ...profile, name: name.trim() || 'Player', theme: profile.theme } });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="page-stack">
      <div className="page-title-row">
        <div><div className="eyebrow">YOUR SPACE, YOUR SETTINGS</div><h1>Player profile</h1><p>A few details make this space yours.</p></div>
      </div>
      <div className="profile-layout">
        <section className="panel profile-card">
          <div className="profile-hero">
            <span className="avatar large">{initials(profile.name)}</span>
            <div><span className="eyebrow">LOCAL PLAYER</span><h2>{profile.name}</h2><p>Practice profile · saved on this device</p></div>
          </div>
          <label className="field-label" htmlFor="player-name">DISPLAY NAME</label>
          <input id="player-name" className="text-input" value={name} maxLength={32} onChange={(event) => setName(event.target.value)} data-testid="input-profile-name" />
          <button className="button-primary profile-save" onClick={save} data-testid="button-save-profile">
            {saved ? <><Check size={15} /> Saved</> : <>Save changes <ArrowRight size={15} /></>}
          </button>
        </section>
        <section className="panel preferences-card">
          <span className="eyebrow">PREFERENCES</span><h3>Make it comfortable.</h3><p>Your theme is remembered on this device.</p>
          <div className="theme-options">
            <button className={`theme-option ${profile.theme === 'dark' ? 'selected' : ''}`} onClick={() => update({ profile: { ...profile, theme: 'dark' } })} data-testid="button-theme-dark">
              <Moon size={19} /><b>Night mode</b><small>Deep navy, bright focus</small>{profile.theme === 'dark' && <Check size={15} className="theme-check" />}
            </button>
            <button className={`theme-option ${profile.theme === 'light' ? 'selected' : ''}`} onClick={() => update({ profile: { ...profile, theme: 'light' } })} data-testid="button-theme-light">
              <Sun size={19} /><b>Day mode</b><small>Soft lavender, clear light</small>{profile.theme === 'light' && <Check size={15} className="theme-check" />}
            </button>
          </div>
        </section>
      </div>
      <div className="profile-footnote">
        <span><Activity size={16} /></span><div><b>Your data stays yours.</b><small>{runs.length} session{runs.length === 1 ? '' : 's'} saved locally. Nothing is sent to a server.</small></div>
      </div>
    </div>
  );
}
