let configPromise;

export async function getSupabaseConfig() {
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    const response = await fetch("/api/supabase-config", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Supabase is not configured. Add values to .env.local.");
    }

    const payload = await response.json();
    if (!payload?.url || !payload?.anonKey) {
      throw new Error("Supabase configuration is invalid.");
    }

    return payload;
  })();

  return configPromise;
}
