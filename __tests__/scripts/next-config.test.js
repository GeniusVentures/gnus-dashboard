const loadConfig = (env) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const key of Object.keys(env)) {
    if (env[key] === undefined) {
      delete process.env[key];
    }
  }
  try {
    let config;
    jest.isolateModules(() => {
      config = require("../../next.config.js");
    });
    return config;
  } finally {
    process.env = saved;
  }
};

describe("next.config.js served network", () => {
  test("the SDK network defaults to staging and follows the variable; no EVM chain variable exists", () => {
    const unset = loadConfig({ NEXT_PUBLIC_GNUS_SDK_NETWORK: undefined });
    expect(unset.env.NEXT_PUBLIC_GNUS_SDK_NETWORK).toBe("staging");
    expect(loadConfig({ NEXT_PUBLIC_GNUS_SDK_NETWORK: "mainnet" }).env.NEXT_PUBLIC_GNUS_SDK_NETWORK).toBe("mainnet");
    expect(Object.keys(unset.env).filter((key) => /CHAIN/.test(key))).toEqual([]);
  });
});

describe("next.config.js mock flag", () => {
  test("a production build with the mock flag is refused", () => {
    expect(() => loadConfig({ NODE_ENV: "production", NEXT_PUBLIC_GNUS_MOCK: "1" })).toThrow(/dev server only/);
  });
  test("the test-only variable allows it", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_GNUS_MOCK: "1",
      GNUS_MOCK_PRODUCTION_BUILD_TEST_ONLY: "1",
    });
    expect(config.env.NEXT_PUBLIC_GNUS_MOCK).toBe("1");
  });
  test("dev keeps the flag; a clean production build gets 0", () => {
    expect(loadConfig({ NODE_ENV: "development", NEXT_PUBLIC_GNUS_MOCK: "1" }).env.NEXT_PUBLIC_GNUS_MOCK).toBe("1");
    expect(loadConfig({ NODE_ENV: "production", NEXT_PUBLIC_GNUS_MOCK: undefined }).env.NEXT_PUBLIC_GNUS_MOCK).toBe("0");
  });
});
