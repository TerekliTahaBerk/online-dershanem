import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days, hour = 19, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function ensurePackage() {
  const existing = await prisma.package.findFirst({
    where: { name: "TYT-AYT Premium Takip Paketi" }
  });

  if (existing) return existing;

  return prisma.package.create({
    data: {
      name: "TYT-AYT Premium Takip Paketi",
      description:
        "Canli ders, performans takibi, haftalik deneme analizi ve ogrenci paneli erisimi iceren premium takip paketi.",
      price: 200000,
      paytrLink: "https://www.paytr.com/link/dQECKnq",
      lessonCount: 16,
      subjects: "Matematik, Fizik, Kimya, Turkce"
    }
  });
}

async function ensureCourse(adminUserId) {
  const course = await prisma.course.upsert({
    where: { slug: "tyt-matematik-problem-kampi" },
    update: {
      title: "TYT Matematik Problem Kampi",
      description:
        "Temel problem tipleri, hiz stratejileri ve deneme transferini hedefleyen 6 haftalik moduler kurs.",
      subject: "Matematik",
      examType: "TYT",
      levelLabel: "Orta-Ust Seviye",
      estimatedMinutes: 720,
      status: "PUBLISHED"
    },
    create: {
      title: "TYT Matematik Problem Kampi",
      slug: "tyt-matematik-problem-kampi",
      description:
        "Temel problem tipleri, hiz stratejileri ve deneme transferini hedefleyen 6 haftalik moduler kurs.",
      subject: "Matematik",
      examType: "TYT",
      levelLabel: "Orta-Ust Seviye",
      estimatedMinutes: 720,
      status: "PUBLISHED"
    }
  });

  const moduleCount = await prisma.courseModule.count({ where: { courseId: course.id } });
  if (moduleCount === 0) {
    const moduleDefinitions = [
      {
        title: "Temel Problem Mantigi",
        description: "Problem kurgusunu hizli okuma ve denklem kurma aliskanligi.",
        contents: [
          {
            title: "Problemlere Giris ve Cozum Iskeleti",
            description: "Metni parcalama, bilinmeyen secimi ve hizli modelleme.",
            contentType: "VIDEO",
            durationMinutes: 42,
            videoUrl: "https://example.com/videos/problem-giris"
          },
          {
            title: "Calisma Kagidi PDF",
            description: "Ders sonu tekrar notlari ve uygulama sorulari.",
            contentType: "PDF",
            durationMinutes: 20,
            fileUrl: "https://example.com/files/problem-kampi-hafta-1.pdf"
          }
        ]
      },
      {
        title: "Yeni Nesil Problemler",
        description: "Uzun paragraflarda veri ayiklama ve sure yonetimi.",
        contents: [
          {
            title: "Canli Etut: Zaman ve Is Problemleri",
            description: "Google Meet uzerinden cozum odakli etut.",
            contentType: "LIVE_SESSION",
            durationMinutes: 60,
            liveStartsAt: daysFromNow(2, 20, 0),
            liveEndsAt: daysFromNow(2, 21, 0),
            externalUrl: "https://meet.google.com/premium-problem-kampi"
          },
          {
            title: "Haftalik Quiz",
            description: "12 soruluk hiz olcumu ve geri bildirim formu.",
            contentType: "QUIZ",
            durationMinutes: 25,
            externalUrl: "https://example.com/quizzes/problem-hafta-2"
          }
        ]
      }
    ];

    for (const [moduleIndex, moduleDefinition] of moduleDefinitions.entries()) {
      const module = await prisma.courseModule.create({
        data: {
          courseId: course.id,
          title: moduleDefinition.title,
          description: moduleDefinition.description,
          orderIndex: moduleIndex
        }
      });

      for (const [contentIndex, content] of moduleDefinition.contents.entries()) {
        await prisma.courseContent.create({
          data: {
            moduleId: module.id,
            title: content.title,
            description: content.description,
            contentType: content.contentType,
            orderIndex: contentIndex,
            durationMinutes: content.durationMinutes,
            status: "PUBLISHED",
            liveStartsAt: content.liveStartsAt,
            liveEndsAt: content.liveEndsAt,
            videoUrl: content.videoUrl,
            fileUrl: content.fileUrl,
            externalUrl: content.externalUrl,
            createdById: adminUserId
          }
        });
      }
    }
  }

  return prisma.course.findUniqueOrThrow({
    where: { id: course.id },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: { contents: { orderBy: { orderIndex: "asc" } } }
      }
    }
  });
}

