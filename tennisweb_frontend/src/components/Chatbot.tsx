"use client";

import { useEffect, useRef, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { Bars3Icon, XMarkIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type Msg = { role: "user" | "assistant"; content: string };

const initialGreeting: Msg = {
  role: "assistant",
  content:
    "Hello! I'm your AI tennis assistant. I can help you with tennis tips, strategies, equipment recommendations, and more. What would you like to know?",
};

export default function Chatbot() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([initialGreeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async () => {
    if (!isAuthenticated) {
      router.push("/login/register");
      return;
    }
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    // Add user message and an empty assistant placeholder for streaming
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    try {
      const history = [...messages, userMsg].slice(-12);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          setMessages((prev) => {
            // Update the last (assistant) message with streamed chunk
            const next = [...prev];
            const idx = next.length - 1;
            if (idx >= 0 && next[idx].role === "assistant") {
              next[idx] = { ...next[idx], content: next[idx].content + chunk };
            } else {
              next.push({ role: "assistant", content: chunk });
            }
            return next;
          });
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const next = [...prev];
        // Replace/append error on the last assistant message slot
        const idx = next.length - 1;
        const msg = `Sorry, I couldn't process that. ${e?.message ?? ""}`;
        if (idx >= 0 && next[idx].role === "assistant" && !next[idx].content) {
          next[idx] = { role: "assistant", content: msg };
        } else {
          next.push({ role: "assistant", content: msg });
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Allow other components (e.g., Header) to open the chat
  useEffect(() => {
    const handler = () => {
      if (!isAuthenticated) {
        router.push("/login/register");
        return;
      }
      setOpen(true);
    };
    window.addEventListener("open-chatbot", handler as EventListener);
    return () => window.removeEventListener("open-chatbot", handler as EventListener);
  }, []);

  return (
    <div>
      {/* Toggle button (still available on pages without header access) */}
      {!open && (
        <button
          onClick={() => {
            if (!isAuthenticated) {
              router.push("/login/register");
              return;
            }
            setOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-white shadow-lg hover:bg-indigo-500"
        >
          <span className="text-lg"><ChatBubbleLeftRightIcon className="h-5 w-5" /></span>
          <span className="text-sm font-semibold">AI Assistant</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] h-[60vh] max-h-[85vh] bg-white shadow-xl rounded-2xl flex flex-col ring-1 ring-black/10 overflow-hidden">
          <div className="flex items-center justify-between bg-indigo-600 text-white px-4 py-2 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span><ChatBubbleLeftRightIcon className="h-5 w-5" /></span>
              <span className="font-semibold">AI Tennis Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-90 hover:opacity-100">✕</button>
          </div>

          <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3 bg-gray-50/60">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-200 shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-gray-500">Assistant is typing…</div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 flex items-center gap-2 bg-white/95 rounded-b-2xl">
            <input
              className="flex-1 rounded-xl border border-gray-300/80 bg-white px-4 py-2.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-100 hover:border-gray-100 shadow-sm"
              placeholder="Ask about tennis…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white w-10 h-10 hover:bg-indigo-500 disabled:opacity-50 shadow"
              aria-label="Send"
              title="Send"
            >
              <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
