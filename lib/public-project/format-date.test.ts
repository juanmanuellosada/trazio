import { describe, expect, it } from "vitest";
import { formatSharedDate } from "./format-date";

describe("formatSharedDate", () => {
  it("formatea una fecha simple (due_date/deadline) en español", () => {
    expect(formatSharedDate("2026-09-01")).toBe("1 de septiembre de 2026");
  });

  it("toma solo la parte de fecha de un timestamptz (due_at), sin hora", () => {
    expect(formatSharedDate("2026-09-01T23:30:00+00:00")).toBe("1 de septiembre de 2026");
  });
});
