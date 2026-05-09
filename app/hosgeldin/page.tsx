import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";

export const dynamic = "force-dynamic";

export default async function HosgeldinPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  // If onboarding already completed, send straight to panel
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true, name: true },
  });

  if (user?.onboardingCompletedAt) {
    redirect("/panel");
  }

  return <OnboardingFlow firstName={(user?.name ?? "").split(" ")[0] || null} />;
}
