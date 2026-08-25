// Minimal ULID implementation (Crockford base32, 48-bit time + 80-bit
// randomness). No external dependency — swap for the `ulid` package
// later if you want stricter spec compliance / monotonicity guarantees.

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford's base32

function encodeTime(now: number, len: number): string {
  let str = "";
  for (let i = len - 1; i >= 0; i--) {
    str = ENCODING[now % 32] + str;
    now = Math.floor(now / 32);
  }
  return str;
}

function encodeRandom(len: number): string {
  let str = "";
  for (let i = 0; i < len; i++) {
    str += ENCODING[Math.floor(Math.random() * 32)];
  }
  return str;
}

/** Generate a new ULID: 10 chars of timestamp + 16 chars of randomness. */
export function ulid(): string {
  return encodeTime(Date.now(), 10) + encodeRandom(16);
}

/** Prefix a ULID with an entity-type tag for readability in logs/URLs. */
export function id(prefix: string): string {
  return `${prefix}_${ulid()}`;
}
