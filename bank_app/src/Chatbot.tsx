import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Stack, Typography, IconButton, TextField,
  Button, Divider, Avatar, Tooltip, Fab, CircularProgress
} from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MinimizeRoundedIcon from "@mui/icons-material/MinimizeRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
};

const API_URL = import.meta.env.VITE_API_URL ?? "/ai/chat"; // örn: http://localhost:3001/ai/chat

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem("chatbot_messages");
      return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState<"checking" | "online" | "offline">("checking");

  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem("chatbot_messages", JSON.stringify(messages));
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  // Basit “ayakta mı” kontrolü (OPTIONS preflight ile)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(API_URL, { method: "OPTIONS" });
        if (!cancelled) setOnline(r.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setOnline("offline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const placeholder = useMemo(
    () =>
      "Merhaba! LLaMA ile konuşmak için yaz ve Gönder’e bas.\nCevaplar akış (stream) halinde gelecek.",
    []
  );

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const uid = crypto.randomUUID?.() ?? String(Math.random());
    const now = Date.now();

    // Kullanıcı mesajını ekle
    const next = [
      ...messages,
      { id: uid, role: "user", content: text, ts: now } as ChatMessage,
    ];
    setMessages(next);
    setInput("");

    // Akış için boş assistant mesajı ekle (canlı dolduracağız)
    const aid = crypto.randomUUID?.() ?? String(Math.random());
    setMessages((prev) => [
      ...prev,
      { id: aid, role: "assistant", content: "", ts: Date.now() },
    ]);

    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          options: { temperature: 0.6, top_p: 0.9, num_ctx: 4096 },
          keep_alive: "5m",
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      let gotFirstChunk = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // NDJSON / SSE satırlarını işle
        let idx: number;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;

          try {
            // ✅ "data:" prefixini kırp
            const clean = line.startsWith("data:")
              ? line.slice(5).trim()
              : line;

            if (!clean) continue;
            const evt = JSON.parse(clean);

            if (!gotFirstChunk) {
              setOnline("online");
              gotFirstChunk = true;
            }

            if (evt.error) throw new Error(evt.detail || evt.error);

            const delta: string = evt?.message?.content ?? "";
            if (delta) {
              full += delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aid ? { ...m, content: full } : m
                )
              );
            }

            if (evt.done) {
              buf = "";
              break;
            }
          } catch (e) {
            console.warn("JSON parse error or incomplete chunk:", e, line);
          }
        }
      }
    } catch (e: any) {
      const msg = e?.message || "Akış hatası";
      const hid = crypto.randomUUID?.() ?? String(Math.random());
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== aid),
        { id: hid, role: "assistant", content: `⚠️ ${msg}`, ts: Date.now() },
      ]);
      setOnline("offline");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <>
      {/* FAB */}
      <Tooltip title={open ? "Sohbeti kapat" : "Sohbet"}>
        <Fab
          color="primary"
          onClick={() => setOpen((v) => !v)}
          sx={{
            position: "fixed",
            right: { xs: 16, sm: 24 },
            bottom: { xs: 16, sm: 24 },
            zIndex: (t) => t.zIndex.tooltip + 1,
          }}
          aria-label="chatbot aç/kapat"
        >
          <ChatBubbleOutlineRoundedIcon />
        </Fab>
      </Tooltip>

      {/* Pencere */}
      {open && (
        <Paper
          elevation={8}
          role="dialog"
          aria-label="Sohbet penceresi"
          sx={{
            position: "fixed",
            right: { xs: 8, sm: 24 },
            bottom: { xs: 84, sm: 96 },
            width: { xs: "calc(100% - 16px)", sm: 380 },
            height: { xs: 420, sm: 520 },
            maxHeight: "75vh",
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            zIndex: (t) => t.zIndex.modal,
          }}
        >
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              px: 2,
              py: 1.25,
              bgcolor: "background.default",
              borderBottom: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <Avatar sx={{ width: 28, height: 28, mr: 1 }}>
              <ChatBubbleOutlineRoundedIcon fontSize="small" />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2}>
                Chatbot
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                {online === "checking"
                  ? "Durum kontrol ediliyor…"
                  : online === "online"
                  ? "Çevrimiçi"
                  : "Çevrimdışı"}
              </Typography>
            </Box>
            {loading && <CircularProgress size={18} sx={{ mr: 1 }} />}
            <Tooltip title="Küçült">
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                aria-label="pencereyi küçült"
              >
                <MinimizeRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Kapat">
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                aria-label="pencereyi kapat"
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Mesajlar */}
          <Box
            ref={listRef}
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 2,
              py: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              bgcolor: "background.paper",
            }}
          >
            {messages.length === 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: "background.default",
                  borderStyle: "dashed",
                }}
              >
                <Typography
                  variant="body2"
                  whiteSpace="pre-line"
                  color="text.secondary"
                >
                  {placeholder}
                </Typography>
              </Paper>
            )}
            {messages.map((m) => (
              <Stack
                key={m.id}
                direction="row"
                justifyContent={m.role === "user" ? "flex-end" : "flex-start"}
              >
                <Box
                  sx={{
                    maxWidth: "80%",
                    px: 1.25,
                    py: 1,
                    borderRadius: 2,
                    bgcolor:
                      m.role === "user"
                        ? "primary.main"
                        : "background.default",
                    color:
                      m.role === "user"
                        ? "primary.contrastText"
                        : "text.primary",
                    border:
                      m.role === "assistant"
                        ? (t) => `1px solid ${t.palette.divider}`
                        : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <Typography variant="body2">{m.content}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>

          <Divider />

          {/* Input */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            sx={{ p: 1.25 }}
          >
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="Mesajınızı yazın…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
              <Button
                type="submit"
                variant="contained"
                endIcon={<SendRoundedIcon />}
                disabled={!input.trim() || loading}
              >
                Gönder
              </Button>
              <Button onClick={cancel} variant="outlined" disabled={!loading}>
                Durdur
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </>
  );
}
