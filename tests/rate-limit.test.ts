import { describe, it, expect, beforeEach } from "vitest";

const { checkRateLimit, recordAttempt, _clearAll } = await import("../app/lib/rate-limit");

beforeEach(() => {
  _clearAll();
});

describe("Rate limiter", () => {
  it("allows request when no attempts recorded", () => {
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("allows request after 4 failed attempts", () => {
    for (let i = 0; i < 4; i++) {
      recordAttempt("test-key", false);
    }
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("blocks after 5 failed attempts", () => {
    for (let i = 0; i < 5; i++) {
      recordAttempt("test-key", false);
    }
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter!).toBeGreaterThan(0);
    expect(result.retryAfter!).toBeLessThanOrEqual(60);
  });

  it("resets counter on successful attempt", () => {
    for (let i = 0; i < 3; i++) {
      recordAttempt("test-key", false);
    }
    recordAttempt("test-key", true);
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("uses separate buckets for different keys", () => {
    recordAttempt("key-a", false);
    recordAttempt("key-a", false);
    recordAttempt("key-a", false);
    recordAttempt("key-a", false);
    recordAttempt("key-a", false);

    const blocked = checkRateLimit("key-a");
    expect(blocked.allowed).toBe(false);

    const allowed = checkRateLimit("key-b");
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(5);
  });

  it("doubles block duration after additional fail clusters", () => {
    for (let i = 0; i < 10; i++) {
      recordAttempt("test-key", false);
    }

    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(60);
  });
});
