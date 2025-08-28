export async function scheduleLogout(token: string) {
  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(atob(payload)) as { exp: number };
    const expMs = exp * 1000;

    const msLeft = Math.max(0, expMs - Date.now() - 1500);
    setTimeout(async () => {
      console.log("[scheduleLogout] trying refresh…");
      try {
        const res = await fetch("http://localhost:3001/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        console.log("[scheduleLogout] refresh result:", res.status, data);
        if (res.ok && data?.success && data?.token) {
          localStorage.setItem("auth_token", data.token);
          scheduleLogout(data.token);
          return;
        }
      } catch (e) {
        console.log("[scheduleLogout] refresh error:", e);
      }
      console.log("[scheduleLogout] refresh failed → logging out");
      localStorage.removeItem("auth_token");
      window.location.replace("/login");
    }, msLeft);
  } catch {
    localStorage.removeItem("auth_token");
    window.location.replace("/login");
  }
}