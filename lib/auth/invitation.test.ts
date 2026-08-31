import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInviteMessage,
  buildInviteUrl,
  hashInviteToken,
  issueUserInvite,
} from "@/lib/auth/invitation";

test("issueUserInvite creates token hash and future expiry", () => {
  const now = new Date("2026-01-01T10:00:00.000Z");
  const invite = issueUserInvite(now);
  assert.ok(invite.token.length >= 20);
  assert.equal(invite.tokenHash, hashInviteToken(invite.token));
  assert.ok(invite.expiresAt.getTime() > now.getTime());
});

test("buildInviteUrl encodes token on /davet path", () => {
  const token = "abc/+=token";
  const url = buildInviteUrl("https://example.com/", token);
  assert.equal(url, "https://example.com/davet?token=abc%2F%2B%3Dtoken");
});

test("buildInviteMessage includes invite url and email", () => {
  const message = buildInviteMessage({
    fullName: "Ada",
    email: "ada@example.com",
    inviteUrl: "https://example.com/davet?token=abc",
    expiresAt: new Date("2026-01-01T10:00:00.000Z"),
  });
  assert.match(message, /ada@example\.com/i);
  assert.match(message, /https:\/\/example\.com\/davet\?token=abc/);
});
