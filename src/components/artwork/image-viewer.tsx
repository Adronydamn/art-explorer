"use client";

import { Minus, Plus, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { iconButton } from "@/components/ui/styles";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const STEP = 0.5;
const viewerButton = `${iconButton} text-viewer-ink hover:bg-white/10 hover:text-white disabled:opacity-40`;

type ImageViewerProps = {
  src: string;
  alt: string;
  title: string;
  width?: number;
  height?: number;
  onClose: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Fullscreen zoomable viewer built on the native modal <dialog>: the rest of the page is inert,
 * Escape closes it, focus is trapped inside and returned to the trigger on close.
 */
export default function ImageViewer({ src, alt, title, width, height, onClose }: ImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const coarse = useMediaQuery("(pointer: coarse)");

  const zoomTo = useCallback((next: number) => {
    const value = clamp(Math.round(next * 100) / 100, MIN_SCALE, MAX_SCALE);
    setScale(value);
    if (value === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    closeRef.current?.focus();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      if (dialog.open) dialog.close();
      previouslyFocused?.focus();
    };
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [tabindex='0']",
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    trapFocus(event);
    const pan = 60;
    switch (event.key) {
      case "+":
      case "=":
        zoomTo(scale + STEP);
        break;
      case "-":
        zoomTo(scale - STEP);
        break;
      case "0":
        zoomTo(1);
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
        if (scale > 1) {
          event.preventDefault();
          setOffset((current) => ({
            x:
              current.x + (event.key === "ArrowLeft" ? pan : event.key === "ArrowRight" ? -pan : 0),
            y: current.y + (event.key === "ArrowUp" ? pan : event.key === "ArrowDown" ? -pan : 0),
          }));
        }
        break;
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      zoomTo(
        (pinchStart.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinchStart.current.distance,
      );
    } else if (scale > 1) {
      setOffset((current) => ({
        x: current.x + event.clientX - previous.x,
        y: current.y + event.clientY - previous.y,
      }));
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    zoomTo(scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="viewer-title"
      aria-describedby="viewer-hint"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={onKeyDown}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 text-paper backdrop:bg-overlay"
    >
      <div className="flex h-full animate-rise flex-col bg-overlay text-viewer-ink">
        <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <h2
            id="viewer-title"
            className="min-w-0 truncate font-display text-lg font-semibold sm:text-xl"
          >
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className={viewerButton}
              onClick={() => zoomTo(scale - STEP)}
              disabled={scale <= MIN_SCALE}
              aria-label="Уменьшить"
            >
              <Minus aria-hidden className="size-5" />
            </button>
            <output
              className="w-12 text-center text-sm tabular-nums"
              aria-live="polite"
              aria-label="Масштаб"
            >
              {Math.round(scale * 100)}%
            </output>
            <button
              type="button"
              className={viewerButton}
              onClick={() => zoomTo(scale + STEP)}
              disabled={scale >= MAX_SCALE}
              aria-label="Увеличить"
            >
              <Plus aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              className={viewerButton}
              onClick={() => zoomTo(1)}
              disabled={scale === 1}
              aria-label="Сбросить масштаб"
            >
              <RotateCcw aria-hidden className="size-5" />
            </button>
            <button
              ref={closeRef}
              type="button"
              className={viewerButton}
              onClick={onClose}
              aria-label="Закрыть просмотр"
            >
              <X aria-hidden className="size-6" />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 touch-none overflow-hidden select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onDoubleClick={() => zoomTo(scale > 1 ? 1 : 2.5)}
          style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
        >
          {!loaded && (
            <div
              className="absolute inset-0 m-auto size-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
              aria-hidden
            />
          )}
          <div
            className="absolute inset-0 flex items-center justify-center p-2 transition-transform duration-100 ease-out sm:p-6"
            style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}
          >
            <Image
              src={src}
              alt={alt}
              width={width ?? 1600}
              height={height ?? 1600}
              unoptimized
              draggable={false}
              onLoad={() => setLoaded(true)}
              className="max-h-full w-auto max-w-full object-contain"
              style={{ height: "auto" }}
            />
          </div>
        </div>
        <p id="viewer-hint" className="px-4 py-2 text-center text-xs text-viewer-muted">
          {coarse
            ? "Сведите или разведите пальцы для масштаба, двойное касание — приблизить."
            : "Колесо мыши или клавиши + и − меняют масштаб, стрелки перемещают изображение, Esc закрывает просмотр."}
        </p>
      </div>
    </dialog>
  );
}
