// @vitest-environment node
import { vi, test, expect, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ set: mockSet }),
}));

const { createSession } = await import("../auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  mockSet.mockClear();
});

test("sets the auth-token cookie", async () => {
  await createSession("user-1", "user@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  const [name] = mockSet.mock.calls[0];
  expect(name).toBe("auth-token");
});

test("cookie contains a valid JWT with userId and email", async () => {
  await createSession("user-1", "user@example.com");

  const [, token] = mockSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("user@example.com");
});

test("cookie expires approximately 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, , options] = mockSet.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
  expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs);
});

test("cookie is httpOnly with lax sameSite and root path", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("cookie secure flag is false outside production", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.secure).toBe(false);
});
