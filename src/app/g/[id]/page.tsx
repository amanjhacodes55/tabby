import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GroupApp } from "@/components/group/GroupApp";
import { getDb, loadGroup } from "@/lib/db";
import { GROUP_ID_RE } from "@/lib/ids";

type Props = { params: Promise<{ id: string }> };

// Deduplicated per request so metadata and the page share one D1 round trip.
const getGroup = cache((id: string) => (GROUP_ID_RE.test(id) ? loadGroup(getDb(), id) : Promise.resolve(null)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const g = await getGroup(id);
  if (!g) return { title: "Group not found" };
  const description = `Join “${g.name}” on Tabby to see who owes what and settle up with UPI. No signup needed.`;
  return {
    title: g.name,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: `${g.name} · Tabby`, description },
    twitter: { title: `${g.name} · Tabby`, description },
  };
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) notFound();
  return <GroupApp initial={group} />;
}
