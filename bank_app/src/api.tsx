export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const doFetch = (headers?: Headers) =>
    fetch(input, {
      credentials: "include",
      ...init,
      ...(headers ? { headers } : {}),
    });

  let res = await doFetch(init.headers as Headers);
  if (res.status !== 401) return res;

  // 401 → refresh dene
  const ref = await fetch("http://localhost:3001/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  const refData = await ref.json().catch(() => ({}));
  if (!ref.ok || !refData?.success) return res;

  if (refData.token) localStorage.setItem("auth_token", refData.token);

  const headers = new Headers(init.headers || {});
  const t = localStorage.getItem("auth_token");
  if (t) headers.set("Authorization", `Bearer ${t}`);

  res = await doFetch(headers);
  return res;
}
