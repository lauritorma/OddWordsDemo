export function parseDictionary(text) {
  return new Set(text.split(/\r?\n/).map((word) => word.trim().toLowerCase()).filter((word) => /^[a-z]+$/.test(word)));
}
