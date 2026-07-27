import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F9FBF8] px-6 text-center">
      <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46]">
        Virtent
      </p>
      <h1 className="text-2xl font-extrabold text-[#18181B]">Proposta não encontrada</h1>
      <p className="text-sm text-[#71717A] max-w-[42ch] leading-relaxed">
        Esse link pode ter expirado ou não existir. Fale com seu consultor Virtent para
        receber o link correto.
      </p>
      <Link
        href="/"
        className="text-sm font-semibold text-[#065F46] hover:text-[#047857] transition-colors duration-200 mt-2"
      >
        Voltar
      </Link>
    </main>
  );
}
