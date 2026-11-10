import { describe, expect, it } from "vitest";
import { withNeonParams } from "@/lib/db-url";

describe("neon url", () => {
  it("appends sslmode and connect_timeout only when missing on a Neon URL", () => {
    expect(
      withNeonParams("postgresql://user:pass@ep-a.eu-west-2.aws.neon.tech/coiffeur"),
    ).toContain("sslmode=require");
    expect(
      withNeonParams("postgresql://user:pass@ep-a.eu-west-2.aws.neon.tech/coiffeur"),
    ).toContain("connect_timeout=15");
    expect(
      withNeonParams(
        "postgresql://user:pass@ep-a-pooler.eu-west-2.aws.neon.tech/coiffeur?sslmode=require&connect_timeout=15",
      ),
    ).toBe(
      "postgresql://user:pass@ep-a-pooler.eu-west-2.aws.neon.tech/coiffeur?sslmode=require&connect_timeout=15",
    );
    expect(withNeonParams("postgresql://user:pass@localhost:5432/coiffeur")).toBe(
      "postgresql://user:pass@localhost:5432/coiffeur",
    );
  });
});
