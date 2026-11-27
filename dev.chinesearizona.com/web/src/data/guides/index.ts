import type { Guide } from '@/lib/types';

import { healthInsuranceArizonaGuide } from './health-insurance-arizona';
import { startBusinessArizonaGuide } from './start-business-arizona';
import { taxesNewImmigrantsGuide } from './taxes-new-immigrants';

// Evergreen newcomer guides, one file per guide. Each fact links to an official
// source in the guide's officialResources.
export const newcomerGuides: Guide[] = [
  taxesNewImmigrantsGuide,
  startBusinessArizonaGuide,
  healthInsuranceArizonaGuide,
];
