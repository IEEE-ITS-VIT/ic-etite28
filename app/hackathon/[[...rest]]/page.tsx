import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// hackathon now lives on its own website; the address is set in Admin → Site content → Website links.
export default async function Moved({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest = [] } = await params;
  const { links } = await getSettings();
  redirect(`${links.bolt}${rest.length ? `/${rest.map(encodeURIComponent).join("/")}` : ""}`);
}
