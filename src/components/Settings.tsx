import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, Download, Upload, Volume2, VolumeX, Vibrate, Trash2, Database, Shield } from "lucide-react";
import { storage, AppSettings } from "../lib/storage";

interface Props { onClose: () => void; }

export function Settings({ onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [stats, setStats] = useState(() => ({
    sessions: storage.getSessions().length,
    checkins: storage.getCheckins().length,
  }));
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    storage.saveSettings(next);
  };

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2200);
  };

  const exportData = () => {
    const payload = storage.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `routine-backup-${stamp}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Sauvegarde exportée (${payload.sessions.length} séances)`);
  };

  const onImportFile = async (file: File, mode: 'replace' | 'merge') => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      storage.importAll(parsed, mode);
      setStats({
        sessions: storage.getSessions().length,
        checkins: storage.getCheckins().length,
      });
      flash(`Import réussi (${mode === 'merge' ? 'fusion' : 'remplacement'})`);
    } catch (e: any) {
      flash(`Erreur : ${e?.message || "fichier invalide"}`);
    }
  };

  const wipe = () => {
    if (!confirm("Effacer TOUTES les données locales ? Cette action est irréversible.")) return;
    storage.wipeAll();
    setStats({ sessions: 0, checkins: 0 });
    setSettings(storage.getSettings());
    flash("Toutes les données ont été effacées.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-ink-0)] text-white max-w-md mx-auto">
      <div className="sticky top-0 z-10 bg-[var(--color-ink-0)]/85 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center p-4">
          <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 active:text-white">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="font-display font-bold text-xs tracking-[0.3em] text-zinc-400 uppercase mx-auto -ml-7">Réglages</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-6 pb-12">
        {/* Stats summary */}
        <div className="rounded-2xl bg-gradient-to-br from-[var(--color-ink-1)] to-[var(--color-ink-2)] border border-white/5 p-5">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-500 mb-3">
            <Database className="w-3.5 h-3.5" /> Données locales
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Séances" value={stats.sessions} />
            <Stat label="Check-ins" value={stats.checkins} />
          </div>
        </div>

        {/* Default rest */}
        <Section title="Repos par défaut">
          <div className="flex items-center gap-3">
            <input
              type="range" min={30} max={300} step={15}
              value={settings.defaultRest}
              onChange={e => update({ defaultRest: Number(e.target.value) })}
              className="flex-1 accent-emerald-400"
            />
            <div className="w-20 text-right font-mono tnum font-bold text-base">{settings.defaultRest}s</div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Utilisé pour les exercices sans repos défini.</p>
        </Section>

        {/* Sound + vibrate */}
        <Section title="Notifications">
          <Toggle
            icon={settings.soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            label="Son de fin de repos"
            active={settings.soundOn}
            onChange={v => update({ soundOn: v })}
          />
          <Toggle
            icon={<Vibrate className="w-4 h-4" />}
            label="Vibration"
            active={settings.vibrate}
            onChange={v => update({ vibrate: v })}
          />
        </Section>

        {/* Backup */}
        <Section title="Sauvegarde">
          <button
            onClick={exportData}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white text-black font-bold active:scale-[0.99] transition"
          >
            <Download className="w-5 h-5" />
            <div className="text-left flex-1">
              <div className="text-sm">Exporter en JSON</div>
              <div className="text-[11px] font-normal text-black/60">Télécharge toutes les données.</div>
            </div>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f, 'merge');
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-[var(--color-ink-2)] border border-white/10 active:scale-[0.99] transition mt-2"
          >
            <Upload className="w-5 h-5 text-emerald-400" />
            <div className="text-left flex-1">
              <div className="text-sm font-bold">Importer un JSON</div>
              <div className="text-[11px] text-zinc-500">Fusion avec les données existantes.</div>
            </div>
          </button>

          <p className="text-[11px] text-zinc-500 mt-3 flex items-start gap-2">
            <Shield className="w-3 h-3 mt-0.5 text-zinc-600 shrink-0" />
            Tes données restent stockées sur cet appareil. L'export te sert de filet en cas de changement de téléphone ou de cache navigateur effacé.
          </p>
        </Section>

        {/* Danger zone */}
        <Section title="Zone sensible" tone="danger">
          <button
            onClick={wipe}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 active:scale-[0.99] transition"
          >
            <Trash2 className="w-5 h-5" />
            <div className="text-left flex-1">
              <div className="text-sm font-bold">Tout effacer</div>
              <div className="text-[11px] font-normal text-red-300/60">Séances, check-ins, réglages.</div>
            </div>
          </button>
        </Section>
      </div>

      {feedback && (
        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-30">
          <div className="bg-emerald-400 text-black font-bold text-sm px-4 py-3 rounded-xl shadow-lg text-center">
            {feedback}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone?: "danger"; children: ReactNode }) {
  return (
    <div>
      <div className={`text-[10px] tracking-[0.3em] uppercase font-bold mb-3 px-1 ${tone === "danger" ? "text-red-400" : "text-zinc-500"}`}>{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">{label}</div>
      <div className="font-display font-bold text-3xl tnum">{value}</div>
    </div>
  );
}

function Toggle({ icon, label, active, onChange }: { icon: ReactNode; label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-ink-2)] border border-white/5 active:scale-[0.99] transition"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-zinc-500"}`}>
        {icon}
      </div>
      <div className="text-sm font-bold flex-1 text-left">{label}</div>
      <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${active ? "bg-emerald-400" : "bg-white/10"}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </button>
  );
}
