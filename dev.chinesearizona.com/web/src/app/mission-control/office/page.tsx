import type { Metadata } from "next";
import { fetchMutation, fetchQuery } from "convex/nextjs";

import { MissionControlApp } from "@/components/mission-control/MissionControlApp";
import { api } from "../../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Mission Control Office",
  description: "Digital office view for the Mission Control agent team.",
};

export default async function MissionControlOfficePage() {
  await fetchMutation(api.teamMembers.ensureSeedData, {});
  await fetchMutation(api.officePresence.ensureSeedData, {});

  const [initialTeamMembers, initialOfficePresence] = await Promise.all([
    fetchQuery(api.teamMembers.list, {}),
    fetchQuery(api.officePresence.list, {}),
  ]);

  return (
    <MissionControlApp
      tool="office"
      initialTeamMembers={initialTeamMembers}
      initialOfficePresence={initialOfficePresence}
    />
  );
}
