import type { Metadata } from "next";
import { fetchMutation, fetchQuery } from "convex/nextjs";

import { MissionControlApp } from "@/components/mission-control/MissionControlApp";
import { api } from "../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Realtime task operations workspace for Mission Control.",
};

export default async function MissionControlPage() {
  await fetchMutation(api.tasks.ensureSeedData, {});
  const initialTasks = await fetchQuery(api.tasks.list, {});

  return <MissionControlApp tool="tasks" initialTasks={initialTasks} />;
}
