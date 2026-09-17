/** Small words that stay lower case unless they open the phrase. */
const SMALL = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "per",
  "the",
  "to",
  "up",
  "v",
  "vs",
  "via",
  "with",
]);

/**
 * Titles and headlines read as Title Case: every meaningful word starts with a
 * capital, small joining words stay lower unless they come first. Words that
 * are already shouted (BGE, VSL, FAQs) are left exactly as typed.
 */
export function titleCase(input: string) {
  const words = input.split(/(\s+)/);
  let first = true;
  return words
    .map((chunk) => {
      if (/^\s+$/.test(chunk)) return chunk;
      const isFirst = first;
      first = false;
      // Leave acronyms and deliberately odd casing alone.
      if (/[A-Z]/.test(chunk.slice(1))) return chunk;
      const bare = chunk.replace(/[^A-Za-z]/g, "").toLowerCase();
      if (!isFirst && SMALL.has(bare)) return chunk.toLowerCase();
      return chunk.replace(/[A-Za-z]/, (letter) => letter.toUpperCase());
    })
    .join("");
}
