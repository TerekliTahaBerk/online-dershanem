import type {
  MobileAssignment,
  MobileAssignmentList,
  MobileInsights,
  MobileLessonDetail,
  MobileLessonList,
  MobileMaterial,
  MobileMaterialList,
  MobileMockExams,
  MobileOdHome,
  MobileRecovery,
  MobileReviewQueue,
  MobileWeeklyDigest,
} from '@contracts/student';

/**
 * OD yanıt üreticileri — sunucunun gerçek yanıt biçimi (sözleşme).
 * `od-fixtures.test.ts` her üreticinin paylaşılan doğrulayıcıdan geçtiğini
 * kontrol eder; sözleşme değişirse testler burada kırılır.
 */

export function makeOdHome(overrides: Partial<MobileOdHome> = {}): MobileOdHome {
  return {
    contractVersion: 1,
    scope: 'OD',
    generatedAt: '2026-10-08T09:00:00.000Z',
    state: 'READY',
    firstName: 'Ada',
    now: null,
    today: [],
    week: {
      weekStart: '2026-10-04T21:00:00.000Z',
      lessonsPlanned: 0,
      lessonsRemainingToday: 0,
      assignmentsDue: 0,
      assignmentsCompleted: 0,
      pendingAssignments: 0,
      overdueAssignments: 0,
      dueReviews: null,
    },
    insight: null,
    ...overrides,
  };
}

export function makeAssignment(overrides: Partial<MobileAssignment> = {}): MobileAssignment {
  return {
    id: 'a-1',
    title: 'Kesirler çalışma kâğıdı',
    description: 'Sayfa 12–14 arasındaki soruları çöz.',
    dueAt: '2026-10-10T17:00:00.000Z',
    groupName: '8-A Matematik',
    subject: 'Matematik',
    teacherName: 'Ece Öğretmen',
    status: 'TODO',
    version: 1,
    evidenceRequired: false,
    criteria: [],
    submissions: [],
    ...overrides,
  };
}

export function makeAssignmentList(assignments: MobileAssignment[] = [makeAssignment()], evidenceEnabled = false): MobileAssignmentList {
  return { profile: { id: 'sp-1' }, evidenceEnabled, assignments };
}

export function makeLessonList(): MobileLessonList {
  return {
    profile: { id: 'sp-1' },
    groupNames: '8-A Matematik',
    lessons: [
      {
        id: 'l-1',
        startsAt: '2026-10-08T14:00:00.000Z',
        endsAt: '2026-10-08T15:00:00.000Z',
        title: 'Kesirler',
        groupName: '8-A Matematik',
        teacherName: 'Ece Öğretmen',
        statusLabel: 'Bugün',
        status: 'PLANNED',
        attendance: null,
      },
    ],
  };
}

export function makeLessonDetail(overrides: Partial<MobileLessonDetail> = {}): MobileLessonDetail {
  return {
    contractVersion: 1,
    lesson: {
      id: 'l-1',
      title: 'Kesirler',
      startsAt: '2026-10-08T14:00:00.000Z',
      endsAt: '2026-10-08T15:00:00.000Z',
      status: 'PLANNED',
      groupName: '8-A Matematik',
      subject: 'Matematik',
      teacherName: 'Ece Öğretmen',
    },
    attendance: { status: null, label: 'Katılım işlenmedi', tone: 'neutral' },
    topic: 'Kesirlerde toplama',
    homework: null,
    nextGoal: 'Payda eşitleme',
    personalNote: null,
    assignments: [],
    join: { state: 'NOT_YET', url: null, opensAt: '2026-10-08T13:30:00.000Z' },
    recovery: null,
    enrollmentActive: true,
    ...overrides,
  };
}

export function makeMaterial(overrides: Partial<MobileMaterial> = {}): MobileMaterial {
  return {
    id: 'm-1',
    kind: 'PDF',
    title: 'Kesirler özet',
    description: null,
    groupName: '8-A Matematik',
    subject: 'Matematik',
    url: null,
    hasFile: true,
    fileName: 'kesirler.pdf',
    mimeType: 'application/pdf',
    captionsAvailable: false,
    transcript: null,
    preferred: false,
    ...overrides,
  };
}

export function makeMaterialList(materials: MobileMaterial[] = [makeMaterial()]): MobileMaterialList {
  return { profile: { id: 'sp-1' }, lowDataMode: false, preferenceActive: false, materials };
}

export function makeInsights(overrides: Partial<Extract<MobileInsights, { state: 'READY' }>> = {}): MobileInsights {
  return {
    contractVersion: 1,
    state: 'READY',
    periodLabel: 'Son 30 gün · son 6 deneme',
    periodRange: '2026-09-08 – 2026-10-08',
    narrative: ['Derslere düzenli katılıyorsun.'],
    isEmpty: false,
    academic: { examCount: 0, netDelta: null, netTrend: [], labels: [], subjects: [], strengths: [], supportAreas: [], subjectCaption: null },
    behavioral: {
      attendance: { percent: 90, numerator: 9, denominator: 10 },
      assignments: { percent: 50, numerator: 1, denominator: 2 },
    },
    weeklyGoal: null,
    weeklyGoalUpdatedAt: null,
    mockExamAnalysis: false,
    ...overrides,
  };
}

export function makeMockExams(): MobileMockExams {
  return { profile: { id: 'sp-1' }, exams: [], trend: [], current: null };
}

export function makeReviewQueue(): MobileReviewQueue {
  return {
    contractVersion: 1,
    state: 'READY',
    dailyLimit: 5,
    activeCount: 1,
    masteredCount: 0,
    items: [{ id: 'rv-1', title: 'Kesirler tekrarı', sourceReference: 'Ders · Kesirler', solutionNote: null, stage: 0, dueAt: '2026-10-08T06:00:00.000Z', sourceType: 'TEACHER_REFERENCE' }],
  };
}

export function makeRecovery(): MobileRecovery {
  return {
    contractVersion: 1,
    state: 'READY',
    packages: [
      {
        id: 'rp-1',
        lessonId: 'l-missed',
        status: 'PUBLISHED',
        lessonTitle: 'Türkçe',
        lessonDate: '2026-10-07T15:00:00.000Z',
        summaryTopic: 'Paragrafta ana fikir',
        sharedNote: null,
        summaryNextStep: 'Özetten sonra kısa çalışmayı yap.',
        checkpointPrompt: 'Ana fikri bulabiliyor musun?',
        checkpointResponse: null,
        dueAt: '2026-10-10T15:00:00.000Z',
        outcomeTitles: [],
        items: [{ id: 'ri-1', kind: 'ASSIGNMENT', title: 'Kısa çalışma', completed: false, target: { type: 'assignments' } }],
      },
    ],
  };
}

export function makeWeeklyDigest(): MobileWeeklyDigest {
  return {
    contractVersion: 1,
    state: 'READY',
    digest: {
      id: 'wd-1',
      goodThingOne: 'Tüm derslere katıldın.',
      goodThingTwo: 'İki çalışmayı zamanında bitirdin.',
      supportArea: 'Kesirlerde tekrar faydalı olur.',
      homeQuestion: 'Bu hafta en çok neyi sevdin?',
      dataThrough: '2026-10-05T21:00:00.000Z',
      trendBand: 'STEADY',
    },
    feedback: null,
  };
}
