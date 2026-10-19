// Shared UI primitives. Every screen builds from these so spacing, radii and
// tap targets stay consistent (min 44px for anything you hit mid-set).

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, X } from "lucide-react";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 h-14 px-5 rounded-2xl bg-chalk text-on-chalk font-semibold text-[17px] active:scale-[0.98] transition disabled:opacity-40",
  secondary:
    "inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-raised text-ink font-semibold text-[15px] active:bg-line transition",
  quiet:
    "inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-muted font-medium text-sm active:bg-raised transition",
  danger:
    "inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-warn/12 text-warn font-semibold text-[15px] active:bg-warn/20 transition",
  icon:
    "inline-flex items-center justify-center w-11 h-11 rounded-xl text-muted active:bg-raised transition",
};

export function Sheet({
  open,
  onClose,
  label,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] bg-black/65 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-md bg-surface rounded-t-[22px] border-t border-line px-5 pt-3 safe-sheet overflow-y-auto no-scrollbar ${
              tall ? "max-h-[90dvh]" : "max-h-[85dvh]"
            }`}
          >
            <div className="w-9 h-1 rounded-full bg-line mx-auto mb-4" aria-hidden />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Annuler",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <h2 className="text-xl font-bold text-ink mb-1.5">{title}</h2>
      {body && <p className="text-muted text-[15px] mb-6 leading-relaxed">{body}</p>}
      <div className="flex gap-3">
        <button onClick={onClose} className={`${btn.secondary} flex-1`}>{cancelLabel}</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`${tone === "danger" ? btn.danger : btn.secondary} flex-1`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

/** Header for full-screen flows that sit above the tab bar (check-in, plates…). */
export function FlowHeader({
  title,
  onBack,
  backLabel = "Retour",
  right,
  closeIcon,
}: {
  title: ReactNode;
  onBack: () => void;
  backLabel?: string;
  right?: ReactNode;
  closeIcon?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 safe-header bg-bg/92 backdrop-blur-md border-b border-line/60">
      <div className="flex items-center gap-2 px-2 pb-2 min-h-12">
        <button onClick={onBack} aria-label={backLabel} className={btn.icon}>
          {closeIcon ? <X className="w-6 h-6" /> : <ChevronLeft className="w-7 h-7" />}
        </button>
        <div className="flex-1 min-w-0 text-center text-[15px] font-semibold text-ink truncate">{title}</div>
        <div className="min-w-11 flex justify-end">{right}</div>
      </div>
    </header>
  );
}

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <h1 className="type-display text-[44px] text-ink">{children}</h1>
      {aside}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex p-1 bg-surface rounded-xl border border-line">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition ${
              active ? "bg-raised text-ink" : "text-faint"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2.5 px-0.5">
      <h2 className="text-[15px] font-semibold text-muted">{children}</h2>
      {aside && <div className="text-sm text-faint">{aside}</div>}
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed safe-toast left-4 right-4 max-w-md mx-auto z-[70]"
        >
          <div className="bg-chalk text-on-chalk font-semibold text-[15px] px-4 py-3 rounded-xl text-center shadow-lg shadow-black/40">
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
