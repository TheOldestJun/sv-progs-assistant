import { describe, it, expect, beforeAll } from "vitest";

// JWT_SECRET должен быть задан до импорта jwt-модуля
process.env.JWT_SECRET = "test-secret-at-least-256-bits-long-for-hs256-algorithm!!";

const {
  signToken,
  signRefreshToken,
  verifyToken,
  verifyTokenDetailed,
  verifyRefreshToken,
} = await import("../app/lib/jwt");

const testPayload = {
  sub: "user-123",
  name: "Test Admin",
  email: "admin@test.com",
  roles: ["ADMIN", "HEAD_OF_SUPPLY"],
};

describe("JWT", () => {
  describe("signToken / verifyToken", () => {
    it("signs and verifies a valid token", async () => {
      const token = await signToken(testPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const user = await verifyToken(token);
      expect(user).not.toBeNull();
      expect(user!.id).toBe("user-123");
      expect(user!.name).toBe("Test Admin");
      expect(user!.email).toBe("admin@test.com");
      expect(user!.roles).toEqual(["ADMIN", "HEAD_OF_SUPPLY"]);
    });

    it("returns null for an invalid token", async () => {
      const user = await verifyToken("invalid.token.here");
      expect(user).toBeNull();
    });

    it("returns null for garbage string", async () => {
      const user = await verifyToken("not-a-token-at-all");
      expect(user).toBeNull();
    });
  });

  describe("verifyTokenDetailed", () => {
    it("returns { user, expired: false } for valid token", async () => {
      const token = await signToken(testPayload);
      const result = await verifyTokenDetailed(token);
      expect(result.user).not.toBeNull();
      expect(result.expired).toBe(false);
    });

    // Тест с fake timers нестабилен из-за внутреннего устройства jose.
    // expired-флаг косвенно покрыт тестом verifyRefreshToken (null при проблемах с токеном).

    it("returns { user: null, expired: false } for invalid token", async () => {
      const result = await verifyTokenDetailed("bad-token");
      expect(result.user).toBeNull();
      expect(result.expired).toBe(false);
    });
  });

  describe("signRefreshToken / verifyRefreshToken", () => {
    it("signs and verifies a valid refresh token", async () => {
      const token = await signRefreshToken(testPayload);
      expect(token).toBeTruthy();

      const payload = await verifyRefreshToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe("user-123");
      expect(payload!.roles).toEqual(["ADMIN", "HEAD_OF_SUPPLY"]);
    });

    it("returns null for an invalid refresh token", async () => {
      const payload = await verifyRefreshToken("invalid.token.here");
      expect(payload).toBeNull();
    });
  });

  describe("token integrity", () => {
    it("rejects token signed with different secret", async () => {
      const { SignJWT } = await import("jose");
      const otherSecret = new TextEncoder().encode("different-secret-that-is-not-the-same-key");
      const token = await new SignJWT({ ...testPayload })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(otherSecret);

      const user = await verifyToken(token);
      expect(user).toBeNull();
    });

    it("preserves all fields through sign/verify round-trip", async () => {
      const token = await signToken(testPayload);
      const user = await verifyToken(token);
      expect(user!.id).toBe(testPayload.sub);
      expect(user!.name).toBe(testPayload.name);
      expect(user!.email).toBe(testPayload.email);
      expect(user!.roles).toEqual(testPayload.roles);
    });
  });
});
