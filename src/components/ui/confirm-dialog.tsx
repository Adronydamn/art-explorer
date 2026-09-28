"use client";

import { useEffect, useRef } from "react";
import { buttonVariants } from "./styles";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Accessible confirmation built on the native modal <dialog> (focus trap, Escape, inert page). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const previous =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      cancelRef.current?.focus();
      return () => previous?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md border border-line bg-paper-raised p-6 text-ink shadow-float backdrop:bg-overlay/70"
    >
      <h2 id="confirm-title" className="font-display text-2xl font-semibold">
        {title}
      </h2>
      <p id="confirm-description" className="mt-2 text-sm text-ink-muted">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onCancel} className={buttonVariants.outline}>
          Отмена
        </button>
        <button type="button" onClick={onConfirm} className={buttonVariants.accent}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
