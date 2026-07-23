// Extracts a short plain-text preview from BlockNote's block JSON structure.
// Walks every block (and nested children/inline content), concatenates the
// text, then trims to `maxLength` — cutting at a sentence boundary when
// possible so it doesn't end mid-word.

function walkBlocks(nodes: any[]): string {
  if (!Array.isArray(nodes)) return "";
  let text = "";
  for (const node of nodes) {
    if (!node) continue;
    if (typeof node.text === "string") {
      text += node.text;
    }
    if (Array.isArray(node.content)) {
      text += walkBlocks(node.content);
    } else if (typeof node.content === "string") {
      text += node.content;
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      text += " " + walkBlocks(node.children);
    }
    text += " ";
  }
  return text;
}

export function extractExcerpt(blocks: any, maxLength = 160): string {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return "";

  const raw = walkBlocks(blocks).replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= maxLength) return raw;

  const truncated = raw.slice(0, maxLength);

  // Prefer cutting right after a sentence-ending punctuation mark.
  const lastPunct = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );
  if (lastPunct > maxLength * 0.4) {
    return truncated.slice(0, lastPunct + 1).trim();
  }

  // Otherwise cut at the last full word and add an ellipsis.
  const lastSpace = truncated.lastIndexOf(" ");
  const safeCut = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return safeCut.trim() + "…";
}
