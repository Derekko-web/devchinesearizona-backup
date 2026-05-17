import type { Metadata } from "next";
import { fetchMutation, fetchQuery } from "convex/nextjs";

import { MissionControlApp } from "@/components/mission-control/MissionControlApp";
import { api } from "../../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Mission Control Calendar",
  description: "Scheduled tasks and cron job calendar for Mission Control.",
};

export default async function MissionControlCalendarPage() {
  await fetchMutation(api.scheduledItems.ensureSeedData, {});
  const initialScheduledItems = await fetchQuery(api.scheduledItems.list, {});

  return <MissionControlApp tool="calendar" initialScheduledItems={initialScheduledItems} />;
}
