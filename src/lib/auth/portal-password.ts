import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const MIN_PASSWORD_LENGTH = 6
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

export function validatePortalPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
  }
  return null
}

export function hashPortalPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }).toString("hex")
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${hash}`
}

export function verifyPortalPassword(
  password: string,
  stored: string | null | undefined
): boolean {
  if (!stored) return false
  const parts = stored.split(":")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false

  const [, nStr, rStr, pStr, salt, expectedHex] = parts
  const derived = scryptSync(password, salt, KEY_LEN, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
  })
  const expected = Buffer.from(expectedHex, "hex")
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}
