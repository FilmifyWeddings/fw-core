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

3. **BIG-TECH / TIER-1 ENTERPRISE ENGINEERING STANDARD (APPLE / GOOGLE GRADE)**:
   - **Intelligent Intent Analysis**: Do not execute prompts naively or blindly. When the user requests a feature or fix, analyze the deeper business logic, existing workflows, edge cases, and systemic impacts. If a requested detail seems contradictory or sub-optimal, synthesize the smartest, cleanest, most robust enterprise solution that achieves the user's ultimate goal without generating regressions.
   - **The Zero-Bug Formula (Defensive Engineering Protocol)**:
     - *Step 1: Deep Root Cause & Dependency Analysis*: Always inspect the database schema, foreign key relations, related API routes, and downstream UI callers before writing code. Never make assumptions.
     - *Step 2: Additive & Non-Destructive Architecture*: Build systems that preserve state, fail gracefully, and never cause cascading failures. If an entity doesn't exist, handle it safely without crashing.
     - *Step 3: Dual-Layer Persistence & Synchronization*: Never rely purely on in-memory React state for critical data (e.g. downloads, exports, stage shifts). Always guarantee persistent storage flush (Supabase DB) before performing client-side operations (e.g. PDF generation, page reloads).
     - *Step 4: Strict z-index & Portal Stacking*: Modal backdrops, select portals, and dialog menus must have explicit layer hierarchy (e.g. Modals `z-[999999]`, Portals/Dropdowns `z-[1000000+]`) to prevent hidden or unclickable UI controls.
     - *Step 5: Full Auditability & Observability*: Every significant mutation (stage move, assignment change, name edit, contact change, quotation approval) must be logged into `live_logs` with actor details, timestamps, and before/after values.
     - *Step 6: Build Verification*: Every modification must compile cleanly with `npm run build` without any TypeScript or build errors before delivering to the user.


