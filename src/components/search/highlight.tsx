import { splitHighlight } from "@/lib/utils/text";

/** Highlights query matches as React text nodes — no HTML injection possible. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const parts = splitHighlight(text, query);
  return (
    <>
      {parts.map((part, index) =>
        part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>,
      )}
    </>
  );
}
