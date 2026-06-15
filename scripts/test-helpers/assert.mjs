export function createAssert(flowName) {
  let passed = 0
  let failed = 0
  const errors = []

  function ok(condition, message) {
    if (condition) {
      passed += 1
      return
    }
    failed += 1
    errors.push(message)
    console.error(`  ✗ ${message}`)
  }

  function summary() {
    console.log(`  ${flowName}: ${passed} passed, ${failed} failed`)
    return { flowName, passed, failed, errors, ok: failed === 0 }
  }

  return { ok, summary }
}
