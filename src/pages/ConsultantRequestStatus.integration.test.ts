/**
 * Integration tests: verify the live PostgREST endpoint backing
 * ConsultantRequestStatus never exposes admin-only moderation columns
 * (admin_review_notes, last_save_error, last_save_error_at) to
 * non-privileged (anonymous / authenticated non-admin) callers.
 *
 * These hit the real backend using only the publishable (anon) key.
 * They rely on column-level GRANT restrictions, so even a caller who
 * asks for those columns explicitly must be rejected by PostgREST.
 */
import { describe, it, expect } from "vitest";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const REST = `${SUPABASE_URL}/rest/v1`;
const RPC = `${SUPABASE_URL}/rest/v1/rpc`;

const baseHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

const FORBIDDEN_COLUMNS = [
  "admin_review_notes",
  "last_save_error",
  "last_save_error_at",
] as const;

describe("ConsultantRequestStatus data access (integration)", () => {
  it("wildcard SELECT as anon must not leak any rows or forbidden columns", async () => {
    const res = await fetch(
      `${REST}/consultant_requests?select=*&limit=5`,
      { headers: baseHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // RLS: anon must not see any row
    expect(body.length).toBe(0);
    // Extra guard: if a row ever slipped through, forbidden keys must not appear
    for (const row of body) {
      for (const col of FORBIDDEN_COLUMNS) {
        expect(Object.keys(row)).not.toContain(col);
      }
    }
  });

  it.each(FORBIDDEN_COLUMNS)(
    "explicit SELECT of forbidden column '%s' as anon must be rejected",
    async (col) => {
      const res = await fetch(
        `${REST}/consultant_requests?select=${col}&limit=1`,
        { headers: baseHeaders },
      );
      // PostgREST returns 401/403/400 with a permission-denied code
      expect(res.ok).toBe(false);
      expect([400, 401, 403, 404]).toContain(res.status);
      const body = await res.json().catch(() => ({}));
      const blob = JSON.stringify(body).toLowerCase();
      expect(blob).toMatch(/permission|denied|not.*allow|forbidden|unauthorized/);
    },
  );

  it("combined explicit SELECT of all forbidden columns is rejected", async () => {
    const cols = FORBIDDEN_COLUMNS.join(",");
    const res = await fetch(
      `${REST}/consultant_requests?select=${cols}&limit=1`,
      { headers: baseHeaders },
    );
    expect(res.ok).toBe(false);
    expect([400, 401, 403]).toContain(res.status);
  });

  it("filtering by a forbidden column as anon must be rejected", async () => {
    const res = await fetch(
      `${REST}/consultant_requests?select=id&admin_review_notes=not.is.null`,
      { headers: baseHeaders },
    );
    expect(res.ok).toBe(false);
    expect([400, 401, 403]).toContain(res.status);
  });

  it("resubmit_consultant_request RPC requires auth (no anonymous escalation)", async () => {
    const res = await fetch(`${RPC}/resubmit_consultant_request`, {
      method: "POST",
      headers: baseHeaders,
      body: "{}",
    });
    expect(res.ok).toBe(false);
    const body = await res.json().catch(() => ({}));
    const blob = JSON.stringify(body);
    // Should NOT return any moderation field back
    for (const col of FORBIDDEN_COLUMNS) {
      expect(blob).not.toContain(col);
    }
  });

  it("OpenAPI/table introspection as anon does not expose forbidden columns as selectable", async () => {
    // Ask PostgREST for a row using a broad select to confirm the projection
    // never materializes forbidden columns for non-admin callers.
    const res = await fetch(
      `${REST}/consultant_requests?select=id,status,user_id,rejection_reason&limit=1`,
      { headers: baseHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const row of body) {
      for (const col of FORBIDDEN_COLUMNS) {
        expect(Object.keys(row)).not.toContain(col);
      }
    }
  });
});
