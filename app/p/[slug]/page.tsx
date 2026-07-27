import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProposalBySlug, markProposalViewed } from "@/lib/proposals";
import { ContentProvider } from "@/lib/content-context";
import NavBar from "@/components/NavBar";
import { SectionIndex } from "@/components/SectionIndex";
import HeroSection from "@/components/sections/HeroSection";
import SobreNosSection from "@/components/sections/SobreNosSection";
import PorQueNasceuSection from "@/components/sections/PorQueNasceuSection";
import ProblemaSection from "@/components/sections/ProblemaSection";
import SolucaoSection from "@/components/sections/SolucaoSection";
import ConversaSection from "@/components/sections/ConversaSection";
import ResultadosSection from "@/components/sections/ResultadosSection";
import EntregaveisSection from "@/components/sections/EntregaveisSection";
import CronogramaSection from "@/components/sections/CronogramaSection";
import InvestimentoSection from "@/components/sections/InvestimentoSection";
import DiferenciaisSection from "@/components/sections/DiferenciaisSection";
import CtaSection from "@/components/sections/CtaSection";
import Footer from "@/components/Footer";

// Cada proposta pode mudar de status (rascunho/enviada/visualizada) a qualquer
// momento no banco — nunca cachear nem prerenderizar estaticamente esta rota.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const proposal = await getProposalBySlug(slug);
  if (!proposal) return {};

  return {
    title: proposal.content.meta.title,
    description: proposal.content.meta.description,
  };
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const proposal = await getProposalBySlug(slug);

  if (!proposal) notFound();

  // Primeira abertura do link pelo cliente: sai de "enviada" para "visualizada".
  // Fire-and-forget — não bloqueia o render, e não mexe em "rascunho" (a
  // própria agência pode estar revisando o link).
  if (proposal.status === "enviada") {
    void markProposalViewed(proposal.id);
  }

  return (
    <ContentProvider content={proposal.content}>
      <NavBar />
      <SectionIndex />
      <main>
        <HeroSection />
        <SobreNosSection />
        <PorQueNasceuSection />
        <ProblemaSection />
        <SolucaoSection />
        <ConversaSection />
        <ResultadosSection />
        <EntregaveisSection />
        <CronogramaSection />
        <InvestimentoSection />
        <DiferenciaisSection />
        <CtaSection />
      </main>
      <Footer />
    </ContentProvider>
  );
}
