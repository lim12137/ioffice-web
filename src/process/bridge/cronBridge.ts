/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { cronService } from '@process/services/cron/CronService';
import { canAccessConversation } from './conversationAccess';

function canAccessCronJob(job: { metadata?: { conversationId?: string } } | null): boolean {
  const conversationId = job?.metadata?.conversationId;
  if (!conversationId) {
    return false;
  }
  return canAccessConversation(conversationId);
}

/**
 * Initialize cron IPC bridge handlers
 */
export function initCronBridge(): void {
  // Query handlers
  ipcBridge.cron.listJobs.provider(async () => {
    const jobs = await cronService.listJobs();
    return jobs.filter((job) => canAccessCronJob(job));
  });

  ipcBridge.cron.listJobsByConversation.provider(async ({ conversationId }) => {
    if (!canAccessConversation(conversationId)) {
      return [];
    }
    return cronService.listJobsByConversation(conversationId);
  });

  ipcBridge.cron.getJob.provider(async ({ jobId }) => {
    const job = await cronService.getJob(jobId);
    if (!canAccessCronJob(job)) {
      return null;
    }
    return job;
  });

  // CRUD handlers
  ipcBridge.cron.addJob.provider(async (params) => {
    if (!canAccessConversation(params.conversationId)) {
      throw new Error('Conversation not found');
    }
    const job = await cronService.addJob(params);
    ipcBridge.cron.onJobCreated.emit(job);
    return job;
  });

  ipcBridge.cron.updateJob.provider(async ({ jobId, updates }) => {
    const existing = await cronService.getJob(jobId);
    if (!canAccessCronJob(existing)) {
      throw new Error('Cron job not found');
    }
    const targetConversationId = updates.metadata?.conversationId;
    if (targetConversationId && !canAccessConversation(targetConversationId)) {
      throw new Error('Conversation not found');
    }

    const job = await cronService.updateJob(jobId, updates);
    if (!canAccessCronJob(job)) {
      throw new Error('Cron job not found');
    }
    ipcBridge.cron.onJobUpdated.emit(job);
    return job;
  });

  ipcBridge.cron.removeJob.provider(async ({ jobId }) => {
    const existing = await cronService.getJob(jobId);
    if (!canAccessCronJob(existing)) {
      throw new Error('Cron job not found');
    }
    await cronService.removeJob(jobId);
    ipcBridge.cron.onJobRemoved.emit({ jobId });
  });
}
