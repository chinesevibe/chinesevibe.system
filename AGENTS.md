<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Global Rules (อ่านก่อนทุกอย่าง)

> ดู global ruleset + Ponytail mindset: `/Users/jakarinosk/HEAD-OFFICE/AGENTS.md`
> ดู Hermes team + routing: `OS/HERMES-OS/AGENT_TEAM.md` + `OS/HERMES-OS/MODEL_ROUTING.md`

## Agent discipline (hr-payroll-client)

When implementing or fixing code in this repo, follow:

- **Ponytail:** เขียนน้อยที่สุดที่ยังถูกต้อง — ดู `HEAD-OFFICE/AGENTS.md`
- **Hermes 2.0 team:** Codex CLI + Gemini CLI + Antigravity (Claude Code ⏸ paused)
- **Orchestrator:** Hermes — ไม่ใช่ Cursor

**Before fix:** file map → expected vs actual → min fix plan (with evidence).  
**After fix:** return only files changed, reason, risk, test command.
