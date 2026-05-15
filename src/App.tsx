import { useState } from 'react';
import { Home } from './components/Home';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { SundayCheckin } from './components/SundayCheckin';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { VolumeDashboard } from './components/VolumeDashboard';
import { PlateCalculator } from './components/PlateCalculator';
import { storage } from './lib/storage';
import { motion, AnimatePresence } from 'motion/react';

type View = 'home' | 'workout' | 'checkin' | 'history' | 'settings' | 'volume' | 'plates';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [resumeFlag, setResumeFlag] = useState(false);
  const [program, setProgram] = useState(() => storage.getProgram());

  const startWorkout = (id: string, opts?: { resume?: boolean }) => {
    setActiveWorkoutId(id);
    setResumeFlag(!!opts?.resume);
    setView('workout');
  };

  const goHome = () => {
    setProgram(storage.getProgram());
    setView('home');
    setActiveWorkoutId(null);
    setResumeFlag(false);
  };

  const refreshProgram = () => setProgram(storage.getProgram());

  return (
    <div className="w-full min-h-screen bg-[var(--color-void-0)] text-[#C0D0F0] font-sans selection:bg-[var(--color-signal)]/20">
      <AnimatePresence mode="wait">
        {view === 'workout' && activeWorkoutId && program.workouts[activeWorkoutId] ? (
          <motion.div key="player"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 w-full h-full z-10 bg-[var(--color-void-0)]">
            <WorkoutPlayer
              workout={program.workouts[activeWorkoutId]}
              program={program}
              resumeFromActive={resumeFlag}
              onClose={goHome}
            />
          </motion.div>
        ) : view === 'checkin' ? (
          <motion.div key="checkin"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 w-full h-full z-10 bg-[var(--color-void-0)]">
            <SundayCheckin onClose={goHome} />
          </motion.div>
        ) : view === 'history' ? (
          <motion.div key="history"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="fixed inset-0 w-full h-full z-10 bg-[var(--color-void-0)]">
            <History program={program} onClose={goHome} />
          </motion.div>
        ) : view === 'settings' ? (
          <motion.div key="settings"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="fixed inset-0 w-full h-full z-10 bg-[var(--color-void-0)]">
            <Settings onClose={goHome} onProgramChanged={refreshProgram} />
          </motion.div>
        ) : view === 'volume' ? (
          <motion.div key="volume"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="fixed inset-0 w-full h-full z-10 bg-[var(--color-void-0)]">
            <VolumeDashboard program={program} onClose={goHome} />
          </motion.div>
        ) : view === 'plates' ? (
          <motion.div key="plates"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="fixed inset-0 w-full h-full z-10 bg-[var(--color-void-0)]">
            <PlateCalculator onClose={goHome} />
          </motion.div>
        ) : (
          <motion.div key="home"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Home
              program={program}
              onStartWorkout={startWorkout}
              onStartCheckin={() => setView('checkin')}
              onOpenHistory={() => setView('history')}
              onOpenSettings={() => setView('settings')}
              onOpenVolumeDashboard={() => setView('volume')}
              onOpenPlateCalculator={() => setView('plates')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
