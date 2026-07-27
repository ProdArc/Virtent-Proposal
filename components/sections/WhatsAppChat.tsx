"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";

const MSGS = [
  { side: "received", text: "Boa noite", time: "21:07", pause: 900 },
  { side: "received", text: "Poderia me passar mais informações sobre o Cartão de TODOS?", time: "21:08", pause: 1000 },
  { side: "sent", text: "Boa noite! Sou a Cláudia, consultora do Cartão de TODOS. Tudo bem? 😊", time: "21:08", pause: 1800 },
  { side: "received", text: "Tudo bem sim e contigo?", time: "21:09", pause: 600 },
  { side: "sent", text: "Tudo certo, obrigada! 😄\n\nVocê está buscando principalmente pela parte de saúde ou por descontos em farmácia e no dia a dia?", time: "21:09", pause: 2000 },
  { side: "received", text: "Mais pela saúde, gostaria de marcar consultas com um valor mais em conta", time: "21:19", pause: 900 },
  { side: "sent", text: "Atualmente, você realiza suas consultas pelo SUS ou particular?", time: "21:19", pause: 2000 },
  { side: "received", text: "Uso o SUS", time: "21:19", pause: 500 },
  { side: "sent", text: "Entendo. O SUS é a realidade de muita gente. O cartão funciona bem pra quem quer ter uma opção particular sem pagar absurdo.", time: "21:21", pause: 2200 },
  { side: "sent", text: "Nós temos consultas a partir de R$ 30 e exames com até 70% de desconto, além de 53 especialidades disponíveis. E atende rápido, sem aquela fila que o SUS tem 🙂", time: "21:21", pause: 800 },
  { side: "sent", text: "Quantas pessoas moram com você?", time: "21:22", pause: 800 },
  { side: "received", text: "Só eu e meu esposo", time: "21:22", pause: 900 },
  { side: "sent", text: "Ótimo! O valor sai muito em conta. A mensalidade é fixada em R$ 33,40 e o seu marido entra como dependente sem custo adicional.", time: "21:22", pause: 2000 },
  { side: "sent", text: "Só pra vocês terem uma ideia: uma consulta com o clínico geral sai por volta de R$ 30, e exames com até 70% de desconto. Vocês já teriam economia na primeira consulta! 💚", time: "21:23", pause: 700 },
  { side: "received", text: "Entendi, e como faço?", time: "21:44", pause: 500 },
  { side: "sent", text: "É bem simples! A gente faz tudo por aqui mesmo, na conversa 😊\n\nMas antes, me diz o seu nome?", time: "21:44", pause: 1800 },
  { side: "received", text: "Me chamo Karen", time: "21:47", pause: 900 },
  { side: "sent", text: "Ótimo, Karen! Então vou te enviar um link rápido pra você e seu marido finalizarem o cadastro.\n\nO processo é bem prático. Você preenche os dados básicos, confirma e pronto. A carteirinha fica disponível no app assim que finalizar 🎉", time: "21:48", pause: 2200 },
  { side: "sent", text: "🔗 https://link-de-filiação", time: "21:48", pause: 700, isLink: true },
  { side: "sent", text: "Qualquer dúvida durante o processo, é só chamar que eu ajudo! 💬", time: "21:49", pause: 600 },
  { side: "received", text: "Ok, muito obrigada!", time: "21:51", pause: 1000 },
  { side: "sent", text: "De nada, Karen! Fico feliz em ajudar. Se precisar, é só me chamar! 😊💚", time: "21:51", pause: 0 },
] as const;

const TYPING_DELAY = 650;

