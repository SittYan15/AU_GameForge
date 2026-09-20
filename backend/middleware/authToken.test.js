import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET ||= "test-only-secret-that-is-at-least-32-characters";

const {
    createAccessToken,
    createGuestAccessToken,
    verifyAccessToken,
    verifyGuestAccessToken
} = await import("./authToken.js");

test("guest access tokens authenticate only the guest they were issued for", () => {
    const token = createGuestAccessToken(42);

    assert.deepEqual(verifyGuestAccessToken(token), { guestId: 42 });
    assert.equal(verifyAccessToken(token), null);
    assert.equal(verifyGuestAccessToken(`${token}tampered`), null);
});

test("registered-user access tokens cannot be used as guest credentials", () => {
    const token = createAccessToken(7, "session-id");

    assert.deepEqual(verifyAccessToken(token), { userId: 7, sessionId: "session-id" });
    assert.equal(verifyGuestAccessToken(token), null);
});
