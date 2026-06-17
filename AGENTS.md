<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent discipline (Cursor)

When implementing or fixing code in this repo, follow:

- [`.cursor/rules/ponytail.mdc`](../.cursor/rules/ponytail.mdc) — smallest reversible change, scope, stop gates, investigation protocol, QA auditor mode, delivery format (files / reason / risk / test command)
- [`.cursor/rules/company-os.mdc`](../.cursor/rules/company-os.mdc) — orchestrator-only mode (no source edits unless user explicitly requests implementation here)

**Before fix:** file map → expected vs actual → min fix plan (with evidence).  
**After fix:** return only files changed, reason, risk, test command.
