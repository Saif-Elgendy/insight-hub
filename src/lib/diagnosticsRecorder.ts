// Lightweight client-side diagnostics recorder.
// Captures console errors/warnings, uncaught errors, unhandled promise
// rejections, and fetch API call results into a localStorage ring buffer
// so admins can inspect recent client activity from /admin/diagnostics.

export type ActorInfo = {
  userId: string | null;
  email: string | null;
  role: string | null;
};

export type ConsoleEntry = {
  id: string;
  ts: number;
  level: "error" | "warn" | "log" | "info";
  message: string;
  source: "console" | "window.onerror" | "unhandledrejection";
  stack?: string;
  url?: string;
  userId?: string | null;
  email?: string | null;
  role?: string | null;
};

export type ApiCallEntry = {
  id: string;
  ts: number;
  method: string;
  url: string;
  status: number;
  ok: boolean;
  durationMs: number;
  error?: string;
  userId?: string | null;
  email?: string | null;
  role?: string | null;
};

const CONSOLE_KEY = "diagnostics.console.v1";
const API_KEY = "diagnostics.api.v1";
const MAX = 200;

let currentActor: ActorInfo = { userId: null, email: null, role: null };

export const setDiagnosticsActor = (actor: Partial<ActorInfo>) => {
  currentActor = { ...currentActor, ...actor };
};

const stamp = () => ({
  userId: currentActor.userId,
  email: currentActor.email,
  role: currentActor.role,
});

const safeStringify = (v: unknown): string => {
  try {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.message;
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

const readBuffer = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeBuffer = <T>(key: string, items: T[]) => {
  try {
    const trimmed = items.slice(-MAX);
    localStorage.setItem(key, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent("diagnostics:update", { detail: { key } }));
  } catch {
    // localStorage may be full; drop silently.
  }
};

const pushConsole = (entry: ConsoleEntry) => {
  const buf = readBuffer<ConsoleEntry>(CONSOLE_KEY);
  buf.push(entry);
  writeBuffer(CONSOLE_KEY, buf);
};

const pushApi = (entry: ApiCallEntry) => {
  const buf = readBuffer<ApiCallEntry>(API_KEY);
  buf.push(entry);
  writeBuffer(API_KEY, buf);
};

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let installed = false;

export const installDiagnosticsRecorder = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Patch console methods
  (["error", "warn"] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        pushConsole({
          id: newId(),
          ts: Date.now(),
          level,
          message: args.map(safeStringify).join(" "),
          source: "console",
          url: window.location.href,
          ...stamp(),
        });
      } catch {
        // ignore
      }
      original(...args);
    };
  });

  // window error
  window.addEventListener("error", (event) => {
    pushConsole({
      id: newId(),
      ts: Date.now(),
      level: "error",
      message: event.message || "Uncaught error",
      source: "window.onerror",
      stack: event.error?.stack,
      url: window.location.href,
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    pushConsole({
      id: newId(),
      ts: Date.now(),
      level: "error",
      message: `Unhandled rejection: ${safeStringify(reason)}`,
      source: "unhandledrejection",
      stack: reason instanceof Error ? reason.stack : undefined,
      url: window.location.href,
    });
  });

  // Patch fetch
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    try {
      const res = await originalFetch(input, init);
      pushApi({
        id: newId(),
        ts: Date.now(),
        method,
        url,
        status: res.status,
        ok: res.ok,
        durationMs: Math.round(performance.now() - start),
      });
      return res;
    } catch (err) {
      pushApi({
        id: newId(),
        ts: Date.now(),
        method,
        url,
        status: 0,
        ok: false,
        durationMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : safeStringify(err),
      });
      throw err;
    }
  };
};

export const getConsoleEntries = (): ConsoleEntry[] =>
  readBuffer<ConsoleEntry>(CONSOLE_KEY).slice().reverse();

export const getApiEntries = (): ApiCallEntry[] =>
  readBuffer<ApiCallEntry>(API_KEY).slice().reverse();

export const clearConsoleEntries = () => writeBuffer<ConsoleEntry>(CONSOLE_KEY, []);
export const clearApiEntries = () => writeBuffer<ApiCallEntry>(API_KEY, []);
