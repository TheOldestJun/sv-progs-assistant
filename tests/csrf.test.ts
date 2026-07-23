import { describe, it, expect } from "vitest";

const { verifyCsrf } = await import("../app/lib/csrf");

function mockRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/test", { headers });
}

describe("CSRF protection", () => {
  describe("localhost (dev mode)", () => {
    it("accepts localhost:3000 origin", () => {
      const req = mockRequest({ origin: "http://localhost:3000" });
      expect(verifyCsrf(req).valid).toBe(true);
    });

    it("accepts 127.0.0.1:3000 origin", () => {
      const req = mockRequest({ origin: "http://127.0.0.1:3000" });
      expect(verifyCsrf(req).valid).toBe(true);
    });

    it("accepts localhost on any port", () => {
      const req = mockRequest({ origin: "http://localhost:4000" });
      expect(verifyCsrf(req).valid).toBe(true);
    });

    it("accepts localhost referer", () => {
      const req = mockRequest({ referer: "http://localhost:3000/dashboard" });
      expect(verifyCsrf(req).valid).toBe(true);
    });
  });

  describe("rejected origins", () => {
    it("rejects unknown origin", () => {
      const req = mockRequest({ origin: "https://evil-site.com" });
      const result = verifyCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Untrusted origin");
    });

    it("rejects unknown referer", () => {
      const req = mockRequest({ referer: "https://evil-site.com/page" });
      const result = verifyCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Untrusted referer");
    });

    it("rejects missing both origin and referer", () => {
      const req = mockRequest({});
      const result = verifyCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Missing origin and referer headers");
    });
  });

  describe("edge cases", () => {
    it("prefers origin over referer when both present", () => {
      const req = mockRequest({
        origin: "https://evil-site.com",
        referer: "http://localhost:3000/test",
      });
      const result = verifyCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Untrusted origin");
    });

    it("rejects malformed origin", () => {
      const req = mockRequest({ origin: "not-a-url" });
      const result = verifyCsrf(req);
      expect(result.valid).toBe(false);
    });

    it("rejects malformed referer", () => {
      const req = mockRequest({ referer: "not-a-url" });
      const result = verifyCsrf(req);
      expect(result.valid).toBe(false);
    });
  });
});
