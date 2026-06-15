#!/usr/bin/env node
/**
 * T26 — webhook signature gate (unit, no server).
 */
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"

function validateSignature(body, secret, signature) {
  const hash = createHmac("sha256", secret).update(body).digest("base64")
  return hash === signature
}

function verifyLineSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false
  return validateSignature(rawBody, secret, signature)
}

const body = '{"events":[]}'
const secret = "test-channel-secret"
const good = createHmac("sha256", secret).update(body).digest("base64")

assert.equal(verifyLineSignature(body, good, secret), true)
assert.equal(verifyLineSignature(body, "bad", secret), false)
assert.equal(verifyLineSignature(body, good, null), false)
assert.equal(verifyLineSignature(body, null, secret), false)

console.log("test-security-webhook: 4/4 assertions passed")