async function ensureTeacher() {
  const email = "ogretmen@onlinedershanem.com";
  const password = "ogretmen123";
  const name = "Test Ogretmen";
  const passwordHash = await bcrypt.hash(password, 12);

  const teacherUser = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "TEACHER"
    },
    create: {
      email,
      name,
      passwordHash,
      role: "TEACHER"
    }
  });

  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {
      fullName: name,
      subjects: "Matematik",
      bio: "Problem kampi ve birebir performans takibini yurutmek icin ornek ogretmen hesabi.",
      status: "ACTIVE",
      userId: teacherUser.id
    },
    create: {
      fullName: name,
      email,
      subjects: "Matematik",
      bio: "Problem kampi ve birebir performans takibini yurutmek icin ornek ogretmen hesabi.",
      status: "ACTIVE",
      userId: teacherUser.id
    }
  });

  console.log(`Test ogretmen hesabi hazir: ${email} / ${password}`);
  return { teacherUser, teacher };
}

async function ensureStudent(samplePackage) {
  const email = "ogrenci@onlinedershanem.com";
  const password = "ogrenci123";
  const name = "Ayse Yilmaz";
  const passwordHash = await bcrypt.hash(password, 12);

  const studentUser = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "STUDENT"
    },
    create: {
      email,
      name,
      passwordHash,
      role: "STUDENT"
    }
  });

  const student = await prisma.student.upsert({
    where: { phoneKey: "905551112233" },
    update: {
      fullName: name,
      phone: "+90 555 111 22 33",
      email,
      city: "Istanbul",
      district: "Kadikoy",
      schoolName: "Kabatas Erkek Lisesi",
      classLevel: "12. Sinif",
      examType: "TYT-AYT",
      currentLevel: "Orta-Ust",
      currentNet: "82.5 net",
      targetGoal: "Ilk 15.000",
      targetSchool: "Bogazici Universitesi",
      targetRanking: "15000",
      strongLessons: "Turkce, Matematik",
      weakLessons: "Fizik, Problem sorulari",
      needType: "Canli ders + performans takibi",
      studyStatus: "Duzenli ama sure yonetiminde zorlaniyor",
      weeklyStudyHours: "24",
      parentFullName: "Fatma Yilmaz",
      parentPhone: "+90 532 000 11 22",
      parentEmail: "veli@onlinedershanem.com",
      source: "Instagram reklam",
      activePackage: samplePackage.name,
      status: "ACTIVE",
      notes: "Panel referans tasarimindaki ogrenci akislarini besleyen ornek kayit.",
      userId: studentUser.id
    },
    create: {
      fullName: name,
      phone: "+90 555 111 22 33",
      phoneKey: "905551112233",
      email,
      city: "Istanbul",
      district: "Kadikoy",
      schoolName: "Kabatas Erkek Lisesi",
      classLevel: "12. Sinif",
      examType: "TYT-AYT",
      currentLevel: "Orta-Ust",
      currentNet: "82.5 net",
      targetGoal: "Ilk 15.000",
      targetSchool: "Bogazici Universitesi",
      targetRanking: "15000",
      strongLessons: "Turkce, Matematik",
      weakLessons: "Fizik, Problem sorulari",
      needType: "Canli ders + performans takibi",
      studyStatus: "Duzenli ama sure yonetiminde zorlaniyor",
      weeklyStudyHours: "24",
      parentFullName: "Fatma Yilmaz",
      parentPhone: "+90 532 000 11 22",
      parentEmail: "veli@onlinedershanem.com",
      source: "Instagram reklam",
      activePackage: samplePackage.name,
      status: "ACTIVE",
      notes: "Panel referans tasarimindaki ogrenci akislarini besleyen ornek kayit.",
      userId: studentUser.id
    }
  });

  console.log(`Test ogrenci hesabi hazir: ${email} / ${password}`);
  return { studentUser, student };
}

