import {
  BriefcaseBusiness,
  Calendar,
  GraduationCap,
  HeartPulse,
  Home,
  Newspaper,
  PlaneTakeoff,
  Scale,
  Truck,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react';

import type { CategoryIcon as CategoryIconName } from '@/lib/types';

type CategoryIconProps = {
  icon: CategoryIconName;
  className?: string;
};

const iconMap = {
  briefcase: BriefcaseBusiness,
  calendar: Calendar,
  'graduation-cap': GraduationCap,
  heart: HeartPulse,
  home: Home,
  newspaper: Newspaper,
  plane: PlaneTakeoff,
  scale: Scale,
  truck: Truck,
  users: Users,
  utensils: Utensils,
  wrench: Wrench,
};

export function CategoryIcon({ icon, className }: CategoryIconProps) {
  const Icon = iconMap[icon];
  return <Icon className={className} />;
}
