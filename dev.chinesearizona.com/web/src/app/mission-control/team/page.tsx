import type { Metadata } from "next";
import { fetchMutation, fetchQuery } from "convex/nextjs";

import { MissionControlApp } from "@/components/mission-control/MissionControlApp";
import { api } from "../../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Mission Control Team",
  description: "Recurring team structure and subagent roles for Mission Control.",
};

export default async function MissionControlTeamPage() {
  await fetchMutation(api.teamMembers.ensureSeedData, {});
  const initialTeamMembers = await fetchQuery(api.teamMembers.list, {});

  return <MissionControlApp tool="team" initialTeamMembers={initialTeamMembers} />;
}