async function ensureCamps() {
  const campCount = await prisma.camp.count();
  if (campCount > 0) {
    console.log(`Kamplar zaten mevcut (${campCount} adet), seed atlandi.`);
    return;
  }

  const campPaytrLink = "https://www.paytr.com/link/dQECKnq";
  const camps = [
    {
      name: "AYT Belirleyici Konular Kampi",
      detail: "Trigonometri, Turev, Limit ve Logaritma konulariyla AYT'de en kritik dort alana odaklanilir.",
      category: "AYT",
      quota: 1,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    },
    {
      name: "Fonksiyon ve Polinom Kampi",
      detail: "Fonksiyonlar, Polinomlar, ikinci dereceden denklemler ve esitsizlikler basliklarinda sistemli tekrar yapilir.",
      category: "AYT",
      quota: 3,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    },
    {
      name: "AYT Geometri Ana Kampi",
      detail: "Cember ve daire, dogrunun analitigi, noktanin analitigi ve kati cisimler konularinda geometri temeli guclendirilir.",
      category: "AYT",
      quota: 2,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    },
    {
      name: "Problemler Kampi",
      detail: "Problemler konusu uzerinde soru cozum stratejileri ve hiz calismalari yapilir.",
      category: "TYT",
      quota: 2,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    },
    {
      name: "Fonksiyon ve Grafik Kampi",
      detail: "Fonksiyonlar ve grafik yorumlama konulariyla TYT temel yorum gucu gelistirilir.",
      category: "TYT",
      quota: 1,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    },
    {
      name: "Yeni Nesil Sorular Kampi",
      detail: "Problem cozum, mantik ve cok adimli sorular uzerinden yeni nesil soru bakis acisi kazandirilir.",
      category: "LGS",
      quota: 3,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    },
    {
      name: "Geometri Kampi",
      detail: "Ucgenler, eslik ve benzerlik, donusum geometrisi basliklarinda geometri temeli pekistirilir.",
      category: "LGS",
      quota: 2,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    },
    {
      name: "Acilar ve Ucgenler Kampi",
      detail: "Acilar ve Ucgenler konularinda temel kavramlar ve soru cozum teknikleri islenir.",
      category: "LGS",
      quota: 1,
      price: 200000,
      originalPrice: 500000,
      paytrLink: campPaytrLink
    }
  ];

  await prisma.camp.createMany({ data: camps });
  console.log(`${camps.length} kamp eklendi.`);
}

