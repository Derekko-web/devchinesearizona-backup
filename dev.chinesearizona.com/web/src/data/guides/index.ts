import type { Guide } from '@/lib/types';

import { arrivingForTsmcGuide } from './arriving-for-tsmc';
import { chineseClassesForKidsGuide } from './chinese-classes-for-kids';
import { chineseSpeakingDoctorDentistGuide } from './chinese-speaking-doctor-dentist';
import { firstArizonaSummerGuide } from './first-arizona-summer-home';
import { firstHomeMetroPhoenixGuide } from './first-home-metro-phoenix';
import { healthInsuranceArizonaGuide } from './health-insurance-arizona';
import { immigrationLegalHelpGuide } from './immigration-legal-help-arizona';
import { lunarNewYear2027Guide } from './lunar-new-year-2027';
import { rentingArizonaGuide } from './renting-arizona-tenant-rights';
import { startBusinessArizonaGuide } from './start-business-arizona';
import { taxesNewImmigrantsGuide } from './taxes-new-immigrants';
import { willsEstateArizonaGuide } from './wills-estate-arizona';

// Evergreen newcomer guides, one file per guide. Each fact links to an official
// source in the guide's officialResources.
export const newcomerGuides: Guide[] = [
  taxesNewImmigrantsGuide,
  startBusinessArizonaGuide,
  healthInsuranceArizonaGuide,
  firstHomeMetroPhoenixGuide,
  rentingArizonaGuide,
  firstArizonaSummerGuide,
  immigrationLegalHelpGuide,
  willsEstateArizonaGuide,
  chineseSpeakingDoctorDentistGuide,
  chineseClassesForKidsGuide,
  arrivingForTsmcGuide,
];

// Dated, time-bound pages (events, seasons). Kept apart from the evergreen
// newcomer guides; recheck or retire them after their date passes.
export const seasonalGuides: Guide[] = [lunarNewYear2027Guide];
