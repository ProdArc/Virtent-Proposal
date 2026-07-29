// Conteúdo de demonstração / seed inicial — usado por `npm run seed` para
// popular a primeira proposta no Supabase, e como fonte do tipo `Content`.
// Editar este arquivo NÃO muda nenhuma proposta já publicada: cada proposta
// tem seu próprio JSON na coluna `content` da tabela `proposals`. Para editar
// uma proposta existente, edite a linha correspondente no Supabase.

export const content = {
  meta: {
    title: "Proposta Comercial - Virtent",
    description: "Proposta de operação virtual Virtent no WhatsApp para o Cartão de TODOS.",
  },

  company: {
    name: "Virtent",
    tagline: "Operação virtual no WhatsApp",
    cnpj: "00.000.000/0001-00", // TODO: preencher CNPJ
    email: "contato@virtent.com.br", // TODO: preencher email real
    phone: "(11) 93055-5399",
    website: "virtent.com.br",
  },

  client: {
    name: "Cartão de TODOS - Campinas Sudoeste", // TODO: preencher nome da empresa cliente
    contactName: "Nome do Contato", // TODO: preencher nome do decisor
    role: "Multi-franqueado", // TODO: preencher cargo
  },

  proposal: {
    number: "Eduardo Vaz", // TODO: preencher número da proposta
    date: "20 de junho de 2026",
    validUntil: "20 de julho de 2026", // TODO: ajustar prazo de validade
    title: "Operação Virtual Virtent",
    subtitle: "Mais resultado, sem aumentar a equipe: a operação do Cartão de TODOS em um só WhatsApp.",
    badge: "Proposta Confidencial",
  },

  hero: {
    headline: "A operação do Cartão de TODOS centralizada em um só WhatsApp — sem hora pra parar.",
    body: "Apresentamos a solução Virtent para a organização {clientName}.", // {clientName} substituído em runtime
    cta: "Ver Proposta",
    ctaAnchor: "#investimento",
    imageUrl: "https://picsum.photos/seed/virtent-whatsapp-operacao/700/900",
    imageAlt: "Atendimento via WhatsApp representando a operação virtual da Virtent",
    statLabel: "Unidades atendidas",
    statValue: "6",
  },

  sobreNos: {
    eyebrow: "Quem somos",
    headline: "Não vendemos software. Construímos estratégia sob medida.",
    headlineHighlight: "estratégia sob medida",
    description:
      "Analisamos a operação real de cada unidade antes de qualquer linha de código. O resultado não é uma ferramenta genérica, é uma solução desenhada para o seu modelo de negócio, com estratégia por trás de cada decisão.",
    panel: {
      franquias: {
        value: 20,
        suffix: "+",
        title: "franquias utilizam a Virtent",
        label: "unidades do Cartão de TODOS operando com a nossa estrutura",
      },
      gestores: {
        title: "Gestores aprovam",
        label: "metas batidas e aceleração do negócio no dia a dia da operação",
        badge: "Metas batidas",
      },
      estrategias: {
        title: "Estratégias prontas",
        label: "modelos testados de ponta a ponta, ativos desde o primeiro dia",
        chips: ["Vendas", "Cobrança", "Cancelamento", "Agendamento"],
      },
    },
  },

  porQueNasceu: {
    eyebrow: "Nossa origem",
    headline: "Por que a Virtent nasceu",
    intro:
      "Antes de construir a Virtent, testamos as principais ferramentas de automação de atendimento disponíveis no mercado. Esbarramos em limitações que nos fizeram repensar o modelo desde a base.",
    items: [
      {
        title: "Pouca personalização",
        description:
          "Fluxos genéricos, difíceis de adaptar à realidade de cada unidade.",
      },
      {
        title: "Dificuldades operacionais",
        description:
          "Configuração complexa e pouca flexibilidade para ajustar réguas no dia a dia da operação.",
      },
      {
        title: "Riscos com APIs não oficiais",
        description:
          "Ferramentas que operam fora da API oficial do WhatsApp, expondo o número da unidade a bloqueios e banimentos.",
      },
      {
        title: "Foco no mercado em massa",
        description:
          "Ferramentas pensadas para o mercado em massa, sem funções que resolvem as dores específicas de quem opera uma franquia.",
      },
      {
        title: "Necessidade de adaptar a operação",
        description:
          "Em vez de a ferramenta se adaptar ao negócio, era a unidade que precisava se adaptar à ferramenta.",
      },
    ],
    closing:
      "Estratégia sem a ferramenta certa não sai do papel. Ferramenta sem foco não gera resultado. A Virtent é as duas coisas, construída para o seu negócio, não para o mercado inteiro.",
  },

  problema: {
    eyebrow: "O Desafio",
    headline: "Reconhece algum desses cenários?",
    items: [
      {
        number: "01",
        title: "Atendimento limitado ao horário comercial",
        description:
          "Fora do expediente, a captação e a cobrança param, mesmo com clientes ativos e dispostos a resolver pendências a qualquer hora.",
      },
      {
        number: "02",
        title: "Equipe humana limitada em escala",
        description:
          "Poucos atendentes para uma base grande de clientes significa filas, demora nas respostas e oportunidades perdidas.",
      },
      {
        number: "03",
        title: "Risco com ferramentas não oficiais",
        description:
          "Automações fora da API oficial do WhatsApp expõem o número da unidade a bloqueios e banimentos.",
      },
      {
        number: "04",
        title: "Operação fragmentada",
        description:
          "Vendas, cobrança, cancelamento e agendamento tratados em canais e processos separados, sem histórico único do cliente.",
      },
    ],
  },

  resultados: {
    eyebrow: "Case de sucesso",
    headline: "O que a IA já entregou na prática",
    description:
      "Números de uma operação real do Cartão de TODOS, conduzida de ponta a ponta pela Virtent.",
    arrecadacao: {
      value: "R$ 17.245",
      label: "arrecadados em régua conduzida do primeiro contato ao pagamento",
      badge: "100% IA · sem intervenção humana",
    },
    meta: {
      pct: 60,
      display: "60%",
      title: "de meta batida na régua de NR",
      badge: "100% trabalhada pela Virtent",
    },
    matriculas: {
      value: "550",
      title: "matrículas convertidas",
      label: "recuperadas e concluídas pela operação automatizada",
    },
    abordagens: {
      value: "+ de 100",
      title: "matrículas abordadas sobre alteração na forma de pagamento",
      label: "a IA conduz toda a conversa e o conciliador entra apenas nas etapas finais",
    },
    closing:
      "Isso não é esforço extra da equipe. É o que acontece quando nenhum cliente escapa por falta de horário, volume ou follow-up.",
  },

  solucao: {
    headline: "Sua operação, sem hora pra parar.",
    description:
      "A Virtent é uma operação virtual construída sobre o WhatsApp (API oficial) que atua como uma extensão da sua equipe, cobrindo o horário, o volume e a memória que nenhuma equipe humana sustenta sozinha, do primeiro contato à recorrência. O resultado cresce. A equipe não precisa aumentar.",
    features: [
      {
        icon: "ChatsCircle",
        title: "Atendimento em escala",
        description:
          "Amplia a capacidade de interação com grandes bases de clientes, sem depender apenas do volume da equipe humana.",
      },
      {
        icon: "MoonStars",
        title: "Além do horário comercial",
        description:  
          "Mantém a operação ativa à noite e nos fins de semana, captando e respondendo clientes fora do expediente.",
      },
      {
        icon: "Coins",
        title: "Cobrança e arrecadação",
        description:
          "Automatiza réguas de cobrança, aborda clientes inadimplentes e amplia a recuperação de valores em aberto.",
      },
      {
        icon: "ArrowsClockwise",
        title: "Recorrência",
        description:
          "Identifica quem hoje exige cobrança manual todo mês e conduz a troca da forma de pagamento, depois da mudança, o cliente passa a pagar sozinho, sem a equipe precisar cobrar de novo.",
      },
      {
        icon: "Megaphone",
        title: "Campanhas estratégicas",
        description:
          "Disparos eficientes e jornadas de relacionamento para vendas, reativação e engajamento da base.",
      },
      {
        icon: "ClockCounterClockwise",
        title: "Histórico centralizado",
        description:
          "Organiza todas as conversas em um só lugar e gera contexto para a operação humana agir com mais precisão.",
      },
    ],
  },

  conversa: {
    eyebrow: "Poder",
    headline: "Uma conversa real, conduzida pela IA",
    description:
      "Do primeiro contato ao link de filiação | fora do horário comercial, sem intervenção humana.",
    chip: "21:07 · terça-feira",
    replay: "Assistir novamente",
  },

  entregaveis: {
    eyebrow: "Escopo",
    headline: "O que está incluso",
    items: [
      {
        icon: "ListChecks",
        title: "Protocolo de Setores",
        description:
          "Fluxos configurados para vendas, cobrança/adimplência, cancelamento e agendamento, adaptados à operação da unidade.",
      },
      {
        icon: "WhatsappLogo",
        title: "WhatsApp com API oficial",
        description:
          "Comunicação feita pela API oficial da Meta, evitando o risco de banimento do número da unidade.",
      },
      {
        icon: "Rocket",
        title: "Implantação assistida",
        description:
          "Mapeamento da operação, templates testados e treinamento da equipe para o uso do canal.",
      },
      {
        icon: "UsersThree",
        title: "Acompanhamento contínuo",
        description:
          "Nosso time de sucesso do cliente acompanha a operação de perto e evolui as estratégias junto com a unidade.",
      },
      {
        icon: "ChartLineUp",
        title: "Relatórios de resultados",
        description:
          "Acompanhamento de métricas de arrecadação, aproveitamento de campanhas.",
      },
      {
        icon: "ShieldCheck",
        title: "Extensão da sua equipe",
        description:
          "A Virtent cobre o horário, o volume e a memória que a equipe sozinha não sustentaria, sem tirar dela o que faz de melhor: decidir e se relacionar com o cliente.",
      },
    ],
  },

  cronograma: {
    headline: "Cronograma de implantação",
    description: "Da assinatura do contrato à operação plena em quatro semanas.",
    steps: [
      {
        phase: "Etapa 1",
        title: "Contratação e setup",
        description: "Assinatura do contrato, configuração da conta oficial do WhatsApp (Meta) e integração com a API do Mercado Pago, seguidas do alinhamento inicial da operação com o time da unidade.",
      },
      {
        phase: "Etapa 2",
        title: "Personalização",
        description:
          "Ajustes dos protocolos de IA por setor (vendas, cobrança, cancelamento e agendamento) e definição a partir das particularidades de cada unidade.",
      },
      {
        phase: "Etapa 3",
        title: "Treinamento da equipe",
        description:
          "Capacitação da equipe da unidade e dos gestores no uso da operação virtual, com sessão ao vivo e materiais de apoio.",
      },
      {
        phase: "Etapa 4",
        title: "Operação monitorada",
        description:
          "Início das operações com acompanhamento ativo do nosso time de sucesso do cliente.",
      },
      // TODO: ajuste as fases conforme o escopo real da implantação
    ],
  },

  investimento: {
    eyebrow: "Investimento",
    headline: "Um único plano, sem fidelidade",
    description: "Cobre a operação inteira do Cartão de TODOS, do primeiro contato à recorrência.",
    ctaContratar: "Contratar agora",
    plan: {
      name: "Virtent Completo",
      description: "Toda a operação virtual, de ponta a ponta",
      price: "R$ 2.200",
      period: "/mês",
      setupLabel: "Implantação única",
      setupPrice: "R$ 999,90",
      commissionLabel: "Comissão sobre arrecadação via IA",
      commissionValue: "5%",
      noFidelityBadge: "Sem fidelidade",
      features: [
        "Todas as réguas: vendas, cobrança, cancelamento e agendamento",
        "IA humanizada com protocolo por setor",
        "CRM organizado por setor",
        "Follow-up automático em todas as réguas",
        "Campanhas de disparo inteligentes",
        "WhatsApp com API oficial",
        "Account manager dedicado",
      ],
    },
    margem: {
      eyebrow: "Por que isso vira margem",
      title: "A Virtent trabalha quando a sua operação não trabalha",
      description:
        "Fim de semana, feriado, fora do horário comercial — todo contato captado nesses períodos é receita que hoje simplesmente não existe. Isso não cobre só a mensalidade: sobra margem.",
      stat: { value: "24/7", label: "operação ativa, mesmo fora do expediente" },
    },
    closing: "Só os finais de semana já cobrem o investimento. O resto é margem.",
  },

  diferenciais: {
    headline: "Por que escolher a Virtent",
    items: [
      {
        icon: "TrendUp",
        title: "Mais resultado, mesma equipe",
        description:
          "A operação sustenta mais volume e mais horário sem exigir uma equipe maior, e em vários casos, o mesmo resultado ou mais passa a ser entregue por uma equipe menor.",
      },
      {
        icon: "SquaresFour",
        title: "Atuação multi-frente, não só cobrança",
        description:
          "Enquanto a maioria das soluções do mercado resolve apenas cobrança pontual, a Virtent centraliza vendas, cobrança, cancelamento, agendamento e recorrência em uma única operação.",
      },
      {
        icon: "WhatsappLogo",
        title: "API oficial do WhatsApp",
        description:
          "Comunicação feita pelo canal oficial da Meta, sem risco de bloqueio ou banimento do número da unidade, diferente de ferramentas que operam por fora da API.",
      },
      {
        icon: "Brain",
        title: "IA humanizada com protocolo por setor",
        description:
          "Cada frente de atuação, vendas, cobrança, cancelamento, agendamento, tem um protocolo de conversa próprio, desenhado para o contexto e o objetivo daquela interação. Nada de script único genérico.",
      },
      {
        icon: "BellRinging",
        title: "Follow-up automático",
        description:
          "A operação reengaja automaticamente leads e clientes que não responderam ou não concluíram uma ação, respeitando os intervalos e o tom certos para cada régua, sem depender de alguém lembrar de retomar o contato.",
      },
      {
        icon: "Kanban",
        title: "CRM organizado por setor",
        description:
          "Conversas e status de clientes centralizados e segmentados por setor, dando à equipe humana visibilidade clara de onde cada cliente está na jornada, sem depender de planilhas paralelas.",
      },
      {
        icon: "Megaphone",
        title: "Campanhas de disparo inteligentes",
        description:
          "Disparos em massa segmentados e direcionados considerando o perfil e o momento do cliente na jornada, maximizando a taxa de resposta e conversão.",
      },
    ],
  },

  ctaFinal: {
    badge: "Operação ativa 24/7",
    headline: "Pronto para uma operação\nsem hora pra parar?",
    body: "Fale com um dos nossos consultores e dê o próximo passo ainda esta semana.",
    cta: "Falar com Consultor",
    ctaHref: "mailto:contato@virtent.com.br", // TODO: preencher email do consultor responsável
  },

  footer: {
    tagline: "Operação virtual no WhatsApp",
    navLinks: [
      { label: "Solução", href: "#solucao" },
      { label: "Entregáveis", href: "#entregaveis" },
      { label: "Investimento", href: "#investimento" },
    ],
    legal: "2026 Virtent. Todos os direitos reservados.", // TODO: adicionar CNPJ real
  },
};

/** Shape do JSON guardado em `proposals.content` no Supabase — uma proposta por linha. */
export type Content = typeof content;