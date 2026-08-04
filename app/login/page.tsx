import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/painel";

  const user = await getSessionUser();
  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-8 overflow-hidden bg-[#F9FBF8] px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.08),transparent_60%)]" />

      <div className="relative flex flex-col items-center gap-4 text-center">
        <Image
          src="/images/virtent-logo-icon.png"
          alt="Virtent"
          width={48}
          height={48}
          className="rounded-xl shadow-sm"
        />
        <div>
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-1">
            Virtent
          </p>
          <h1 className="text-xl font-extrabold text-[#18181B]">Acesso interno</h1>
        </div>
      </div>

      <div className="relative">
        <LoginForm next={safeNext} />
      </div>
    </main>
  );
}
