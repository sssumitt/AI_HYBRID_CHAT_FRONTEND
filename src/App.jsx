import { useState } from "react";
import { motion } from "framer-motion";
import { SendHorizonal, Loader2, Copy, Check } from "lucide-react";
import Markdown from "react-markdown";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Xin chào 🇻🇳! I'm your Vietnam Travel Assistant. Tell me what kind of trip you're dreaming about — romantic, adventure, or cultural?",
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track which assistant messages have their reasoning expanded
  const [expanded, setExpanded] = useState({});

  // Track which message was recently copied
  const [copied, setCopied] = useState(null);

  // Helper: extract reasoning (inside <reasoning>...</reasoning>) and
  // return an object with main (visible) text and reasoning (optional)
  const parseMessage = (text) => {
    if (!text) return { main: "", reasoning: null };

    // Extract <reasoning>...</reasoning>
    const reasoningMatch = text.match(/<reasoning>[\s\S]*?<\/reasoning>/i);
    let reasoning = null;
    let cleaned = text;

    if (reasoningMatch) {
      reasoning = reasoningMatch[0]
        .replace(/<reasoning>/i, "")
        .replace(/<\/reasoning>/i, "")
        .trim();

      // Remove reasoning block from cleaned version
      cleaned = cleaned.replace(reasoningMatch[0], "");
    }

    // Remove itinerary tags but keep their content
    cleaned = cleaned.replace(/<\/itinerary>|<itinerary>/gi, "").trim();

    // Final trimming
    return { main: cleaned, reasoning };
  };

  const toggleReasoning = (idx) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Copy handler: copies visible main text and, if the reasoning panel is expanded,
  // appends the reasoning block as well.
  const handleCopy = async (msg, idx) => {
    const { main, reasoning } = parseMessage(msg.content);
    let textToCopy = main || "";

    if (expanded[idx] && reasoning) {
      textToCopy += `\n\nReasoning:\n${reasoning}`;
    }

    // Try navigator.clipboard first, fallback to textarea method
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(idx);
      setTimeout(() => setCopied(null), 1800);
    } catch (err) {
      console.error("Copy failed", err);
      // Optionally inform the user; for simplicity we'll set copied to -1 for a short time
      setCopied(-1);
      setTimeout(() => setCopied(null), 1800);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message to chat for an optimistic UI update
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentInput,
          conversation_id: conversationId,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (!conversationId) {
        setConversationId(data.conversation_id);
      }

      const botMessage = {
        role: "assistant",
        content: data.answer,
        sources: data.source_ids,
      };

      setMessages([...newMessages, botMessage]);

    } catch (err) {
      console.error("Error fetching chat response:", err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "⚠️ Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="max-h-screen flex flex-col items-center justify-center text-gray-100 px-4 py-10 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/image.png')",
      }}
    >
      <div className="w-full max-w-3xl h-screen flex flex-col border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden bg-black/35 backdrop-blur-2xl">
        {/* Header */}
        <div className="border-b border-white/10 py-5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Vietnam Travel Assistant
          </h1>
          <p className="text-sm text-gray-300">Plan your dream Vietnam trip with AI guidance</p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 max-h-[70vh] overflow-y-auto p-6 space-y-4 backdrop-blur-xl bg-black/15 rounded-2xl mx-4 my-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <style>{`
            ::-webkit-scrollbar { width: 5px;}
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background-color: #98a7beff; border-radius: 9999px; }
          `}</style>

          {messages.map((msg, i) => {
            const { main, reasoning } = parseMessage(msg.content);
            const isAssistant = msg.role === "assistant";

            return (
              <div key={i} className="w-full flex flex-col">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`max-w-[80%] p-4 rounded-2xl leading-relaxed whitespace-pre-line shadow-md text-sm md:text-base ${
                    msg.role === "user"
                      ? "ml-auto bg-sky-600 text-white"
                      : "bg-gray-800/80 text-gray-100 border border-gray-700"
                  }`}
                >
                  <Markdown>{main}</Markdown>

                  {/* Controls: reasoning toggle (if available) + copy button */}
                  {isAssistant && (
                    <div className="mt-3 flex items-start gap-3">
                      {reasoning && (
                        <button
                          onClick={() => toggleReasoning(i)}
                          className="text-xs px-3 py-1 rounded-full border border-gray-600 bg-gray-900/40 hover:bg-gray-900/60 transition"
                        >
                          {expanded[i] ? "Hide reasoning" : "Show reasoning"}
                        </button>
                      )}

                      <button
                        onClick={() => handleCopy(msg, i)}
                        className="text-xs px-3 py-1 rounded-full border border-gray-600 bg-gray-900/40 hover:bg-gray-900/60 transition flex items-center gap-2"
                        aria-label="Copy message"
                      >
                        {copied === i ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === i ? "Copied" : "Copy"}</span>
                      </button>

                      {reasoning && <span className="text-xs text-gray-400 italic">chain-of-thought</span>}
                    </div>
                  )}
                </motion.div>

                {/* Collapsible reasoning panel */}
                {isAssistant && reasoning && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={expanded[i] ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`max-w-[80%] ml-0 overflow-hidden ${expanded[i] ? "mt-2" : "mt-0"}`}
                    style={{ alignSelf: "flex-start" }}
                  >
                    <div className="p-3 rounded-xl bg-white/5 border border-white/6 text-xs text-gray-300 leading-tight">
                      <Markdown>{reasoning}</Markdown>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Input Section */}
        <div className="border-t border-white/10 flex items-center gap-3 p-4 bg-gray-900/70 backdrop-blur-md">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your Vietnam travel question..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none px-4 py-3 text-sm md:text-base border border-gray-700 rounded-2xl focus:ring-2 focus:ring-sky-500 backdrop-blur-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-3 bg-sky-600 rounded-2xl text-white transition flex items-center justify-center w-[44px] h-[44px]"
            aria-label="Send"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <SendHorizonal size={20} />
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-300 mt-6 drop-shadow">© {new Date().getFullYear()} Vietnam Travel Assistant</p>
    </div>
  );
}
