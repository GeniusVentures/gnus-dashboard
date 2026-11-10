const path = require("path");
const { ESLint } = require("eslint");

const root = path.resolve(__dirname, "..", "..");
const eslint = new ESLint({ cwd: root });

async function lint(source) {
  const [result] = await eslint.lintText(source, { filePath: path.join(root, "sub-components", "Probe.tsx") });
  return result.messages;
}

describe("react/no-danger", () => {
  test("a component using dangerouslySetInnerHTML is an error", async () => {
    const messages = await lint(
      `import React from "react";\nexport const Probe = ({ html }: { html: string }) => <div dangerouslySetInnerHTML={{ __html: html }} />;\n`,
    );
    const danger = messages.filter((m) => m.ruleId === "react/no-danger");
    expect(danger).toHaveLength(1);
    expect(danger[0].severity).toBe(2);
  });

  test("the same component rendering text is clean", async () => {
    const messages = await lint(
      `import React from "react";\nexport const Probe = ({ text }: { text: string }) => <div>{text}</div>;\n`,
    );
    expect(messages).toEqual([]);
  });
});