export function WhatsAppChat({
  visible,
  onClose,
  onComplete,
  frameless = false,
}: {
  visible: boolean;
  onClose?: () => void;
  /** Chamado ao fim da conversa (última mensagem exibida). */
  onComplete?: () => void;
  /** Sem borda/raio/sombra próprios — para uso dentro de um frame (mockup de celular). */
  frameless?: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!visible) {
      setVisibleCount(0);
      setShowTyping(false);
      return;
    }

    const ids: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;

    MSGS.forEach((msg, i) => {
      if (msg.side === "sent") {
        ids.push(setTimeout(() => setShowTyping(true), acc));
        acc += TYPING_DELAY;
        ids.push(setTimeout(() => {
          setShowTyping(false);
          setVisibleCount(i + 1);
        }, acc));
      } else {
        ids.push(setTimeout(() => setVisibleCount(i + 1), acc));
      }
      acc += msg.pause;
    });

    ids.push(setTimeout(() => onCompleteRef.current?.(), acc + 600));

    return () => ids.forEach(clearTimeout);
  }, [visible]);

  // Auto-scroll do container de mensagens apenas — nunca da página
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [visibleCount, showTyping]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`flex flex-col w-full h-full overflow-hidden ${frameless ? "" : "rounded-2xl"}`}
          style={
            frameless
              ? { background: "#ECE5DD" }
              : {
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(24px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
                }
          }
        >
          {/* Header */}
          <div
            className="px-3 py-2.5 flex items-center gap-2.5 shrink-0"
            style={
              frameless
                ? { background: "#075E54", paddingTop: "40px" }
                : {
                    background: "rgba(6,78,59,0.82)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }
            }
          >
            {/* AI avatar */}
            <div className="relative shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{
                  background: "linear-gradient(135deg, #25D366 0%, #075E54 100%)",
                  boxShadow: "0 0 0 1.5px rgba(37,211,102,0.4)",
                }}
              >
                IA
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: "#25D366", borderColor: "rgba(6,78,59,0.9)" }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white text-[13px] font-semibold leading-none truncate">
                  Cláudia
                </p>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-wide uppercase"
                  style={{ background: "rgba(37,211,102,0.22)", color: "#4ADE80", border: "1px solid rgba(37,211,102,0.3)" }}
                >
                  IA
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(168,213,162,0.85)" }}>
                Assistente virtual · online
              </p>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                style={{ background: "rgba(255,255,255,0.08)" }}
                aria-label="Fechar"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex flex-col gap-1.5 p-3 overflow-y-auto flex-1"
            style={
              frameless
                ? { background: "#ECE5DD" }
                : {
                    background: "rgba(236,229,221,0.55)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }
            }
          >
            {(MSGS.slice(0, visibleCount) as typeof MSGS[number][]).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`flex ${msg.side === "received" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] px-2.5 py-1.5 ${
                    msg.side === "received" ? "rounded-xl rounded-tl-sm" : "rounded-xl rounded-tr-sm"
                  }`}
                  style={{
                    background: msg.side === "received"
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(220,248,198,0.92)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  {"isLink" in msg && msg.isLink ? (
                    <p className="text-[11.5px] leading-relaxed text-[#065F46] underline underline-offset-2">
                      {msg.text}
                    </p>
                  ) : (
                    <p className="text-[11.5px] leading-relaxed whitespace-pre-line" style={{ color: "#111B21" }}>
                      {msg.text}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[9.5px]" style={{ color: "#667781" }}>{msg.time}</span>
                    {msg.side === "sent" && (
                      <svg width="13" height="8" viewBox="0 0 14 9" fill="none">
                        <path d="M1 4.5l3 3L10 1M6 4.5l3 3" stroke="#34B7F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator — right side (AI is typing) */}
            <AnimatePresence>
              {showTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-end"
                >
                  <div
                    className="rounded-xl rounded-tr-sm px-3 py-2.5 flex items-center gap-1"
                    style={{ background: "rgba(220,248,198,0.9)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="rounded-full"
                        style={{ width: 5, height: 5, background: "#667781" }}
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 0.55, delay: i * 0.14 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input bar */}
          <div
            className="px-2 py-2 flex items-center gap-2 shrink-0"
            style={
              frameless
                ? { background: "#F0F0F0", paddingBottom: "14px" }
                : {
                    background: "rgba(240,240,240,0.7)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderTop: "1px solid rgba(255,255,255,0.15)",
                  }
            }
          >
            <div
              className="flex-1 rounded-full px-3 py-1.5 text-[11px]"
              style={{ background: "rgba(255,255,255,0.8)", color: "#667781" }}
            >
              Mensagem
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#25D366", boxShadow: "0 2px 8px rgba(37,211,102,0.4)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
