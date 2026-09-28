/** Shared class recipes so components do not repeat raw values. */
export const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-60";

export const buttonVariants = {
  primary: `${buttonBase} bg-ink text-paper hover:bg-accent-strong dark:hover:bg-accent`,
  accent: `${buttonBase} bg-accent text-paper hover:bg-accent-strong`,
  outline: `${buttonBase} border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-paper-raised`,
  ghost: `${buttonBase} text-ink-muted hover:bg-paper-sunk hover:text-ink`,
} as const;

export const iconButton =
  "inline-flex size-11 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink";

export const pageContainer = "mx-auto w-full max-w-(--container-page) px-4 sm:px-6 lg:px-8";

export const linkStyle =
  "text-accent underline decoration-1 underline-offset-4 hover:text-accent-strong";
