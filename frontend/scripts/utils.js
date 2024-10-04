const locale = 'el-GR';

// Converts a string to normalized uppercase without diacritics
export function normalize(str) {
  if (!str) return undefined;

  return [...str.normalize('NFKD')]
    .filter((c) => /^[Α-Ωα-ω0-9 ]$/.test(c))
    .join('')
    .toLocaleUpperCase(locale);
}

// Splits a book code into its parts
export function splitCode(code) {
  if (!code) return undefined;

  const regex = /^([0-9]{1,2})([Α-Ω]{1,2})([α-ω]{1,2})([0-9]{1,3})$/;
  const match = code.match(regex);

  if (!match) return undefined;

  return [match[1], match[2], match[3], match[4]];
}

// Tokenizes a string into an array of normalized words
export function tokenize(str) {
  if (!str) return [];

  return normalize(str).split(' ').filter((v) => v);
}