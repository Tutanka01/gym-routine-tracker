import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { SetType } from "../lib/storage";
import { Sheet, btn } from "./ui";

const SET_TYPES: Array<{ value: SetType; label: string; hint: string }> = [
  { value: "normal", label: "Normale", hint: "Série classique" },
  { value: "drop", label: "Dégressive", hint: "Baisse la charge, sans repos" },
  { value: "cluster", label: "Cluster", hint: "15 à 20 s de pause intra-série" },
  { value: "superset", label: "Superset", hint: "Enchaînée avec un autre exercice" },
];

/** Per-set options: type, note, removal. Opened from the "…" on a set row or by long-press. */
export function SetOptionsSheet({
  open, setLabel, initialNote, initialType, canDelete, onClose, onSave, onDelete,
}: {
  open: boolean;
  setLabel: string;
  initialNote: string;
  initialType: SetType;
  canDelete: boolean;
  onClose: () => void;
  onSave: (note: string, type: SetType) => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [type, setType] = useState<SetType>(initialType);

  useEffect(() => {
    if (!open) return;
    setNote(initialNote);
    setType(initialType);
  }, [open, initialNote, initialType]);

  const save = () => { onSave(note.trim(), type); onClose(); };

  return (
    <Sheet open={open} onClose={save} label={`Options, ${setLabel}`}>
      <h2 className="text-xl font-bold text-ink mb-4">{setLabel}</h2>

      <fieldset className="mb-5">
        <legend className="text-[15px] text-muted mb-2">Type de série</legend>
        <div className="grid grid-cols-2 gap-2">
          {SET_TYPES.map(t => (
            <button
              key={t.value}
              aria-pressed={type === t.value}
              onClick={() => setType(t.value)}
              className={`p-3 rounded-xl text-left border transition ${
                type === t.value ? "bg-chalk text-on-chalk border-chalk" : "bg-raised text-ink border-line"
              }`}
            >
              <span className="block text-[15px] font-semibold">{t.label}</span>
              <span className={`block text-sm ${type === t.value ? "text-on-chalk/70" : "text-faint"}`}>{t.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="set-note" className="block text-[15px] text-muted mb-2">Note</label>
      <textarea
        id="set-note"
        value={note}
        maxLength={120}
        onChange={e => setNote(e.target.value)}
        rows={3}
        placeholder="Épaule sensible, tempo lent, prise serrée…"
        className="w-full rounded-xl bg-raised border border-line text-ink placeholder:text-faint p-3 outline-none focus:border-muted resize-none"
      />
      <div className="text-right text-sm text-faint tnum mt-1 mb-5">{note.length}/120</div>

      <div className="flex gap-2">
        {canDelete && (
          <button onClick={() => { onDelete(); onClose(); }} className={btn.danger} aria-label="Supprimer cette série">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button onClick={save} className={`${btn.secondary} flex-1`}>Valider</button>
      </div>
    </Sheet>
  );
}
