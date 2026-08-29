const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function generateCode(prefix: string): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}
