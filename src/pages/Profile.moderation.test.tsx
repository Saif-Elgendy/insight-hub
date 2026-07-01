import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "@/pages/Profile";

const navigateMock = vi.fn();
let mockRole: "admin" | "student" | "consultant" | null = "consultant";

const profileRow = {
  id: "p-1",
  user_id: "user-1",
  full_name: "مستخدم اختبار",
  phone: "01000000000",
  bio: null,
  avatar_url: null,
  is_public_profile: false,
};

const consultantRow = {
  id: "cr-1",
  user_id: "user-1",
  specialty: "تغذية",
  bio: null,
  consultation_price: 100,
  years_experience: 3,
  photo_url: null,
  video_url: null,
  certificates_urls: null,
  id_card_url: null,
  license_url: null,
  languages: [],
  status: "rejected",
  rejection_reason: "مستندات ناقصة",
  admin_reviewed_at: null,
  super_admin_approved_at: null,
  last_save_error: "خطأ داخلي سري في الحفظ",
  last_save_error_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, signOut: vi.fn(), loading: false }),
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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("framer-motion", () => {
  const React = require("react");
  const proxy: any = new Proxy(
    {},
    {
      get: () => (props: any) => React.createElement("div", props, props.children),
    }
  );
  return { motion: proxy, AnimatePresence: ({ children }: any) => children };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (table: string) => {
    const row =
      table === "profiles"
        ? profileRow
        : table === "consultant_requests"
        ? consultantRow
        : null;
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      update: () => builder,
      insert: () => builder,
      maybeSingle: async () => ({ data: row, error: null }),
      then: (resolve: any) => resolve({ data: row ? [row] : [], error: null }),
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      auth: { updateUser: vi.fn(async () => ({ error: null })) },
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
          createSignedUrl: async () => ({ data: null, error: null }),
        }),
      },
    },
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

describe("Profile — moderation field gating for consultant request", () => {
  beforeEach(() => {
    mockRole = "consultant";
    navigateMock.mockReset();
  });

  it("hides last_save_error block from consultant (owner, non-admin)", async () => {
    mockRole = "consultant";
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText("تغذية").length).toBeGreaterThan(0)
    );
    expect(screen.queryByText("سبب رفض آخر محاولة حفظ")).not.toBeInTheDocument();
    expect(screen.queryByText(consultantRow.last_save_error!)).not.toBeInTheDocument();
  });

  it("hides last_save_error block from students viewing profile", async () => {
    mockRole = "student";
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText("تغذية").length).toBeGreaterThan(0)
    );
    expect(screen.queryByText("سبب رفض آخر محاولة حفظ")).not.toBeInTheDocument();
    expect(screen.queryByText(consultantRow.last_save_error!)).not.toBeInTheDocument();
  });

  it("hides last_save_error block when role is null (session expired)", async () => {
    mockRole = null;
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText("تغذية").length).toBeGreaterThan(0)
    );
    expect(screen.queryByText("سبب رفض آخر محاولة حفظ")).not.toBeInTheDocument();
    expect(screen.queryByText(consultantRow.last_save_error!)).not.toBeInTheDocument();
  });

  it("renders last_save_error block for admins", async () => {
    mockRole = "admin";
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("سبب رفض آخر محاولة حفظ")).toBeInTheDocument()
    );
    expect(screen.getByText(consultantRow.last_save_error!)).toBeInTheDocument();
  });

  it("re-hides last_save_error block after role downgrade + reload", async () => {
    mockRole = "admin";
    const { unmount } = renderPage();
    await waitFor(() =>
      expect(screen.getByText("سبب رفض آخر محاولة حفظ")).toBeInTheDocument()
    );
    unmount();

    mockRole = "consultant";
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText("تغذية").length).toBeGreaterThan(0)
    );
    expect(screen.queryByText("سبب رفض آخر محاولة حفظ")).not.toBeInTheDocument();
    expect(screen.queryByText(consultantRow.last_save_error!)).not.toBeInTheDocument();
  });
});
