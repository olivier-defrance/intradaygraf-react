export const SUPA_URL = "https://supabase.olivdef.fr";
export const SUPA_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzIxNzYwMCwiZXhwIjo0OTE4ODkxMjAwLCJyb2xlIjoiYW5vbiJ9.UagouIBtD8p_dKm3pJX1J2wgaiDfq0vkNo6Cv6FdCbY";
export const TABLE = "DataIntradayGrafV4-3";

async function supaFetch(path) {
  const res = await fetch(SUPA_URL + path, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: "Bearer " + SUPA_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Supabase HTTP " + res.status + " - " + text);
  }
  return res.json();
}

export async function fetchCapitals() {
  const rows = await supaFetch(`/rest/v1/${TABLE}?select=Capital`);
  const set = new Set();
  rows.forEach(r => { if (r.Capital != null) set.add(r.Capital); });
  return Array.from(set).sort((a,b)=>a-b);
}

export async function fetchRows(capital, ddMax) {
  const path = `/rest/v1/${TABLE}?select=*&Capital=eq.${capital}&Drawdown=lte.${ddMax}`;
  return supaFetch(path);
}
