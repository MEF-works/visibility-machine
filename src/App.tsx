import React, { useState, useEffect } from 'react';
import { DashboardView } from './components/DashboardView';
import { BuildLogView } from './components/BuildLogView';
import { ProofVaultView } from './components/ProofVaultView';
import { PostFactoryView } from './components/PostFactoryView';
import { MediaEditor } from './components/MediaEditor';
import { AngleFinderView } from './components/AngleFinderView';
import { LaunchPadView } from './components/LaunchPadView';
import { DispatchCalendarView } from './components/DispatchCalendarView';
import { MoneyBoardView } from './components/MoneyBoardView';
import { GrowthTrackerView } from './components/GrowthTrackerView';
import { ReuseLibraryView } from './components/ReuseLibraryView';
import { SettingsView } from './components/SettingsView';
import {
  Activity, Terminal, FolderLock, Flame, Scissors, BrainCircuit,
  Settings, AlignLeft, Rocket, Calendar, DollarSign, TrendingUp, Gem,
} from 'lucide-react';

type Tab =
  | 'dashboard' | 'build-log' | 'proof-vault' | 'clip-builder'
  | 'post-factory' | 'dispatch' | 'reuse-library'
  | 'launch-pad' | 'money-board' | 'growth-tracker' | 'angle-finder';

type NavSection = { label: string; items: { id: Tab; label: string; icon: React.ElementType }[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Command',
    items: [{ id: 'dashboard', label: 'Visibility Dashboard', icon: Activity }],
  },
  {
    label: 'Capture',
    items: [
      { id: 'build-log', label: 'Build Log', icon: Terminal },
      { id: 'proof-vault', label: 'Proof Vault', icon: FolderLock },
      { id: 'clip-builder', label: 'Clip Builder', icon: Scissors },
    ],
  },
  {
    label: 'Distribute',
    items: [
      { id: 'post-factory', label: 'Post Factory', icon: Flame },
      { id: 'dispatch', label: 'Dispatch Calendar', icon: Calendar },
      { id: 'reuse-library', label: 'Reuse Library', icon: Gem },
    ],
  },
  {
    label: 'Launch & Grow',
    items: [
      { id: 'launch-pad', label: 'Launch Pad', icon: Rocket },
      { id: 'money-board', label: 'Money Board', icon: DollarSign },
      { id: 'growth-tracker', label: 'Growth Tracker', icon: TrendingUp },
      { id: 'angle-finder', label: 'Angle Finder', icon: BrainCircuit },
    ],
  },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [postFactoryLogId, setPostFactoryLogId] = useState<string | null>(null);

  const goToPostFactory = (buildLogId?: string) => {
    if (buildLogId) setPostFactoryLogId(buildLogId);
    setCurrentTab('post-factory');
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setCurrentTab('build-log');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setCurrentTab('post-factory');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative selection:bg-brand-amber/30">
      <div className="scanline-overlay" />
      <div className="glow-mesh top-[-100px] left-[-100px] bg-brand-amber" />
      <div className="glow-mesh bottom-[-100px] right-[-100px] bg-brand-cyan" />

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/60 p-5 transform transition-transform duration-300 flex flex-col ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } lg:sticky lg:top-0 lg:h-screen lg:w-72 overflow-y-auto custom-scrollbar`}>
        <div className="space-y-5 flex-1">
          <div className="flex items-center gap-3 border-b border-slate-800/60 pb-5">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-brand-amber to-brand-cyan flex items-center justify-center shadow-lg border border-brand-amber/30">
              <Terminal className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-lg font-display font-black text-slate-100 tracking-tight leading-none">VISIBILITY</h1>
              <span className="text-[10px] font-mono font-bold tracking-widest text-brand-cyan">MACHINE</span>
            </div>
          </div>

          {NAV_SECTIONS.map(section => (
            <nav key={section.label} className="space-y-1">
              <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block px-3 mb-1.5">
                {section.label}
              </span>
              {section.items.map(tab => {
                const IconComp = tab.icon;
                const active = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setCurrentTab(tab.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                      active ? 'bg-slate-900 border-slate-800 text-white shadow-xs' : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-brand-amber animate-pulse' : 'bg-transparent'}`} />
                    <IconComp className={`w-4 h-4 shrink-0 ${active ? 'text-brand-amber' : 'text-slate-500'}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          ))}
        </div>

        <div className="border-t border-slate-800/60 pt-4 mt-4 space-y-3">
          <button onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900/50">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <div className="p-3 bg-slate-900/65 rounded-xl border border-slate-850/65">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Mandate</span>
            <span className="text-[10px] text-brand-cyan block font-mono mt-0.5 italic">no build dies in private</span>
            <span className="text-[9px] text-slate-600 block font-mono mt-1">Ctrl+B build · Ctrl+P post</span>
          </div>
        </div>
      </aside>

      <header className="lg:hidden bg-slate-900/90 border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
        <h1 className="text-base font-display font-extrabold">VISIBILITY MACHINE</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="bg-slate-850 border border-slate-750 p-2 rounded-xl text-slate-300">
          <AlignLeft className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-grow min-w-0 p-4 sm:p-6 lg:p-8 relative z-10">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateToBuildLog={() => setCurrentTab('build-log')}
            onNavigateToPostFactory={goToPostFactory}
            onNavigateToProofVault={() => setCurrentTab('proof-vault')}
            onNavigateToLaunchPad={() => setCurrentTab('launch-pad')}
            onNavigateToDispatch={() => setCurrentTab('dispatch')}
            onNavigateToMoneyBoard={() => setCurrentTab('money-board')}
          />
        )}
        {currentTab === 'build-log' && (
          <BuildLogView onOpenPostFactory={goToPostFactory} onOpenProofVault={() => setCurrentTab('proof-vault')} />
        )}
        {currentTab === 'proof-vault' && <ProofVaultView />}
        {currentTab === 'post-factory' && <PostFactoryView initialBuildLogId={postFactoryLogId} onNavigateToDispatch={() => setCurrentTab('dispatch')} />}
        {currentTab === 'clip-builder' && <MediaEditor />}
        {currentTab === 'dispatch' && <DispatchCalendarView />}
        {currentTab === 'reuse-library' && <ReuseLibraryView />}
        {currentTab === 'launch-pad' && (
          <LaunchPadView onOpenPostFactory={goToPostFactory} onOpenBuildLog={() => setCurrentTab('build-log')} />
        )}
        {currentTab === 'money-board' && <MoneyBoardView />}
        {currentTab === 'growth-tracker' && <GrowthTrackerView />}
        {currentTab === 'angle-finder' && <AngleFinderView />}
      </main>

      <SettingsView open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
