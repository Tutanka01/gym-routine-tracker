import { useRef, useState, type ReactNode } from "react";
import { Download, Upload, Volume2, Vibrate, Trash2, ShieldCheck } from "lucide-react";
import { storage, type AppSettings } from "../lib/storage";
import { shareBackupFile } from "../lib/native";
import { ConfirmSheet, PageTitle, SectionLabel, Toast } from "./ui";

const fmtRest = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}` : ""}` : `${s} s`);

export function Settings({ onDataChanged }: { onDataChanged?: () => void }) {
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [counts, setCounts] = useState(() => ({
    sessions: storage.getSessions().length,
    checkins: storage.getCheckins().length,
  }));
  const [toast, setToast] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    storage.saveSettings(next);
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const refreshCounts = () => setCounts({ sessions: storage.getSessions().length, checkins: storage.getCheckins().length });

  const exportData = async () => {
    const payload = storage.exportAll();
    const data = JSON.stringify(payload, null, 2);
    const filename = `routine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const message = `Sauvegarde exportée (${payload.sessions.length} séances)`;

    if (await shareBackupFile(filename, data)) { flash(message); return; }

    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(message);
  };

  const onImportFile = async (file: File) => {
    try {
      storage.importAll(JSON.parse(await file.text()), "merge");
      refreshCounts();
      setSettings(storage.getSettings());
      onDataChanged?.();
      flash("Sauvegarde importée et fusionnée");
    } catch (e: any) {
      flash(`Import impossible : ${e?.message || "fichier invalide"}`);
    }
  };

  return (
    <div className="tab-page">
      <PageTitle>Réglages</PageTitle>

      <div className="space-y-8">
        <section>
          <SectionLabel aside={fmtRest(settings.defaultRest)}>Repos par défaut</SectionLabel>
          <div className="rounded-2xl bg-surface border border-line p-4">
            <input
              type="range" min={30} max={300} step={15}
              value={settings.defaultRest}
              onChange={e => update({ defaultRest: Number(e.target.value) })}
              aria-label="Durée de repos par défaut"
              aria-valuetext={fmtRest(settings.defaultRest)}
              className="w-full h-8"
            />
            <p className="text-sm text-faint mt-1">Utilisé quand un exercice n'a pas de repos défini dans le programme.</p>
          </div>
        </section>

        <section>
          <SectionLabel>Fin du repos</SectionLabel>
          <div className="rounded-2xl bg-surface border border-line divide-y divide-line">
            <Toggle icon={<Volume2 className="w-5 h-5" />} label="Son" active={settings.soundOn} onChange={v => update({ soundOn: v })} />
            <Toggle icon={<Vibrate className="w-5 h-5" />} label="Vibration" active={settings.vibrate} onChange={v => update({ vibrate: v })} />
          </div>
        </section>

        <section>
          <SectionLabel aside={`${counts.sessions} séances, ${counts.checkins} check-ins`}>Sauvegarde</SectionLabel>
          <div className="rounded-2xl bg-surface border border-line divide-y divide-line">
            <Row icon={<Download className="w-5 h-5" />} title="Exporter mes données" sub="Fichier JSON avec séances, check-ins et programme" onClick={exportData} />
            <Row icon={<Upload className="w-5 h-5" />} title="Importer une sauvegarde" sub="Fusionne avec les données actuelles" onClick={() => fileRef.current?.click()} />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = "";
            }}
          />
          <p className="flex items-start gap-2 text-sm text-faint mt-3 px-0.5">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            Tout reste sur cet appareil. Exporte de temps en temps pour ne rien perdre en changeant de téléphone.
          </p>
        </section>

        <section>
          <div className="rounded-2xl bg-surface border border-line">
            <Row icon={<Trash2 className="w-5 h-5" />} title="Tout effacer" sub="Séances, check-ins, réglages et programme" tone="danger" onClick={() => setConfirmWipe(true)} />
          </div>
        </section>
      </div>

      <ConfirmSheet
        open={confirmWipe}
        title="Effacer toutes les données ?"
        body="Séances, check-ins, réglages et programme personnalisé seront supprimés de cet appareil. Exporte d'abord si tu veux les garder."
        confirmLabel="Tout effacer"
        onConfirm={() => {
          storage.wipeAll();
          refreshCounts();
          setSettings(storage.getSettings());
          onDataChanged?.();
          flash("Toutes les données ont été effacées");
        }}
        onClose={() => setConfirmWipe(false)}
      />
      <Toast message={toast} />
    </div>
  );
}

function Row({ icon, title, sub, onClick, tone }: { icon: ReactNode; title: string; sub: string; onClick: () => void; tone?: "danger" }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-raised transition">
      <span className={tone === "danger" ? "text-warn" : "text-muted"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[16px] font-semibold ${tone === "danger" ? "text-warn" : "text-ink"}`}>{title}</span>
        <span className="block text-sm text-faint">{sub}</span>
      </span>
    </button>
  );
}

function Toggle({ icon, label, active, onChange }: { icon: ReactNode; label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
      className="w-full flex items-center gap-3 px-4 h-14 text-left"
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-[16px] font-semibold text-ink">{label}</span>
      <span className={`w-12 h-7 rounded-full p-0.5 transition-colors ${active ? "bg-go" : "bg-line"}`}>
        <span className={`block w-6 h-6 rounded-full bg-chalk transition-transform ${active ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}
