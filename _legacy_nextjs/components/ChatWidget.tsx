"use client";

import { useState, useRef, useEffect } from "react";
import { api, WHATSAPP_NUMBER } from "@/lib/api";
import { Send, X, MessageCircle, Bot } from "lucide-react";

interface Message {
  role: "user" | "bot";
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content:
        "السلام عليكم! حياك الله — أنا تاجر، مساعدك الذكي. سواء تبي تحلل متجرك أو تولد محتوى أو تستشير — أنا هنا. كيف أقدر أساعدك اليوم؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgRef.current) {
      msgRef.current.scrollTop = msgRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput("");
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    try {
      const data = await api.chat(msg, history) as { reply: string };
      const newHistory = [
        ...history,
        { role: "user", content: msg },
        { role: "assistant", content: data.reply },
      ].slice(-20);
      setHistory(newHistory);
      setMessages((prev) => [...prev, { role: "bot", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "عذراً، المساعد غير متاح حالياً. تواصل معنا عبر واتساب." },
      ]);
    }
    setBusy(false);
  };

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("مرحباً، أريد الاستفسار عن خدمات أدوات التاجر")}`;

  return (
    <div className="tj-widgets">
      {/* Chat button */}
      <button
        className="tj-fab tj-fab-chat"
        onClick={() => setOpen(!open)}
        title="تحدث مع المساعد"
      >
        {open ? (
          <X size={22} color="#fff" />
        ) : (
          <MessageCircle size={22} color="#fff" />
        )}
      </button>

      {/* WhatsApp button */}
      <a className="tj-fab tj-fab-wa" href={waUrl} target="_blank" rel="noopener noreferrer" title="واتساب">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </a>

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "5.5rem",
            left: "1.5rem",
            width: 340,
            maxWidth: "calc(100vw - 3rem)",
            background: "var(--bg-card)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9991,
            overflow: "hidden",
            fontFamily: "var(--font-arabic)",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "1rem 1.2rem",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}>
            <div style={{
              width: 34, height: 34,
              background: "rgba(255,255,255,0.25)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={18} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>تاجر — مساعدك الذكي</div>
              <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>● متاح الآن · يجيب فوراً</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            ref={msgRef}
            style={{
              height: 280,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  maxWidth: "85%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: 14,
                  fontSize: "0.88rem",
                  lineHeight: 1.55,
                  wordBreak: "break-word",
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "var(--accent)" : "var(--bg)",
                  color: m.role === "user" ? "#fff" : "var(--ink)",
                  border: m.role === "bot" ? "1px solid var(--line)" : "none",
                  borderBottomRightRadius: m.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: m.role === "bot" ? 4 : 14,
                }}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div style={{
                alignSelf: "flex-start",
                display: "flex", gap: 4,
                padding: "0.55rem 0.85rem",
              }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: 7, height: 7,
                    background: "var(--ink-mid)",
                    borderRadius: "50%",
                    display: "block",
                    animation: `tjDot 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: "0.8rem 1rem",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: "0.5rem",
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="اكتب رسالتك..."
              maxLength={500}
              style={{
                flex: 1,
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "0.5rem 0.8rem",
                color: "var(--ink)",
                fontFamily: "var(--font-arabic)",
                fontSize: "0.88rem",
                outline: "none",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--line)"; }}
            />
            <button
              onClick={send}
              disabled={busy}
              style={{
                width: 36, height: 36,
                background: "var(--accent)",
                border: "none", borderRadius: 10,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, opacity: busy ? 0.6 : 1,
              }}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tjDot {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
