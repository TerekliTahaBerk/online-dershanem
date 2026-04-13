import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function SifremiUnuttumPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

  return (
    <main className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl overflow-hidden shadow-xl border border-stone-200 bg-white">
          <div className="bg-[#091413] px-8 py-5 flex items-center">
            <Image
              src="/logo.png"
              alt="Online Dershanem"
              width={150}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </div>
          <div className="p-8 sm:p-10">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
