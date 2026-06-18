# 🔱 BRAHMASTRA SYSTEM RULES & SCALING LAWS

This document establishes the absolute, non-negotiable architectural mandates for the **Brahmastra OS** (the operating system for photographers). These rules ensure the system can scale to hundreds of thousands of active users concurrently with zero data leaks, minimal infrastructure costs, high performance, and extreme modularity.

Every new module, database schema, API route, or frontend component generated must comply with these **5 Core Scaling Laws**.

---

## 🛡️ LAW 1: Multi-Tenancy & Absolute Data Isolation
**Objective:** Prevent any cross-tenant data leakage (accidental access of one photographer's client data, leads, or photos by another photographer).

1. **Database Schema Enforcement**:
   - Every single table created in Supabase MUST have a `user_id` or `workspace_id` column referencing `auth.users` or the tenant workspace registry.
   - Column configuration: `workspace_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` (or workspace reference).
2. **Row Level Security (RLS)**:
   - RLS must be enabled by default on every new table:
     ```sql
     ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
     ```
   - Policies must be explicitly defined for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations using security contexts:
     ```sql
     CREATE POLICY "Workspace members can read table_name"
       ON table_name FOR SELECT
       USING (workspace_id = auth.uid());
     ```
3. **API Query Rules**:
   - Backend queries must never rely on simple fetches. Filter predicates must always explicitly check tenancy constraints.
   - For example: `.eq('workspace_id', userSessionId)` is mandatory for all CRUD functions.

---

## 💰 LAW 2: Zero-Egress Media Storage
**Objective:** High-resolution wedding photographs and videos generate massive bandwidth bills. Under no circumstances should raw binary media flow through the Next.js server runtime, which would cause server exhaustion and high cloud egress fees.

1. **Direct-to-Object-Storage Uploads**:
   - Files must be uploaded directly from the client's browser to the storage bucket using presigned URLs.
   - The Next.js API route should only serve to authenticate the request and generate a secure presigned upload URL using `@aws-sdk/client-s3` pointing to **Cloudflare R2** (zero egress fee object storage).
2. **Dual-Resolution Architecture**:
   - **Optimized Galleries**: Generate compressed WebP images for fast, lazy-loaded client galleries.
   - **Original Archives**: Retain the original high-resolution, uncompressed RAW/JPEG assets in a separate private folder, retrievable only via secure, timed-expiry presigned URLs when client download is requested.

---

## 🤖 LAW 3: Asynchronous Background Workers
**Objective:** Simultaneous image processing, metadata extraction, AI face-matching embedding generation, and bulk WhatsApp dispatching can choke server CPU, causing request timeouts.

1. **Non-Blocking Architecture**:
   - The primary API server must respond instantly with HTTP `202 Accepted` or `201 Created` for any request initiating a heavy workload.
   - The UI must rely on real-time state listeners (e.g., Supabase Realtime subscriptions) to update the status once the background job finishes.
2. **Strict Queueing Model**:
   - Heavy tasks must be delegated to background queues (e.g., **Supabase Action Queues** or Redis-based **BullMQ** workers).
   - Ingest pipeline example:
     ```
     Browser -> API (Generate presigned upload URL) -> Uploads to R2
                                                            ↓
     Queue table receives INSERT event <- Supabase Webhook fires
            ↓
     Background Worker pulls job -> Processes AI embeddings -> Updates db status
     ```

---

## 💻 LAW 4: Strict Modular Architecture
**Objective:** Maintain absolute feature isolation to prevent AI context degradation, code regression, or circular dependency errors.

1. **Feature Directory Structure**:
   - Avoid monolithic files. Every feature domain (CRM, Photo Selection, WhatsApp Engine, Billing) must live in an isolated directory structure:
     - `src/components/features/[feature_name]/`
     - `src/app/api/[feature_name]/`
     - `src/lib/[feature_name]/`
2. **Dependency Map (`architecture_map.json`)**:
   - A JSON-based schema tracking the imports, shared utilities, database tables, and external packages consumed by each module.
   - When a new module is introduced, the map must be updated, allowing future context shifts or new AI developers to instantly understand module interaction.

---

## 📱 LAW 5: Bulk Protection & Rate Limiting
**Objective:** Guard the application and external integration tokens from being blocked by third-party systems or malicious traffic.

1. **API Rate Limiting**:
   - Implement rate limiters on all public API routes to prevent brute-force attacks or automated scraping.
2. **Anti-Ban Cooldown (WhatsApp Engine)**:
   - Automated messages (such as follow-up reminders) must never be sent in immediate succession.
   - All bulk dispatches must be queued and spaced out with a randomized delay of **10 to 30 seconds** between messages.
   - Sockets must be managed gracefully via a connection pool to avoid redundant reconnect loops.

---

## 📑 AI Architect Cross-Reference Protocol

As your lead AI software architect, I will strictly cross-reference this ruleset before creating any code, migrations, or directory structures:

1. **Design Check**: I will run a mental checklist matching the proposed code against each of the 5 protocols.
2. **Tenancy Proof**: I will verify that all SQL statements define RLS policies and include tenant bounds.
3. **Queue validation**: I will check if the logic runs inside a synchronous API thread and refactor it into an asynchronous queue if the execution time is variable.
4. **Modularity Mapping**: Every file update will be placed in its designated modular silo.
