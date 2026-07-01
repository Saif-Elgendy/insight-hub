/**
 * Integration tests: hit the live PostgREST endpoint that backs
 * ConsultantRequestStatus and verify no response — under any query shape
 * accessible to a non-privileged (anonymous / non-admin) caller — ever
 * contains the admin-only moderation columns:
 *   admin_review_notes, last_save_error, last_save_error_at
 *
 * Uses only the publishable (anon) key. Under current RLS, anon receives
 * an empty result set; the assertion is that the payload never exposes
 * a forbidden column, regardless of query shape (wildcard select,
 * explicit select of forbidden columns, or filtering by them).
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

/** Assert the payload never surfaces a forbidden column on any row. */
function expectNoForbiddenColumns(payload: unknown) {
  const rows = Array.isArray(payload) ? payload : [payload];
  for (const row of rows) {
    if (row && typeof row === "object") {
      for (const col of FORBIDDEN_COLUMNS) {
        expect(Object.keys(row as object)).not.toContain(col);
      }
    }
  }
  // Also guard against nested / string representations
  const blob = JSON.stringify(payload ?? "");
  for (const col of FORBIDDEN_COLUMNS) {
    expect(blob).not.toContain(`"${col}"`);
  }
}

describe("ConsultantRequestStatus data access (integration, non-admin)", () => {
  it("wildcard SELECT as anon returns no rows and no forbidden columns", async () => {
    const res = await fetch(
      `${REST}/consultant_requests?select=*&limit=5`,
      { headers: baseHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0); // RLS blocks anon
    expectNoForbiddenColumns(body);
  });

  it.each(FORBIDDEN_COLUMNS)(
    "explicit SELECT of forbidden column '%s' as anon never returns that column in any row",
    async (col) => {
      const res = await fetch(
        `${REST}/consultant_requests?select=id,${col}&limit=5`,
        { headers: baseHeaders },
      );
      // Accept either PostgREST rejection or an empty RLS-filtered result.
      if (res.ok) {
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        // If any row is returned, it must NOT include the forbidden column.
        for (const row of body) {
          expect(Object.keys(row)).not.toContain(col);
        }
      } else {
        expect([400, 401, 403, 404]).toContain(res.status);
      }
    },
  );

  it("filtering by a forbidden column as anon never leaks rows that expose it", async () => {
    const res = await fetch(
      `${REST}/consultant_requests?select=id&admin_review_notes=not.is.null`,
      { headers: baseHeaders },
    );
    if (res.ok) {
      const body = await res.json();
      expectNoForbiddenColumns(body);
    } else {
      expect([400, 401, 403]).toContain(res.status);
    }
  });

  it("select-all with ordering by a forbidden column does not leak it", async () => {
    const res = await fetch(
      `${REST}/consultant_requests?select=*&order=last_save_error_at.desc&limit=5`,
      { headers: baseHeaders },
    );
    if (res.ok) {
      const body = await res.json();
      expectNoForbiddenColumns(body);
    } else {
      expect([400, 401, 403]).toContain(res.status);
    }
  });

  it("resubmit_consultant_request RPC anonymously rejects and never returns moderation fields", async () => {
    const res = await fetch(`${RPC}/resubmit_consultant_request`, {
      method: "POST",
      headers: baseHeaders,
      body: "{}",
    });
    expect(res.ok).toBe(false); // requires auth.uid()
    const body = await res.json().catch(() => ({}));
    expectNoForbiddenColumns(body);
  });

  it("narrow projection of user-facing columns as anon never surfaces moderation fields", async () => {
    const res = await fetch(
      `${REST}/consultant_requests?select=id,status,user_id,rejection_reason&limit=5`,
      { headers: baseHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expectNoForbiddenColumns(body);
  });
});
