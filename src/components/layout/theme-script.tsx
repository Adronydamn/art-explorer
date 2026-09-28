export const THEME_STORAGE_KEY = "art-explorer:theme";

/**
 * Applies the stored / system theme before first paint to avoid a flash of the wrong theme.
 * The script is a static string (no user input), so inlining it is safe.
 */
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
