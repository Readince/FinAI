import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Chatbot from "./Chatbot";

export default function Dashboard() {
  const navigate = useNavigate();
  const [operation, setOperation] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (operation) navigate(operation);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    navigate("/", { replace: true });
  };

  return (
    <>
      <Container
        maxWidth="md"
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
        }}
      >
        <Card sx={{ width: "100%" }}>
          <CardHeader
            avatar={<DashboardRoundedIcon color="primary" />}
            title="Panel"
            subheader="Lütfen bir işlem seçiniz."
            titleTypographyProps={{ variant: "h5" }}
          />

          <CardContent>
            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="operation-label">İşlem seçiniz</InputLabel>
                  <Select
                    labelId="operation-label"
                    id="operation"
                    value={operation}
                    label="İşlem seçiniz"
                    onChange={(e) => setOperation(e.target.value as string)}
                  >
                    <MenuItem value="">
                      <em>— Seçin —</em>
                    </MenuItem>
                    <MenuItem value="/yeni-musteri">Yeni Müşteri Kaydı</MenuItem>
                    <MenuItem value="/hesap-islemleri">Hesap İşlemleri</MenuItem>
                    <MenuItem value="/musteri-sorgu">Müşteri Bilgi Sorgulama</MenuItem>
                    {/* YENİ: Hesap Kapatma */}
                    <MenuItem value="/hesap-kapatma">Hesap Kapatma</MenuItem>
                    <MenuItem value="/sube-musteri-listesi">Şube Müşteri Listesi</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1} justifyContent="flex-start">
                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={<ArrowForwardRoundedIcon />}
                    disabled={!operation}
                  >
                    Git
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="text"
                color="error"
                startIcon={<LogoutRoundedIcon />}
                onClick={logout}
              >
                Çıkış Yap
              </Button>
            </Stack>

            <Chatbot />
          </CardContent>
        </Card>
      </Container>
    </>
  );
}

