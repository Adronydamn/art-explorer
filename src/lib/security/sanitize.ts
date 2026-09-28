import DOMPurify from "isomorphic-dompurify";

export const ALLOWED_TAGS = ["p", "strong", "em", "a", "ul", "ol", "li", "br"] as const;

/** Tags that are converted to allowed equivalents before sanitizing. */
const TAG_ALIASES: Record<string, string> = { b: "strong", i: "em", cite: "em" };

const SAFE_URL = /^(https?:)?\/\//i;

let hooksInstalled = false;

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName !== "A") return;
    const href = node.getAttribute("href") ?? "";
    if (!SAFE_URL.test(href)) {
      node.removeAttribute("href");
      return;
    }
    node.setAttribute("href", href.startsWith("//") ? `https:${href}` : href);
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer nofollow");
  });
}

export type SanitizeOptions = {
  /** Maximum length of the source HTML; longer input is cut before sanitizing. */
  maxInputLength?: number;
};

/**
 * Sanitizes untrusted HTML from museums and Wikipedia with a strict allowlist
 * (p, strong, em, a, ul, ol, li, br). Scripts, styles, event handlers, iframes, forms,
 * media, tables and unsafe URLs are removed. Returns an empty string for empty results.
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  installHooks();
  const { maxInputLength = 20_000 } = options;
  const input = html.length > maxInputLength ? html.slice(0, maxInputLength) : html;
  const aliased = input.replace(
    /<(\/?)(b|i|cite)(\s[^>]*)?>/gi,
    (_match, slash: string, tag: string) => {
      return `<${slash}${TAG_ALIASES[tag.toLowerCase()] ?? tag}>`;
    },
  );
  const clean = DOMPurify.sanitize(aliased, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "form",
      "input",
      "img",
      "video",
      "audio",
      "table",
      "svg",
      "math",
      "object",
      "embed",
    ],
    KEEP_CONTENT: true,
  });
  return clean.replace(/<p>\s*<\/p>/g, "").trim();
}

/** Heuristic: does the string contain HTML markup? */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(value);
}
