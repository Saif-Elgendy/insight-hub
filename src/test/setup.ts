import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom doesn't implement these — needed by framer-motion / radix
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!(globalThis as any).IntersectionObserver) {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

// Disable HTML5 form validation globally in tests so zod-based errors surface
// without the browser blocking submit on invalid type="email" inputs.
if (typeof document !== "undefined") {
  const disable = () =>
    document.querySelectorAll("form").forEach((f) => (f.noValidate = true));
  const obs = new MutationObserver(disable);
  obs.observe(document, { childList: true, subtree: true });
}
