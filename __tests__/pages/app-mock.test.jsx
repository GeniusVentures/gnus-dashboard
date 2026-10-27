import { MOCK_MARKER } from "../../lib/gnus/mock/provider";

jest.mock("../../layouts/DefaultLayout", () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

const original = process.env.NEXT_PUBLIC_GNUS_MOCK;

function loadApp(flag, search) {
  if (flag === undefined) {
    delete process.env.NEXT_PUBLIC_GNUS_MOCK;
  } else {
    process.env.NEXT_PUBLIC_GNUS_MOCK = flag;
  }
  window.history.replaceState(null, "", `/${search}`);
  jest.isolateModules(() => {
    require("../../pages/_app");
  });
}

afterEach(() => {
  delete window.gnus;
  window.history.replaceState(null, "", "/");
  if (original === undefined) {
    delete process.env.NEXT_PUBLIC_GNUS_MOCK;
  } else {
    process.env.NEXT_PUBLIC_GNUS_MOCK = original;
  }
  jest.useRealTimers();
});

describe("pages/_app mock install", () => {
  test("with the flag, the mock is on window before first render", () => {
    loadApp("1", "?gnusMock=today");
    expect(window.gnus.isGeniusWallet).toBe(true);
    expect(window.gnus.mockMarker).toBe(MOCK_MARKER);
  });

  test("gnusInject delays the install", () => {
    jest.useFakeTimers();
    loadApp("1", "?gnusMock=today&gnusInject=500");
    expect(window.gnus).toBeUndefined();
    jest.advanceTimersByTime(499);
    expect(window.gnus).toBeUndefined();
    jest.advanceTimersByTime(1);
    expect(window.gnus.isGeniusWallet).toBe(true);
  });

  test("an unknown profile throws and names it", () => {
    expect(() => loadApp("1", "?gnusMock=nope")).toThrow(/nope/);
  });

  test.each([undefined, "0"])("with the flag %p nothing installs", (flag) => {
    loadApp(flag, "?gnusMock=today");
    expect(window.gnus).toBeUndefined();
  });
});
