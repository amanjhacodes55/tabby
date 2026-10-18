"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentGroups, type RecentGroup } from "@/lib/client";

export function RecentGroups() {
  const [groups, setGroups] = useState<RecentGroup[]>([]);
  useEffect(() => setGroups(getRecentGroups()), []);
  if (!groups.length) return null;
  return (
    <div className="mt-6 rounded-3xl border border-line bg-surface p-4">
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted">Your groups on this device</h2>
      <ul className="divide-y divide-line">
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/g/${g.id}`} className="flex items-center justify-between rounded-lg px-1 py-2.5 font-medium hover:text-brand">
              <span className="truncate">{g.name}</span>
              <span aria-hidden className="text-muted">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
