import { Grid, TextField, Typography } from "@mui/material";
function Buton() {
  return (
  <button>Giriş Yap</button >
  )
}
const MusteriBilgiSorgulama = () => {
  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h3" component="h3">
          Müşteri Bilgileri
        </Typography>
      </Grid>
      <Grid size={6}>
        <TextField
          id="outlined-basic"
          label="Outlined"
          variant="outlined"
          fullWidth
        />
      </Grid>
      <Grid size={6}>
        <TextField
          id="outlined-basic"
          label="Outlined"
          variant="outlined"
          fullWidth
        />
      </Grid>
      <Grid size={6}>
        <TextField
          id="outlined-basic"
          label="Outlined"
          variant="outlined"
          fullWidth
        />
      </Grid>
    </Grid>
    
  );
  
};




export default MusteriBilgiSorgulama;
