<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRITICAL MANDATORY AGENT RULES: STRICT BACKEND DATA INTEGRITY & ZERO DISRUPTION

1. **ZERO VPS DEPLOYMENT**:
   - NEVER deploy to VPS (`143.244.133.235`). Only test, build, commit, and push to `origin/main`.

2. **STRICT BACKEND DATA INTEGRITY FOR ALL STUDIO OWNERS**:
   - Under NO circumstances may any update, refactor, sync, or bug fix mutate, wipe, corrupt, or mismatch any studio owner's existing backend database records.
   - All historical and existing data (crew assignments, rates, financial records, client records, sub-events, deliverables, notes) must remain 100% intact and preserved.
   - Any syncing logic must be purely additive or non-destructive, strictly safeguarding existing assignments and financials across all studios.
   - Never run blanket deletes, unconditional updates, or unconstrained queries that affect records belonging to other studios or existing projects.

