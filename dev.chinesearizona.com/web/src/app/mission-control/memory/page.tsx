import type { Metadata } from "next";
import { fetchMutation, fetchQuery } from "convex/nextjs";

import { MissionControlApp } from "@/components/mission-control/MissionControlApp";
import { api } from "../../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Mission Control Memory",
  description: "Searchable memory documents and durable context for Mission Control.",
};

export default async function MissionControlMemoryPage() {
  await fetchMutation(api.memories.ensureSeedData, {});
  const initialMemories = await fetchQuery(api.memories.list, {});

  return <MissionControlApp tool="memory" initialMemories={initialMemories} />;
}
