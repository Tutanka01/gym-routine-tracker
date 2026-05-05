import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function SetNoteSheet({
  isOpen,
  initialNote,
  setLabel,
  onClose,
  onSave,
  onClear,
}: {
  isOpen: boolean;
  initialNote: string;
  setLabel: string;
  onClose: () => void;
  onSave: (note: string) => void;
  onClear: () => void;
}) {
  const [note, setNote] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNote(initialNote);
    window.setTimeout(() => textareaRef.current?.focus(), 120);
  }, [initialNote, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            onClick={e => e.stopPropagation()}
            className="w-full bg-[var(--color-void-1)] border-t border-white/[0.07] rounded-t-3xl px-5 pb-10 pt-5"
          >
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-signal)] mb-2">
              Note rapide
            </div>
            <p className="font-display font-black text-[#C0D0F0] mb-4 uppercase" style={{ fontSize: "28px" }}>
              {setLabel}
            </p>
            <textarea
              ref={textareaRef}
              value={note}
              maxLength={120}
              onChange={e => setNote(e.target.value)}
              className="w-full h-28 rounded-xl bg-[var(--color-void-2)] border border-white/[0.07] text-[#C0D0F0] placeholder-slate-700 p-3 text-sm outline-none focus:border-[var(--color-signal)]/45 resize-none"
              placeholder="RIR 0, epaule sensible, tempo..."
            />
            <div className="flex items-center justify-between mt-2 mb-5 text-[11px] text-slate-600">
              <span>Visible dans cette seance</span>
              <span className="font-mono tnum">{note.length}/120</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { onClear(); onClose(); }}
                className="w-24 bg-red-500/10 text-red-400 font-bold py-4 rounded-xl border border-red-500/15 active:scale-[0.98] transition"
              >
                Effacer
              </button>
              <button
                onClick={() => { onSave(note.trim()); onClose(); }}
                className="flex-1 text-black font-bold py-4 rounded-xl active:scale-[0.98] transition"
                style={{ background: "var(--color-signal)" }}
              >
                Enregistrer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

