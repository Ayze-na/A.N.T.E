import { HomeClient } from "@/components/home-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الرئيسية",
};

async function fetchWhatsapp(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || url === "https://your-project.supabase.co") {
    return "201000000000";
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/settings?key=eq.store&select=value`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return "201000000000";
    const rows = (await res.json()) as { value?: { whatsapp_number?: string } }[];
    return rows?.[0]?.value?.whatsapp_number || "201000000000";
  } catch {
    return "201000000000";
  }
}

export default async function Home() {
  const whatsapp = await fetchWhatsapp();
  return <HomeClient initialWhatsapp={whatsapp} />;
}