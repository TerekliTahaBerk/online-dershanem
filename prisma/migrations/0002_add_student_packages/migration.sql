-- CreateTable
CREATE TABLE "StudentPackage" (
    "studentId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPackage_pkey" PRIMARY KEY ("studentId","packageId")
);

-- CreateIndex
CREATE INDEX "StudentPackage_packageId_idx" ON "StudentPackage"("packageId");

-- AddForeignKey
ALTER TABLE "StudentPackage" ADD CONSTRAINT "StudentPackage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPackage" ADD CONSTRAINT "StudentPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
