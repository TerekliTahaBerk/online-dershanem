import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  persistInstagramEvent,
  processBackgroundJobs,
  sendConversationMessage,
} from "../../lib/business/jobs";
import {
  webhookIdempotencyKey,
  type NormalizedInstagramEvent,
} from "../../lib/business/instagram";
import { integration } from "./integration-utils";
import { assertIntegrationSchemaReady } from "./integration-utils";

const runId = crypto.randomUUID();
const accountExternalId = `integration-account-${runId}`;
const senderId = `integration-sender-${runId}`;

integration("Instagram CRM akışı Postgres'ta yazıp okuyabilir", async () => {
  await assertIntegrationSchemaReady(prisma);
  const event: NormalizedInstagramEvent = {
    eventKind: "MESSAGE",
    providerEventId: `integration-mid-${runId}`,
    accountExternalId,
    senderId,
    recipientId: accountExternalId,
    occurredAt: new Date(),
    text: "Merhaba",
    mediaMetadata: null,
    referral: null,
    isEcho: false,
    relatedMessageIds: [],
  };
  const payload = event as unknown as Prisma.InputJsonValue;
  const backgroundJobKey = `instagram-event:${webhookIdempotencyKey(event)}`;
  let replyId: string | null = null;

  try {
    await persistInstagramEvent(event, payload);
    await persistInstagramEvent(event, payload);

    const processed = await processBackgroundJobs(10);
    assert.equal(processed.processed, 1);
    assert.equal(processed.failed, 0);

    const account = await prisma.instagramAccount.findUniqueOrThrow({
      where: { externalId: accountExternalId },
    });
    const conversation = await prisma.businessConversation.findUniqueOrThrow({
      where: {
        instagramAccountId_instagramScopedUserId: {
          instagramAccountId: account.id,
          instagramScopedUserId: senderId,
        },
      },
    });
    const lead = await prisma.businessLead.findFirstOrThrow({
      where: { instagramScopedId: senderId },
    });

    assert.equal(
      await prisma.instagramWebhookEvent.count({ where: { providerEventId: event.providerEventId } }),
      1,
    );
    assert.equal(lead.businessUnitId, account.businessUnitId);
    const messages = await prisma.businessMessage.findMany({
      where: { conversationId: conversation.id },
      select: { id: true },
    });
    assert.equal(messages.length, 1);
    assert.equal(await prisma.messageDelivery.count({ where: { messageId: { in: messages.map((message) => message.id) } } }), 0);

    replyId = await sendConversationMessage({
      conversationId: conversation.id,
      text: "Tabii",
      senderType: "HUMAN",
      idempotencyKey: `integration-reply-${runId}`,
    });

    assert.equal(
      (await prisma.businessMessage.findUniqueOrThrow({ where: { id: replyId } })).status,
      "SENT",
    );
    assert.equal(await prisma.messageDelivery.count({ where: { messageId: replyId } }), 1);
    assert.equal(
      (await prisma.businessConversation.findUniqueOrThrow({ where: { id: conversation.id } })).lastReplyBy,
      "HUMAN",
    );
  } finally {
    await prisma.backgroundJob.deleteMany({ where: { idempotencyKey: backgroundJobKey } });
    if (replyId) {
      await prisma.backgroundJob.deleteMany({ where: { idempotencyKey: `message-delivery:${replyId}` } });
    }
    await prisma.businessLead.deleteMany({ where: { instagramScopedId: senderId } });
    await prisma.instagramAccount.deleteMany({ where: { externalId: accountExternalId } });
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
