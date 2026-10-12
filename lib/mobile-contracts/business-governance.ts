/** P2.7d wire commands. Runtime validation lives in business/governance-commands.ts. */
export type AutomationTrigger = 'lead_created' | 'lead_stage_changed' | 'order_paid' | 'provisioning_failed' | 'student_invite_pending' | 'student_risk_created' | 'intervention_overdue' | 'lesson_missed' | 'assignment_overdue' | 'weekly_digest_ready' | 'NEW_MESSAGE' | 'HOT_LEAD' | 'PAYMENT_COMPLETED' | 'COMPLAINT' | 'UNANSWERED_HOT_LEAD';
export type AutomationAction =
  | { type: 'create_task' | 'CREATE_TASK'; title: string }
  | { type: 'add_tag' | 'ADD_TAG'; tag: string }
  | { type: 'assign_owner'; userId?: string }
  | { type: 'send_internal_notification'; title: string; body: string }
  | { type: 'send_approved_template_email'; templateKey: 'automation_ops_alert' | 'automation_invite_reminder' | 'automation_intervention_alert' }
  | { type: 'create_intervention'; reasonCode: 'ATTENDANCE_PATTERN' | 'OVERDUE_WORK' | 'REPEATED_REVIEW_DIFFICULTY' | 'PLAN_STALLED' | 'TEACHER_OBSERVED'; suggestedAction: string }
  | { type: 'SUGGEST_AI_REPLY' | 'ASSIGN_SALES' | 'MARK_WON' | 'NOTIFY_ADMIN' | 'STOP_AI' | 'MARK_SPAM' };
export type GovernanceCommand =
  | { type: 'knowledge.create'; businessUnitId?: string; title: string; category: string; content: string; productInterest: 'ONLINE_DERSHANEM' | 'ONLINE_DENEME_KULUBU' | 'UNKNOWN'; validFrom?: string; validUntil?: string }
  | { type: 'knowledge.version'; id: string; content: string; isActive: boolean; expectedRevision?: string }
  | { type: 'prompt.create'; businessUnitId?: string; name: string; systemPrompt: string }
  | { type: 'automation.create'; businessUnitId?: string; name: string; triggerType: AutomationTrigger; conditions: { source?: string; product?: string; severity?: 'low' | 'medium' | 'high'; ownerEmpty?: boolean; stage?: string; temperature?: 'COLD' | 'WARM' | 'HOT'; intent?: string; campaignExternalId?: string }; actions: AutomationAction[]; isActive: boolean }
  | { type: 'automation.toggle'; id: string; isActive: boolean; expectedRevision?: string }
  | { type: 'automation.dry_run'; id: string; triggerType: AutomationTrigger; entityType: 'lead' | 'conversation' | 'order' | 'student' | 'intervention' | 'lesson' | 'assignment' | 'digest' | 'payment' | 'user'; entityId: string; source?: string; product?: string; severity?: string; stage?: string; ownerEmpty?: boolean }
  | { type: 'retention.update'; retentionDays: number }
  | { type: 'role.assign'; userId: string; businessUnitId: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'SALES' | 'SUPPORT' | 'ACCOUNTING' | 'VIEWER' }
  | { type: 'role.revoke'; id: string };
