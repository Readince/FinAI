import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  IconButton,
  TextField,
  Button,
  Divider,
  Avatar,
  Tooltip,
  Fab,
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
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("chatbot_messages", JSON.stringify(messages));
    // aşağı kaydır
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const placeholder = useMemo(
    () =>
      "Merhaba! Şimdilik sadece arayüzüm var 👋\nMesajını yaz ve 'Gönder' de; demo yanıt döner.",
    []
  );

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const uid = crypto.randomUUID?.() ?? String(Math.random());
    const now = Date.now();

    const next = [
      ...messages,
      { id: uid, role: "user", content: text, ts: now } as ChatMessage,
    ];
    setMessages(next);
    setInput("");

    // DEMO: sahte yanıt (burayı sonra gerçek API entegrasyonuyla değiştir)
    setTimeout(() => {
      const aid = crypto.randomUUID?.() ?? String(Math.random());
      setMessages((prev) => [
        ...prev,
        {
          id: aid,
          role: "assistant",
          content:
            "🔧 API beklemede. Mesajını aldım: “" +
            text +
            "”. Entegrasyon hazır olunca buradan cevaplayacağım.",
          ts: Date.now(),
        },
      ]);
    }, 350);
  };

  return (
    <>
      {/* FAB – Sağ alt */}
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
                Çevrimdışı (yalnızca UI)
              </Typography>
            </Box>

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
                      m.role === "user" ? "primary.main" : "background.default",
                    color: m.role === "user" ? "primary.contrastText" : "text.primary",
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

          {/* Giriş alanı */}
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
                disabled={!input.trim()}
              >
                Gönder
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </>
  );
}
