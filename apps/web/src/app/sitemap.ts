import type { MetadataRoute } from "next";

import { fetchRules } from "@/features/rules/api";
import { env } from "@/lib/env";
import { paths } from "@/lib/paths";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const fixed = [paths.home, paths.deals, paths.explore, paths.rules, paths.assistant].map(
    (path) => ({
      url: `${base}${path}`,
      changeFrequency: "daily" as const,
    }),
  );

  // The API may be down while the site is being built; static pages must still be listed.
  const rules = await fetchRules({})
    .then((index) =>
      index.entries.map((entry) => ({
        url: `${base}${paths.rule(entry.id)}`,
        lastModified: entry.reviewedAt,
        changeFrequency: "monthly" as const,
      })),
    )
    .catch(() => []);

  return [...fixed, ...rules];
}
