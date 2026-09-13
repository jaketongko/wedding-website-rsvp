/**
 * Hides the black bar Canva adds to the bottom of every published page
 * ("Terms & Support", "Privacy Policy", "Designed with Canva").
 *
 * Canva draws it client-side, so it cannot be stripped from the HTML; a style
 * rule present from the first paint means it never appears at all. The selector
 * is Canva's own readable class, not one of its hashed layout classes, and
 * matches exactly one element: the bar plus the two pop-ups its buttons open
 * (checked 2026-09-13). If Canva renames it, the bar simply shows again.
 */

const STYLES = `
  .footer-overflow-container { display: none !important; }
`;

export function renderHideCanvaFooter(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n`;
}
