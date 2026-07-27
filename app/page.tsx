// Raiz do site — nunca deve expor a proposta de nenhum cliente específico.
// Cada cliente acessa sua proposta por um link direto e não-adivinhável em
// /p/[slug]; a listagem interna para consulta fica em /propostas (protegida).

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F9FBF8] px-6 text-center">
      <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46]">
        Virtent
      </p>
      <h1 className="text-2xl font-extrabold text-[#18181B]">Nenhuma proposta selecionada</h1>
      <p className="text-sm text-[#71717A] max-w-[42ch] leading-relaxed">
        Acesse sua proposta pelo link enviado pelo seu consultor Virtent.
      </p>
    </main>
  );
}
