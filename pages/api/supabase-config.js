export default function handler(_req, res) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("YOUR_") || anonKey.includes("YOUR_")) {
    res.status(500).json({ error: "Supabase env variables are missing." });
    return;
  }

  if (anonKey.startsWith("sb_secret_")) {
    res.status(500).json({ error: "SUPABASE_ANON_KEY is invalid. Do not use service role keys." });
    return;
  }

  res.status(200).json({ url, anonKey });
}
