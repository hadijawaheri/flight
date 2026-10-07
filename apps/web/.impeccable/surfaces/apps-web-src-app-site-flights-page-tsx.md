---
version: 1
slug: "apps-web-src-app-site-flights-page-tsx"
primary_target: "apps/web/src/app/(site)/flights/page.tsx"
related_targets:
  [
    "apps/web/src/features/flights/components/flight-card.tsx",
    "apps/web/src/components/layout/site-header.tsx",
  ]
---

# Surface brief: inner app pages (flights results, flight detail, checkout, account, shell)

Mode: Operate. Job: extend the established landing world ("one approach, then a day" + Aero Stratosphere) into the working pages. No concept tournament.

## Direction contract

THESIS: The working site is the same sky the landing opened, seen from the cabin: a calm living sky band behind solid panels, and a flight offer is a boarding pass, not a generic card. Refuses the default of white rounded cards on a flat grey page with a plain sticky bar.

OWN-WORLD: Sky-tinted page ground (soft vertical sky wash, top band only), solid opaque panels with hairline ring and a small soft drop shadow, a floating rounded header bar detached from the top edge, tickets with side notches and a dashed perforation between the flight body and the price stub, route lines (dot - dashed rule - plane - dot) as the one recurring motif, Vazirmatn, tabular numerals, night-blue footer that continues the landing's dusk. Brand blue only for action and the active state.

STORY: The traveller reads a ticket at a glance (times, route, price), compares days on a fare strip, opens a ticket to see fare and rules, and proceeds. It feels like the same product as the landing, not a template.

FIRST VIEWPORT (results): floating header over a sky band; route banner (city to city with dotted route line and plane, date and party under it) on the band; fare strip; then filters aside + stacked boarding passes. The select action sits in each ticket's stub, at the inline-end.

FORM: Operate extension, boarding-pass card as the signature component; no concept dealt.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
