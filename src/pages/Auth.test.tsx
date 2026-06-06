import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AuthPage from "@/pages/Auth";

// Mocks
const signInMock = vi.fn();
const signUpMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const navigateMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signIn: signInMock, signUp: signUpMock }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmailMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

// Avoid AnimatePresence "wait" mode keeping forms unmounted in jsdom.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const passthrough = (tag: string) =>
    React.forwardRef((props: any, ref: any) => React.createElement(tag, { ...props, ref }));
  return {
    motion: new Proxy({}, { get: (_t, key: string) => passthrough(key) }),
    AnimatePresence: ({ children }: any) => children,
  };
});

const renderAuth = () => {
  const result = render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
  // Disable native HTML5 validation so zod messages are exercised.
  document.querySelectorAll("form").forEach((f) => (f.noValidate = true));
  return result;
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom default origin
  Object.defineProperty(window, "location", {
    value: { origin: "http://localhost:3000" },
    writable: true,
  });
});

describe("Auth - Login flow", () => {
  it("blocks invalid email and short password (edge cases)", async () => {
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "not-an-email");
    await user.type(screen.getByLabelText("كلمة المرور"), "123");
    await user.click(screen.getByRole("button", { name: /تسجيل الدخول/ }));

    expect(await screen.findByText("البريد الإلكتروني غير صحيح")).toBeInTheDocument();
    expect(
      screen.getByText("كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    ).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("calls signIn and navigates to /profile on success", async () => {
    signInMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "user@test.com");
    await user.type(screen.getByLabelText("كلمة المرور"), "password123");
    await user.click(screen.getByRole("button", { name: /تسجيل الدخول/ }));

    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith("user@test.com", "password123"),
    );
    expect(toastSuccess).toHaveBeenCalledWith("تم تسجيل الدخول بنجاح!");
    expect(navigateMock).toHaveBeenCalledWith("/profile");
  });

  it("shows specific error for invalid credentials", async () => {
    signInMock.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "user@test.com");
    await user.type(screen.getByLabelText("كلمة المرور"), "password123");
    await user.click(screen.getByRole("button", { name: /تسجيل الدخول/ }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      ),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows generic error for unknown signIn failures", async () => {
    signInMock.mockResolvedValue({ error: { message: "network down" } });
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "user@test.com");
    await user.type(screen.getByLabelText("كلمة المرور"), "password123");
    await user.click(screen.getByRole("button", { name: /تسجيل الدخول/ }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("حدث خطأ أثناء تسجيل الدخول"),
    );
  });
});

describe("Auth - Signup flow", () => {
  const switchToSignup = async (user: ReturnType<typeof userEvent.setup>) => {
    // The signup CTA at the bottom of the form
    const signupBtn = screen.getAllByRole("button", { name: /إنشاء حساب/ }).pop();
    await user.click(signupBtn!);
  };

  it("validates mismatched passwords", async () => {
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("الاسم الكامل"), "أحمد");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "a@b.com");
    await user.type(screen.getByLabelText("كلمة المرور"), "password123");
    await user.type(screen.getByLabelText("تأكيد كلمة المرور"), "different1");

    await user.click(
      screen.getByRole("button", { name: /^إنشاء الحساب|إنشاء حساب$/ }),
    );

    expect(await screen.findByText("كلمتا المرور غير متطابقتين")).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("signs up student successfully and navigates", async () => {
    signUpMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("الاسم الكامل"), "Sara");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "sara@test.com");
    await user.type(screen.getByLabelText("كلمة المرور"), "password123");
    await user.type(screen.getByLabelText("تأكيد كلمة المرور"), "password123");

    await user.click(
      screen.getByRole("button", { name: /^إنشاء الحساب|إنشاء حساب$/ }),
    );

    await waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith(
        "sara@test.com",
        "password123",
        "Sara",
        "student",
      ),
    );
    expect(navigateMock).toHaveBeenCalledWith("/profile");
  });

  it("shows error when email already registered", async () => {
    signUpMock.mockResolvedValue({
      error: { message: "User already registered" },
    });
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("الاسم الكامل"), "Sara");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "sara@test.com");
    await user.type(screen.getByLabelText("كلمة المرور"), "password123");
    await user.type(screen.getByLabelText("تأكيد كلمة المرور"), "password123");

    await user.click(
      screen.getByRole("button", { name: /^إنشاء الحساب|إنشاء حساب$/ }),
    );

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("هذا البريد الإلكتروني مسجل مسبقاً"),
    );
  });
});

describe("Auth - Forgot password flow", () => {
  const openForgot = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /نسيت كلمة المرور؟/ }));
  };

  it("validates email before submitting", async () => {
    const user = userEvent.setup();
    renderAuth();
    await openForgot(user);

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "bad");
    await user.click(screen.getByRole("button", { name: /إرسال رابط الاستعادة/ }));

    expect(await screen.findByText("البريد الإلكتروني غير صحيح")).toBeInTheDocument();
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("calls resetPasswordForEmail with correct redirectTo", async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();
    await openForgot(user);

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "me@test.com");
    await user.click(screen.getByRole("button", { name: /إرسال رابط الاستعادة/ }));

    await waitFor(() =>
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith("me@test.com", {
        redirectTo: "http://localhost:3000/reset-password",
      }),
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("shows error toast when reset request fails", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: { message: "rate limited" },
    });
    const user = userEvent.setup();
    renderAuth();
    await openForgot(user);

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "me@test.com");
    await user.click(screen.getByRole("button", { name: /إرسال رابط الاستعادة/ }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("حدث خطأ أثناء إرسال رابط الاستعادة"),
    );
  });

  it("handles unexpected exceptions gracefully", async () => {
    resetPasswordForEmailMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderAuth();
    await openForgot(user);

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "me@test.com");
    await user.click(screen.getByRole("button", { name: /إرسال رابط الاستعادة/ }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("حدث خطأ غير متوقع"),
    );
  });
});
