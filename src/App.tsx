import { useEffect, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { CalendarDays, TrendingUp, ListChecks, Settings as SettingsIcon } from 'lucide-react';
import { Home } from './components/Home';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { SundayCheckin } from './components/SundayCheckin';
import { Progress, type ProgressTab } from './components/Progress';
import { Settings } from './components/Settings';
import { ProgramScreen } from './components/ProgramScreen';
import { PlateCalculator } from './components/PlateCalculator';
import { storage } from './lib/storage';

type Tab = 'today' | 'progress' | 'program' | 'settings';

type Overlay =
  | { kind: 'workout'; workoutId: string; resume: boolean }
  | { kind: 'checkin' }
  | { kind: 'plates' }
  | null;

const TABS: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
  { id: 'today', label: "Aujourd'hui", icon: CalendarDays },
  { id: 'progress', label: 'Progrès', icon: TrendingUp },
  { id: 'program', label: 'Programme', icon: ListChecks },
  { id: 'settings', label: 'Réglages', icon: SettingsIcon },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [progressTab, setProgressTab] = useState<ProgressTab>('exercises');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [program, setProgram] = useState(() => storage.getProgram());
  // Bumped whenever an overlay closes so tab screens re-read storage.
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  const closeOverlay = () => {
    setProgram(storage.getProgram());
    setOverlay(null);
    setDataVersion(v => v + 1);
  };

  const refreshProgram = () => setProgram(storage.getProgram());

  const openProgress = (sub: ProgressTab) => {
    setProgressTab(sub);
    setTab('progress');
  };

  const activeWorkout = overlay?.kind === 'workout' ? program.workouts[overlay.workoutId] : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full min-h-screen bg-bg text-ink">
        <main className="max-w-md mx-auto" aria-hidden={overlay ? true : undefined}>
          {tab === 'today' && (
            <Home
              key={dataVersion}
              program={program}
              onStartWorkout={(id, opts) => setOverlay({ kind: 'workout', workoutId: id, resume: !!opts?.resume })}
              onStartCheckin={() => setOverlay({ kind: 'checkin' })}
              onOpenPlates={() => setOverlay({ kind: 'plates' })}
              onOpenProgress={openProgress}
            />
          )}
          {tab === 'progress' && (
            <Progress
              key={dataVersion}
              program={program}
              tab={progressTab}
              onTabChange={setProgressTab}
              onStartCheckin={() => setOverlay({ kind: 'checkin' })}
            />
          )}
          {tab === 'program' && <ProgramScreen onChanged={refreshProgram} />}
          {tab === 'settings' && <Settings key={dataVersion} onDataChanged={refreshProgram} />}
        </main>

        <nav
          aria-label="Navigation principale"
          className="fixed bottom-0 inset-x-0 z-30 tabbar bg-bg/94 backdrop-blur-md border-t border-line"
        >
          <div className="max-w-md mx-auto grid grid-cols-4 h-[var(--tabbar-h)]">
            {TABS.map(t => {
              const active = t.id === tab;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition ${
                    active ? 'text-ink' : 'text-faint'
                  }`}
                >
                  <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        <AnimatePresence>
          {overlay && (
            <motion.div
              key={overlay.kind}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed inset-0 z-40 bg-bg overflow-y-auto no-scrollbar"
            >
              {overlay.kind === 'workout' && activeWorkout && (
                <WorkoutPlayer
                  workout={activeWorkout}
                  program={program}
                  resumeFromActive={overlay.resume}
                  onClose={closeOverlay}
                />
              )}
              {overlay.kind === 'checkin' && <SundayCheckin onClose={closeOverlay} />}
              {overlay.kind === 'plates' && <PlateCalculator onClose={closeOverlay} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