async function seedStudentExperience({ adminUserId, teacherId, studentId, userId, packageId, courseId, contentIds }) {
  const activeEnrollment = await prisma.studentPackageEnrollment.findFirst({
    where: { studentId, packageId, status: "ACTIVE" }
  });

  const enrollment = activeEnrollment ?? await prisma.studentPackageEnrollment.create({
    data: {
      studentId,
      packageId,
      source: "PURCHASE",
      status: "ACTIVE",
      startsAt: daysFromNow(-12, 9, 0),
      autoRenew: true,
      listPrice: 200000,
      discountAmount: 0,
      billingPeriodLabel: "Aylik",
      notes: "Admin paneli uzerinden olusturulan ornek aktif uyelik."
    }
  });

  const packageCourse = await prisma.packageCourse.findUnique({
    where: { packageId_courseId: { packageId, courseId } }
  });

  if (!packageCourse) {
    await prisma.packageCourse.create({
      data: {
        packageId,
        courseId,
        isRequired: true,
        sortOrder: 0
      }
    });
  }

  await prisma.studentCourseProgress.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: {
      enrollmentId: enrollment.id,
      completionPercent: 48,
      completedContent: 2,
      totalContent: 4,
      lastOpenedAt: daysFromNow(-1, 21, 10)
    },
    create: {
      studentId,
      courseId,
      enrollmentId: enrollment.id,
      completionPercent: 48,
      completedContent: 2,
      totalContent: 4,
      lastOpenedAt: daysFromNow(-1, 21, 10)
    }
  });

  for (const [index, contentId] of contentIds.entries()) {
    await prisma.studentContentProgress.upsert({
      where: { studentId_contentId: { studentId, contentId } },
      update: {
        status: index < 2 ? "COMPLETED" : index === 2 ? "IN_PROGRESS" : "NOT_STARTED",
        completionPercent: index < 2 ? 100 : index === 2 ? 45 : 0,
        secondsSpent: index < 2 ? 2400 : index === 2 ? 950 : 0,
        lastOpenedAt: index < 3 ? daysFromNow(-index, 20, 15) : null,
        completedAt: index < 2 ? daysFromNow(-(index + 2), 22, 0) : null
      },
      create: {
        studentId,
        contentId,
        status: index < 2 ? "COMPLETED" : index === 2 ? "IN_PROGRESS" : "NOT_STARTED",
        completionPercent: index < 2 ? 100 : index === 2 ? 45 : 0,
        secondsSpent: index < 2 ? 2400 : index === 2 ? 950 : 0,
        lastOpenedAt: index < 3 ? daysFromNow(-index, 20, 15) : null,
        completedAt: index < 2 ? daysFromNow(-(index + 2), 22, 0) : null
      }
    });
  }

  if (await prisma.studentGoal.count({ where: { studentId } }) === 0) {
    await prisma.studentGoal.createMany({
      data: [
        {
          studentId,
          title: "Haftalik 240 soru",
          description: "Panel ana ekrandaki haftalik hedef kartini besler.",
          unit: "soru",
          targetValue: 240,
          currentValue: 186,
          dueAt: daysFromNow(5, 23, 0),
          status: "ACTIVE"
        },
        {
          studentId,
          title: "Aylik net ortalamasini 85'e cikar",
          description: "Deneme trend grafikleri icin ana hedef.",
          unit: "net",
          targetValue: 85,
          currentValue: 82.5,
          dueAt: daysFromNow(24, 23, 0),
          status: "ACTIVE"
        }
      ]
    });
  }

  const existingResult = await prisma.studentExamResult.findFirst({
    where: { studentId, title: "TYT Genel Deneme #07" }
  });

  const examResult = existingResult ?? await prisma.studentExamResult.create({
    data: {
      studentId,
      assessmentType: "DENEME",
      examType: "TYT",
      title: "TYT Genel Deneme #07",
      takenAt: daysFromNow(-6, 10, 30),
      score: 388.4,
      net: 82.5,
      correctCount: 96,
      wrongCount: 19,
      blankCount: 5,
      ranking: 134,
      notes: "Problem sorularinda sure kaybi var, fizik tekrarlarina agirlik verilmeli."
    }
  });

  const subjects = [
    {
      subject: "Turkce",
      correctCount: 32,
      wrongCount: 5,
      blankCount: 3,
      net: 30.75,
      maxNet: 40,
      trendDelta: 1.5,
      topics: [
        { topic: "Paragraf", correctCount: 18, wrongCount: 2, blankCount: 0, net: 17.5, masteryPct: 88 },
        { topic: "Dil Bilgisi", correctCount: 8, wrongCount: 2, blankCount: 2, net: 7.5, masteryPct: 75 }
      ]
    },
    {
      subject: "Matematik",
      correctCount: 25,
      wrongCount: 9,
      blankCount: 6,
      net: 22.75,
      maxNet: 40,
      trendDelta: 2.25,
      topics: [
        { topic: "Problemler", correctCount: 6, wrongCount: 4, blankCount: 2, net: 5, masteryPct: 58 },
        { topic: "Fonksiyonlar", correctCount: 5, wrongCount: 1, blankCount: 0, net: 4.75, masteryPct: 92 }
      ]
    },
    {
      subject: "Fen Bilimleri",
      correctCount: 19,
      wrongCount: 4,
      blankCount: 1,
      net: 18,
      maxNet: 20,
      trendDelta: 1.75,
      topics: [
        { topic: "Fizik - Isi Sicaklik", correctCount: 2, wrongCount: 2, blankCount: 0, net: 1.5, masteryPct: 50 },
        { topic: "Biyoloji - Kalitim", correctCount: 2, wrongCount: 1, blankCount: 1, net: 1.75, masteryPct: 56 }
      ]
    },
    {
      subject: "Sosyal Bilimler",
      correctCount: 20,
      wrongCount: 1,
      blankCount: 0,
      net: 19.75,
      maxNet: 20,
      trendDelta: 0.75,
      topics: [
        { topic: "Tarih", correctCount: 5, wrongCount: 0, blankCount: 0, net: 5, masteryPct: 100 },
        { topic: "Cografya", correctCount: 4, wrongCount: 1, blankCount: 0, net: 3.75, masteryPct: 80 }
      ]
    }
  ];

  for (const subject of subjects) {
    const subjectStat = await prisma.studentExamSubjectStat.upsert({
      where: {
        examResultId_subject: {
          examResultId: examResult.id,
          subject: subject.subject
        }
      },
      update: {
        correctCount: subject.correctCount,
        wrongCount: subject.wrongCount,
        blankCount: subject.blankCount,
        net: subject.net,
        maxNet: subject.maxNet,
        trendDelta: subject.trendDelta
      },
      create: {
        examResultId: examResult.id,
        subject: subject.subject,
        correctCount: subject.correctCount,
        wrongCount: subject.wrongCount,
        blankCount: subject.blankCount,
        net: subject.net,
        maxNet: subject.maxNet,
        trendDelta: subject.trendDelta
      }
    });

    for (const topic of subject.topics) {
      await prisma.studentExamTopicStat.upsert({
        where: {
          subjectStatId_topic: {
            subjectStatId: subjectStat.id,
            topic: topic.topic
          }
        },
        update: {
          correctCount: topic.correctCount,
          wrongCount: topic.wrongCount,
          blankCount: topic.blankCount,
          net: topic.net,
          masteryPct: topic.masteryPct
        },
        create: {
          subjectStatId: subjectStat.id,
          topic: topic.topic,
          correctCount: topic.correctCount,
          wrongCount: topic.wrongCount,
          blankCount: topic.blankCount,
          net: topic.net,
          masteryPct: topic.masteryPct
        }
      });
    }
  }

  const metricCount = await prisma.studentMetricSnapshot.count({ where: { studentId } });
  if (metricCount === 0) {
    await prisma.studentMetricSnapshot.createMany({
      data: [
        {
          studentId,
          metricKey: "net_average",
          value: 74.25,
          unit: "net",
          period: "MONTHLY",
          startsAt: daysFromNow(-90, 0, 0),
          endsAt: daysFromNow(-60, 23, 59)
        },
        {
          studentId,
          metricKey: "net_average",
          value: 78.8,
          unit: "net",
          period: "MONTHLY",
          startsAt: daysFromNow(-60, 0, 0),
          endsAt: daysFromNow(-30, 23, 59)
        },
        {
          studentId,
          metricKey: "net_average",
          value: 82.5,
          unit: "net",
          period: "MONTHLY",
          startsAt: daysFromNow(-30, 0, 0),
          endsAt: daysFromNow(0, 23, 59)
        },
        {
          studentId,
          metricKey: "attendance_rate",
          value: 92,
          unit: "percent",
          period: "MONTHLY",
          startsAt: daysFromNow(-30, 0, 0),
          endsAt: daysFromNow(0, 23, 59)
        }
      ]
    });
  }

  if (await prisma.lesson.count({ where: { studentId } }) === 0) {
    await prisma.lesson.createMany({
      data: [
        {
          studentId,
          teacherId,
          packageId,
          scheduledAt: daysFromNow(-3, 18, 0),
          duration: 90,
          googleMeetLink: "https://meet.google.com/premium-problem-kampi",
          status: "COMPLETED",
          notes: "Problem cozumu ve sure yonetimi tekrar edildi."
        },
        {
          studentId,
          teacherId,
          packageId,
          scheduledAt: daysFromNow(1, 19, 30),
          duration: 90,
          googleMeetLink: "https://meet.google.com/premium-problem-kampi",
          status: "SCHEDULED",
          notes: "Yeni nesil problemler canli dersi."
        },
        {
          studentId,
          teacherId,
          packageId,
          scheduledAt: daysFromNow(4, 19, 30),
          duration: 90,
          googleMeetLink: "https://meet.google.com/premium-problem-kampi",
          status: "SCHEDULED",
          notes: "Haftalik deneme analiz dersi."
        }
      ]
    });
  }

  const purchase = await prisma.purchaseIntent.findFirst({
    where: { studentEmail: "ogrenci@onlinedershanem.com", packageName: "TYT-AYT Premium Takip Paketi" }
  });

  if (!purchase) {
    await prisma.purchaseIntent.create({
      data: {
        source: "Instagram reklam",
        packageName: "TYT-AYT Premium Takip Paketi",
        paymentLink: "https://www.paytr.com/link/dQECKnq",
        studentFullName: "Ayse Yilmaz",
        studentPhone: "+90 555 111 22 33",
        studentEmail: "ogrenci@onlinedershanem.com",
        schoolName: "Kabatas Erkek Lisesi",
        city: "Istanbul",
        district: "Kadikoy",
        classLevel: "12. Sinif",
        department: "Sayisal",
        examType: "TYT-AYT",
        targetSchool: "Bogazici Universitesi",
        targetRanking: "15000",
        currentLevel: "Orta-Ust",
        currentNet: "82.5",
        weakLessons: "Fizik, Problem sorulari",
        strongLessons: "Turkce, Matematik",
        needType: "Canli ders + takip",
        studyStatus: "Duzenli ama sure yonetimi gelismeli",
        weeklyStudyHours: "24",
        parentFullName: "Fatma Yilmaz",
        parentPhone: "+90 532 000 11 22",
        parentEmail: "veli@onlinedershanem.com",
        notes: "Ornek seed kaydi.",
        kvkkConsent: true,
        paymentConsent: true,
        status: "PAID",
        intakeStatus: "ENROLLED",
        studentId,
        submittedAt: daysFromNow(-14, 15, 0)
      }
    });
  }

  if (await prisma.notification.count({ where: { userId } }) === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId,
          type: "CONTENT",
          priority: "NORMAL",
          title: "Yeni icerik acildi",
          body: "TYT Matematik Problem Kampi 2. modul ogrenci paneline eklendi.",
          href: "/panel/dersler"
        },
        {
          userId,
          type: "LESSON",
          priority: "HIGH",
          title: "Yarin 19:30'da canli dersin var",
          body: "Test Ogretmen ile Yeni Nesil Problemler etudu planlandi.",
          href: "/panel/takvim"
        },
        {
          userId,
          type: "PERFORMANCE",
          priority: "NORMAL",
          title: "Deneme analizin guncellendi",
          body: "TYT Genel Deneme #07 sonuclari ve zayif konu listesi hazir.",
          href: "/panel"
        }
      ]
    });
  }

  if (await prisma.auditLog.count({ where: { entityType: "student", entityId: studentId } }) === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          actorUserId: adminUserId,
          actorType: "USER",
          entityType: "student",
          entityId: studentId,
          action: "student.seeded",
          summary: "Ornek ogrenci, uyelik ve ilerleme datasi olusturuldu."
        },
        {
          actorUserId: adminUserId,
          actorType: "USER",
          entityType: "course",
          entityId: courseId,
          action: "course.seeded",
          summary: "Problem kampi icerigi paket yapisina baglandi."
        }
      ]
    });
  }
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminName = process.env.ADMIN_NAME?.trim() || "Online Dershanem Admin";

  let adminUser = null;

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: adminName,
        passwordHash,
        role: "ADMIN"
      },
      create: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "ADMIN"
      }
    });

    console.log(`Admin kullanicisi hazir: ${adminEmail}`);
  } else {
    adminUser = await prisma.user.upsert({
      where: { email: "admin@onlinedershanem.com" },
      update: {
        name: "Online Dershanem Admin",
        role: "ADMIN"
      },
      create: {
        email: "admin@onlinedershanem.com",
        name: "Online Dershanem Admin",
        passwordHash: await bcrypt.hash("admin123", 12),
        role: "ADMIN"
      }
    });

    console.log("ADMIN_EMAIL tanimli degil. Gelistirme icin varsayilan admin hesabi hazirlandi: admin@onlinedershanem.com / admin123");
  }

  const samplePackage = await ensurePackage();
  const { teacher } = await ensureTeacher();
  const { studentUser, student } = await ensureStudent(samplePackage);
  const course = await ensureCourse(adminUser.id);
  const contentIds = course.modules.flatMap((module) => module.contents.map((content) => content.id));

  await ensureCamps();
  await seedStudentExperience({
    adminUserId: adminUser.id,
    teacherId: teacher.id,
    studentId: student.id,
    userId: studentUser.id,
    packageId: samplePackage.id,
    courseId: course.id,
    contentIds
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
