import { describe, test, expect } from "bun:test";
import { formatRelativeTime, formatDateTime } from "../../../src/utils/date-formatter";

describe("formatRelativeTime", () => {
  // Use current time for all calculations
  const now = Date.now();

  test("returns 'just now' for recent times", () => {
    const date = new Date(now - 30 * 1000); // 30 seconds ago
    expect(formatRelativeTime(date)).toBe("just now");
  });

  test("returns '1 minute ago' for 1 minute", () => {
    const date = new Date(now - 90 * 1000); // 90 seconds = 1.5 minutes
    expect(formatRelativeTime(date)).toBe("1 minute ago");
  });

  test("returns 'X minutes ago' for multiple minutes", () => {
    const date = new Date(now - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("5 minutes ago");
  });

  test("returns '1 hour ago' for 1 hour", () => {
    const date = new Date(now - 90 * 60 * 1000); // 90 minutes = 1.5 hours
    expect(formatRelativeTime(date)).toBe("1 hour ago");
  });

  test("returns 'X hours ago' for multiple hours", () => {
    const date = new Date(now - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("3 hours ago");
  });

  test("returns '1 day ago' for 1 day", () => {
    const date = new Date(now - 36 * 60 * 60 * 1000); // 36 hours = 1.5 days
    expect(formatRelativeTime(date)).toBe("1 day ago");
  });

  test("returns 'X days ago' for multiple days", () => {
    const date = new Date(now - 5 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("5 days ago");
  });

  test("returns '1 week ago' for 1 week", () => {
    const date = new Date(now - 10 * 24 * 60 * 60 * 1000); // 10 days = 1.4 weeks
    expect(formatRelativeTime(date)).toBe("1 week ago");
  });

  test("returns 'X weeks ago' for multiple weeks", () => {
    const date = new Date(now - 20 * 24 * 60 * 60 * 1000); // 20 days = 2.8 weeks
    expect(formatRelativeTime(date)).toBe("2 weeks ago");
  });

  test("returns '1 month ago' for 1 month", () => {
    const date = new Date(now - 45 * 24 * 60 * 60 * 1000); // 45 days = 1.5 months
    expect(formatRelativeTime(date)).toBe("1 month ago");
  });

  test("returns 'X months ago' for multiple months", () => {
    const date = new Date(now - 100 * 24 * 60 * 60 * 1000); // ~3 months
    expect(formatRelativeTime(date)).toBe("3 months ago");
  });

  test("returns '1 year ago' for 1 year", () => {
    const date = new Date(now - 400 * 24 * 60 * 60 * 1000); // ~1.1 years
    expect(formatRelativeTime(date)).toBe("1 year ago");
  });

  test("returns 'X years ago' for multiple years", () => {
    const date = new Date(now - 800 * 24 * 60 * 60 * 1000); // ~2.2 years
    expect(formatRelativeTime(date)).toBe("2 years ago");
  });

  test("handles string date input", () => {
    const dateStr = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(dateStr)).toBe("2 hours ago");
  });

  test("returns 'in the future' for future dates", () => {
    const date = new Date(now + 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("in the future");
  });
});

describe("formatDateTime", () => {
  test("formats Date object", () => {
    const date = new Date("2025-01-15T10:30:00.000Z");
    const result = formatDateTime(date);
    // Result depends on locale, just check it's a non-empty string
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("formats date string", () => {
    const result = formatDateTime("2025-01-15T10:30:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
