import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { newcomerGuides } from '@/data/guides';
import { getBusinessCategories, getGuideBySlug, getGuides } from '@/lib/content';
import type { Guide, LocalizedText } from '@/lib/types';

function guideTexts(guide: Guide): LocalizedText[] {
  return [
    guide.title,
    guide.excerpt,
    ...guide.body,
    ...(guide.quickChecklist ?? []),
    ...(guide.practicalNotes ?? []),
    ...(guide.detailSections ?? []).flatMap((section) => [
      section.title,
      ...(section.intro ? [section.intro] : []),
      ...section.bullets,
    ]),
    ...guide.officialResources.map((resource) => resource.label),
    ...(guide.directoryPrompt ? [guide.directoryPrompt.note] : []),
  ];
}

describe('newcomer guides', () => {
  it('are listed with the other relocation guides and resolve by slug', () => {
    const slugs = getGuides().map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const guide of newcomerGuides) {
      expect(slugs).toContain(guide.slug);
      expect(getGuideBySlug(guide.slug)).toBe(guide);
    }
  });

  it('have English and Traditional Chinese text for every field', () => {
    for (const guide of newcomerGuides) {
      for (const text of guideTexts(guide)) {
        expect(text.en.trim(), guide.slug).not.toBe('');
        expect(text.zh?.trim(), `${guide.slug}: ${text.en}`).toBeTruthy();
      }
    }
  });

  it('link to official https sources and to existing directory categories', () => {
    const categorySlugs = new Set(getBusinessCategories().map((category) => category.slug));

    for (const guide of newcomerGuides) {
      expect(guide.officialResources.length, guide.slug).toBeGreaterThan(0);
      for (const resource of guide.officialResources) {
        expect(resource.url, guide.slug).toMatch(/^https:\/\//);
        expect(resource.source.trim(), guide.slug).not.toBe('');
      }

      expect(guide.directoryPrompt, guide.slug).toBeDefined();
      for (const categorySlug of guide.directoryPrompt?.categorySlugs ?? []) {
        expect(categorySlugs.has(categorySlug), `${guide.slug}: ${categorySlug}`).toBe(true);
      }
    }
  });

  it('only link businesses that are already listed in the directory', () => {
    const listed = new Set(
      (JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'src/data/generated-directory-businesses.json'), 'utf8')
      ) as Array<{ slug: string }>).map((business) => business.slug)
    );

    for (const guide of newcomerGuides) {
      for (const slug of guide.relatedBusinessSlugs) {
        expect(listed.has(slug), `${guide.slug}: ${slug}`).toBe(true);
      }
    }
  });
});
