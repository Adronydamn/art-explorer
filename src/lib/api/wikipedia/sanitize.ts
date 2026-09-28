import { sanitizeHtml } from "@/lib/security/sanitize";
import { stripHtml } from "@/lib/utils/text";

/** Maximum size of Wikipedia HTML accepted for sanitizing (large fragments are cut). */
const MAX_WIKI_HTML = 8_000;

/** Sanitizes Wikipedia HTML (e.g. extract_html or page/html) with the strict allowlist. */
export function sanitizeWikipediaHtml(html: string): string {
  const withoutServiceBlocks = html
    .replace(/<(table|figure|style|script|sup|math)[\s\S]*?<\/\1>/gi, "")
    .replace(
      /<div[^>]*class="[^"]*(navbox|infobox|reflist|hatnote|mw-references)[^"]*"[\s\S]*?<\/div>/gi,
      "",
    );
  return sanitizeHtml(withoutServiceBlocks, { maxInputLength: MAX_WIKI_HTML });
}

/** Converts a Wikipedia extract (HTML or text) into safe plain text. Preferred for rendering. */
export function wikipediaPlainText(
  extract: string | null | undefined,
  extractHtml?: string | null,
): string {
  if (extract && extract.trim()) return stripHtml(extract).replace(/\s+\n/g, "\n").trim();
  if (extractHtml && extractHtml.trim()) return stripHtml(sanitizeWikipediaHtml(extractHtml));
  return "";
}
