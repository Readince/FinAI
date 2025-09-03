import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Card, CardHeader, CardContent, Grid, Box, Stack, Divider,
  Button, TextField, Typography, Alert, Table, TableHead, TableRow,
  TableCell, TableBody, RadioGroup, FormControlLabel, Radio, FormControl,
  InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import dayjs from "dayjs";

const API_BASE = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:3001";

type Account = {
  id: string | number;
  customer_id: string | number;
  currency_code: string;
  balance: string;
  account_type: "VADESIZ" | "VADELI";
  interest_rate: string;
  sub_no: number | null;
  sub_no_str?: string;
  account_no: string;
  status: string; // ACTIVE / CLOSED ...
  created_at?: string;
  branch_code?: number | string;
};

type Customer = {
  id: string | number;
  national_id?: string;
  first_name?: string;
  last_name?: string;
};

type SummaryAPI = { customer: any; accounts: Account[] };

export default function HesapKapatma() {
  const navigate = useNavigate();

  const [tckn, setTckn] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  // payout state
  const [method, setMethod] = useState<"CASH" | "TRANSFER" | "">("");
  const [targetId, setTargetId] = useState<string | number | "">("");

  // receipt dialog
  const [receipt, setReceipt] = useState<any | null>(null);
  const [closing, setClosing] = useState(false);
  const [msg, setMsg] = useState("");

  const selected = useMemo(
    () => accounts.find(a => String(a.id) === String(selectedId)) || null,
    [accounts, selectedId]
  );

  const vadesizOthers = useMemo(
    () =>
      accounts.filter(
        a =>
          a.account_type === "VADESIZ" &&
          a.status === "ACTIVE" &&
          String(a.id) !== String(selectedId)
      ),
    [accounts, selectedId]
  );

  const balanceNum = useMemo(
    () => (selected ? Number(selected.balance) || 0 : 0),
    [selected]
  );

  const payoutAmount = balanceNum;

  const canCloseZeroBalance = selected && balanceNum === 0;
  const mustChoosePayout = selected && balanceNum > 0;

  useEffect(() => {
    setMethod("");
    setTargetId("");
    setMsg("");
  }, [selectedId]);

  const goBack = () => navigate(-1);
  const logout = () => {
    localStorage.removeItem("auth");
    navigate("/", { replace: true });
  };

  async function fetchSummary() {
    setErr("");
    setMsg("");
    setReceipt(null);
    setSelectedId(null);

    if (!/^\d{11}$/.test(tckn)) {
      setErr("TCKN 11 haneli olmalı");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/customers/summary?national_id=${tckn}`);
      if (!r.ok) {
        if (r.status === 404) throw new Error("Müşteri bulunamadı");
        const j = await safeJson(r);
        throw new Error(j?.msg || `Hata: ${r.status}`);
      }
      const data: SummaryAPI = await r.json();
      setCustomer({
        id: data.customer.id,
        national_id: data.customer.national_id,
        first_name: data.customer.first_name,
        last_name: data.customer.last_name,
      });
      setAccounts(data.accounts || []);
    } catch (e: any) {
      setCustomer(null);
      setAccounts([]);
      setErr(e.message || "Beklenmeyen hata");
    } finally {
      setLoading(false);
    }
  }

  async function safeJson(res: Response) {
    try { return await res.json(); } catch { return null; }
  }

  function formatMoney(val: number, ccy: string) {
    try {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: ccy || "TRY",
        maximumFractionDigits: 2
      }).format(val);
    } catch {
      return `${val.toFixed(2)} ${ccy}`;
    }
  }

  const disableSelect = (a: Account) => a.status !== "ACTIVE";

  const canSubmit = !!selected && (
    canCloseZeroBalance ||
    (mustChoosePayout && (
      (method === "CASH") ||
      (method === "TRANSFER" && targetId)
    ))
  );

  async function onCloseAccount() {
    if (!selected) return;
    if (!canSubmit) {
      setMsg("Lütfen gerekli alanları doldurun.");
      return;
    }

    setClosing(true);
    setMsg("");
    try {
      const body: any = { payout_method: method || (balanceNum === 0 ? "CASH" : undefined) };
      if (method === "TRANSFER") body.target_account_id = Number(targetId);

      const r = await fetch(`${API_BASE}/accounts/${selected.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await safeJson(r);

      if (!r.ok) {
        throw new Error(j?.msg || `Hesap kapatma başarısız (HTTP ${r.status})`);
      }

      await fetchSummary();

      setReceipt({
        date: dayjs().format("DD.MM.YYYY HH:mm"),
        customer: customer,
        closed: selected,
        payout: {
          method: method || "CASH",
          amount: payoutAmount,
          currency: selected.currency_code,
          target: method === "TRANSFER"
            ? vadesizOthers.find(v => String(v.id) === String(targetId))
            : null
        }
      });

      setMsg("Hesap başarıyla kapatıldı.");
    } catch (e: any) {
      setMsg(e.message || "Beklenmeyen bir hata oluştu");
    } finally {
      setClosing(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Card>
          <CardHeader
            title="Hesap Kapatma"
            action={
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={goBack}>
                  Geri Dön
                </Button>
                <Button variant="text" color="error" startIcon={<LogoutRoundedIcon />} onClick={logout}>
                  Çıkış Yap
                </Button>
              </Stack>
            }
          />
          <CardContent>
            <Stack direction="row" spacing={2}>
              <TextField
                label="TCKN / VKN (11 hane)"
                value={tckn}
                onChange={(e) => setTckn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                sx={{ maxWidth: 300 }}
              />
              <Button variant="contained" onClick={fetchSummary} disabled={loading}>
                {loading ? "Sorgulanıyor..." : "Sorgula"}
              </Button>
            </Stack>
            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          </CardContent>
        </Card>

        {!!customer && (
          <Card>
            <CardHeader
              title={`Müşteri: ${customer.first_name || ""} ${customer.last_name || ""} (${customer.national_id})`}
              subheader="Hesap listesinden kapatılacak hesabı seçin"
            />
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Hesap No</TableCell>
                    <TableCell>Şube No</TableCell>
                    <TableCell>Döviz</TableCell>
                    <TableCell align="right">Bakiye</TableCell>
                    <TableCell>Hesap Tipi</TableCell>
                    <TableCell align="right">Faiz (%)</TableCell>
                    <TableCell>Ek No</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell align="center">Seç</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.map(a => {
                    const isInactive = a.status !== "ACTIVE";
                    const isSelected = String(selectedId) === String(a.id);
                    return (
                      <TableRow
                        key={a.account_no}
                        hover={!isInactive}
                        selected={isSelected}
                        sx={{
                          bgcolor: isInactive ? (theme) => theme.palette.action.disabledBackground : undefined,
                          opacity: isInactive ? 0.7 : 1
                        }}
                      >
                        <TableCell>{a.account_no}</TableCell>
                        <TableCell>{a.branch_code ?? "—"}</TableCell>
                        <TableCell>{a.currency_code}</TableCell>
                        <TableCell align="right">{a.balance}</TableCell>
                        <TableCell>{a.account_type === "VADELI" ? "Vadeli" : "Vadesiz"}</TableCell>
                        <TableCell align="right">{a.interest_rate}</TableCell>
                        <TableCell>{a.sub_no ?? "—"}</TableCell>
                        <TableCell>{a.status}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant={isSelected ? "contained" : "outlined"}
                            onClick={() => setSelectedId(a.id)}
                            disabled={isInactive}
                          >
                            {isSelected ? "Seçili" : "Seç"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Kapatma paneli */}
              {selected && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Hesap Kapatma İşlemi
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>Seçili Hesap</Typography>
                          <Typography>Hesap No: <b>{selected.account_no}</b></Typography>
                          <Typography>Döviz: <b>{selected.currency_code}</b></Typography>
                          <Typography>Bakiye: <b>{formatMoney(balanceNum, selected.currency_code)}</b></Typography>
                          <Typography>Tip: <b>{selected.account_type === "VADELI" ? "Vadeli" : "Vadesiz"}</b></Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>Ödeme / Aktarım</Typography>

                          {canCloseZeroBalance ? (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              Bakiye 0 olduğu için aktarım seçimi gerekmiyor. Hesap doğrudan kapatılabilir.
                            </Alert>
                          ) : (
                            <>
                              <FormControl sx={{ mb: 2 }}>
                                <RadioGroup
                                  row
                                  value={method}
                                  onChange={(e) => setMethod(e.target.value as any)}
                                >
                                  <FormControlLabel value="CASH" control={<Radio />} label="Kasadan Teslim" />
                                  <FormControlLabel
                                    value="TRANSFER"
                                    control={<Radio />}
                                    label="Vadesiz Hesaba Aktar"
                                    disabled={vadesizOthers.length === 0}
                                  />
                                </RadioGroup>
                              </FormControl>

                              {method === "TRANSFER" && (
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                  <InputLabel id="target-label">Hedef Vadesiz Hesap</InputLabel>
                                  <Select
                                    labelId="target-label"
                                    label="Hedef Vadesiz Hesap"
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                  >
                                    {vadesizOthers.map(v => (
                                      <MenuItem key={v.id} value={v.id}>
                                        {v.account_no} — Bakiye: {v.balance} {v.currency_code}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            </>
                          )}

                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2">
                            Ödenecek Tutar: <b>{formatMoney(payoutAmount, selected.currency_code)}</b>
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {msg && <Alert severity={msg.startsWith("Hesap başarıyla") ? "success" : "error"} sx={{ mt: 2 }}>{msg}</Alert>}

                  <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => { setSelectedId(null); setMethod(""); setTargetId(""); }}>
                      İptal
                    </Button>
                    <Button
                      variant="contained"
                      onClick={onCloseAccount}
                      disabled={!canSubmit || closing}
                    >
                      {closing ? "Kapatılıyor..." : "Hesabı Kapat"}
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Fiş (Dialog) */}
      <Dialog open={!!receipt} onClose={() => setReceipt(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Hesap Kapatma Fişi</DialogTitle>
        <DialogContent dividers>
          {receipt && (
            <Box sx={{ fontFamily: "monospace", fontSize: 14 }}>
              <Typography>Tarih: {receipt.date}</Typography>
              <Typography>
                Müşteri: {receipt.customer?.first_name} {receipt.customer?.last_name} ({receipt.customer?.national_id})
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography>Kapatılan Hesap: {receipt.closed.account_no}</Typography>
              <Typography>Döviz: {receipt.closed.currency_code}</Typography>
              <Typography>Ödeme Yöntemi: {receipt.payout.method === "CASH" ? "Kasadan Teslim" : "Havale"}</Typography>
              {receipt.payout.target && (
                <Typography>Hedef Hesap: {receipt.payout.target.account_no}</Typography>
              )}
              <Typography>
                Ödenecek Tutar: {formatMoney(receipt.payout.amount, receipt.closed.currency_code)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.print()}>Yazdır</Button>
          <Button variant="contained" onClick={() => setReceipt(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
