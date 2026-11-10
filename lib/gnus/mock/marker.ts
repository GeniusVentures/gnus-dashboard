// Every mock module imports this, so loading any part of the mock leaves the marker in the bundle
// and the out/ gate finds it. The assignment is a side effect on purpose: unlike an unused export
// it is not tree-shaken away when a page imports only a profile table or an option parser.
export const MOCK_MARKER = "__GNUS_MOCK__";

(globalThis as Record<string, unknown>)[MOCK_MARKER] = true;
