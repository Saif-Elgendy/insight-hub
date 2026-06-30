import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConsultantRequestStatus from "@/pages/ConsultantRequestStatus";

// Mocks
const navigateMock = vi.fn();
let mockRole: "admin" | "student" | "consultant" | null = "student";
const requestRow = {
  id: "req-1",
  status: "rejected",
  specialty: "تغذية",
  rejection_reason: "مستندات ناقصة",
  admin_review_notes: "ملاحظة سرية للأدمن فقط",
  reviewed_at: null,
  admin_reviewed_at: null,
  super_admin_approved_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_save_error: "خطأ داخلي في الحفظ",
  last_save_error_at: new Date().toISOString(),
  photo_url: null,
  id_card_url: null,
  license_url: null,
  certificates_urls: null,
  video_url: null,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({
    role: mockRole,
    loading: false,
    isAdmin: mockRole === "admin",
    isInstructor: false,
    isStudent: mockRole === "student",
    isConsultant: mockRole === "consultant",
    canManageCourses: mockRole === "admin",
  }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    maybeSingle: async () => ({ data: requestRow, error: null }),
  };
  return {
    supabase: {
      from: () => builder,
      rpc: vi.fn(async () => ({ data: null, error: null })),
      storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) },
    },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/components/layout/Navbar", () => ({ Navbar: () => null }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ConsultantRequestStatus />
    </MemoryRouter>
  );

describe("ConsultantRequestStatus — moderation field gating", () => {
  beforeEach(() => {
    mockRole = "student";
  });

  it("hides admin_review_notes for non-admin viewers", async () => {
    mockRole = "consultant";
    renderPage();
    await waitFor(() => expect(screen.getByText("مرفوض")).toBeInTheDocument());
    expect(screen.queryByText("ملاحظات الإدارة")).not.toBeInTheDocument();
    expect(screen.queryByText(requestRow.admin_review_notes!)).not.toBeInTheDocument();
  });

  it("hides last_save_error for non-admin viewers", async () => {
    mockRole = "consultant";
    renderPage();
    await waitFor(() => expect(screen.getByText("مرفوض")).toBeInTheDocument());
    expect(screen.queryByText("آخر خطأ في الحفظ")).not.toBeInTheDocument();
    expect(screen.queryByText(requestRow.last_save_error!)).not.toBeInTheDocument();
  });

  it("hides moderation fields for students as well", async () => {
    mockRole = "student";
    renderPage();
    await waitFor(() => expect(screen.getByText("مرفوض")).toBeInTheDocument());
    expect(screen.queryByText("ملاحظات الإدارة")).not.toBeInTheDocument();
    expect(screen.queryByText("آخر خطأ في الحفظ")).not.toBeInTheDocument();
  });

  it("hides moderation fields for unauthenticated/null role", async () => {
    mockRole = null;
    renderPage();
    await waitFor(() => expect(screen.getByText("مرفوض")).toBeInTheDocument());
    expect(screen.queryByText("ملاحظات الإدارة")).not.toBeInTheDocument();
    expect(screen.queryByText("آخر خطأ في الحفظ")).not.toBeInTheDocument();
  });

  it("renders moderation fields for admins", async () => {
    mockRole = "admin";
    renderPage();
    expect(
      await screen.findByText("ملاحظات الإدارة", {}, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.getByText(requestRow.admin_review_notes!)).toBeInTheDocument();
    expect(screen.getByText("آخر خطأ في الحفظ")).toBeInTheDocument();
    expect(screen.getByText(requestRow.last_save_error!)).toBeInTheDocument();
  });

  it("re-hides moderation fields when an admin's role is downgraded and page re-renders", async () => {
    mockRole = "admin";
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText("ملاحظات الإدارة")).toBeInTheDocument());
    unmount();

    // Simulate role change + page reload
    mockRole = "consultant";
    renderPage();
    await waitFor(() => expect(screen.getByText("مرفوض")).toBeInTheDocument());
    expect(screen.queryByText("ملاحظات الإدارة")).not.toBeInTheDocument();
    expect(screen.queryByText("آخر خطأ في الحفظ")).not.toBeInTheDocument();
    expect(screen.queryByText(requestRow.admin_review_notes!)).not.toBeInTheDocument();
    expect(screen.queryByText(requestRow.last_save_error!)).not.toBeInTheDocument();
  });
});
