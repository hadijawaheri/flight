# 0004 — Filter and sort search results in the browser; keep state in the URL

Status: accepted · Date: 2026-10-05

Context: the search API supports server-side filters, but its facets (airlines, counts, price range) are
computed from the filtered set, so options vanish as soon as one is chosen.

Decision: the results view fetches the full, unfiltered set once per leg and filters/sorts locally
(`features/flights/filter-offers.ts`, unit-tested). Filter state is in the URL via nuqs (`replace`, so history is
not polluted) and is therefore shareable and survives reload. The round-trip step (`out=<flightId>`) is part of
the URL and parsed on the server.

Consequences: instant filtering and stable facets; one result set per search is held in memory (tens of offers).
Server-side filter params remain in the API for other clients.
