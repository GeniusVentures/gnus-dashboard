import example from "../../../data/jobs/posenet-example.json";
import { JOB_CAP_BYTES, fileTooLarge, hashJob, jobLabel, parseJob } from "../../../lib/submit/job";
import { nodeDigest } from "../../mocks/submit";

const invalid = (text) => {
  const parsed = parseJob(text);
  expect(parsed.state).toBe("invalid");
  return parsed.message;
};

describe("parseJob", () => {
  it.each(["", "   \n\t "])("gives no job and no message for %j", (text) => {
    expect(parseJob(text)).toEqual({ state: "empty" });
  });

  it("says when the text is not JSON", () => {
    expect(invalid("{")).toBe("This is not valid JSON.");
  });

  it.each(["[]", '"x"', "null", "3"])("says the job must be an object for %s", (text) => {
    expect(invalid(text)).toBe("The job must be a JSON object.");
  });

  it("names the missing top-level keys", () => {
    expect(invalid('{"inputs":[]}')).toBe(
      "The job needs inputs, outputs and passes at the top level. Missing: outputs, passes.",
    );
  });

  it("accepts the bundled example and sends exactly its JSON text", () => {
    const parsed = parseJob(JSON.stringify(example, null, 2));
    expect(parsed.state).toBe("ok");
    expect(parsed.job).toEqual(example);
    expect(parsed.sent).toBe(JSON.stringify(parsed.job));
  });

  it("refuses text over 5 MiB by its UTF-8 length before parsing it", () => {
    const filler = (bytes) => "a".repeat(bytes);
    const over = '{"inputs":[],"outputs":[],"passes":[],"x":"' + filler(JOB_CAP_BYTES) + '"}';
    expect(invalid(over)).toBe("This job is larger than 5 MB. GeniusWallet accepts jobs up to 5 MB.");
  });

  it("counts multi-byte characters by bytes, not characters", () => {
    // 2 million three-byte characters are 6 MB of UTF-8 but only 2 million UTF-16 units.
    const text = '{"inputs":[],"outputs":[],"passes":[],"x":"' + "€".repeat(2_000_000) + '"}';
    expect(invalid(text)).toMatch(/larger than 5 MB/);
    const fits = '{"inputs":[],"outputs":[],"passes":[],"x":"' + "€".repeat(1_500_000) + '"}';
    expect(parseJob(fits).state).toBe("ok");
  });
});

describe("fileTooLarge", () => {
  it("is true one byte over the cap and false at it", () => {
    expect(fileTooLarge(5242881)).toBe(true);
    expect(fileTooLarge(5242880)).toBe(false);
  });
});

describe("hashJob", () => {
  it("is the lowercase hex SHA-256 of the sent text", async () => {
    await expect(hashJob("abc", nodeDigest)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("differs for different text and is the same for equal text", async () => {
    const a = await hashJob('{"a":1}', nodeDigest);
    expect(await hashJob('{"a":1}', nodeDigest)).toBe(a);
    expect(await hashJob('{"a":2}', nodeDigest)).not.toBe(a);
  });
});

describe("jobLabel", () => {
  it("uses the job name, trimmed and cut to 40 characters, else Job", () => {
    expect(jobLabel({ name: "  posenet  " })).toBe("posenet");
    expect(jobLabel({ name: "x".repeat(60) })).toHaveLength(40);
    expect(jobLabel({ name: 7 })).toBe("Job");
    expect(jobLabel({})).toBe("Job");
  });
});
