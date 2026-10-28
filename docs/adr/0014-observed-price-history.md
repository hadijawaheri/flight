# 0014 — Keep the fares the site sees, and let them drive the price history

Status: accepted · Date: 2026-10-28 · Builds on ADR 0003

Context: the BUY_NOW / WAIT analysis reads a flight's past fares from `FlightProvider.priceHistory`. The simulated
market rebuilds that history from a model; a real supplier usually returns only today's fare, so after the switch
(task P7) the analysis would have nothing to learn from unless the site keeps its own record.

Decision:

- `PriceHistoryService` (`modules/price-history`) upserts one `price_observations` row per flight, price source and
  Tehran day: the day's closing adult base fare, its min and max, seats left when known, the sample count, and the
  route, cabin, departure date and days-to-departure so a route can be studied after its flights have gone.
- Samples come from every open flight a search returns (not only the filtered ones), the flight page, and the
  price-alert sweep, which revisits watched routes every 15 minutes. The same fare for the same flight and day is
  not rewritten within 30 minutes (in-memory), and a failed write is logged and never fails the request.
- `mergeHistory` overlays the observed days on the provider's history (an observed day wins, days only the site saw
  are added, the window stays today plus `HISTORY_DAYS` before). Search, flight page, analysis, deals and the
  assistant all use the merged history; search reads observations for all results in one query.
- Each row carries `source` (`simulation` or `observed`, from `FlightProvider.dataSource`), and only rows from the
  current source are read, so simulated fares never leak into real advice after the switch.
- Rows expire 400 days after their last sighting (TTL index), enough to compare a season with last year's.
  `PRICE_HISTORY_ENABLED=false` turns recording and reading off.

Consequences: with the simulation the stored fares equal the model, so advice does not change today; the value
starts when a real provider is connected. Route-level learning (typical fare by days to departure, seasonality)
can be built on the stored rows later without a migration. The collection grows by roughly one row per flight
and day that anyone looks at.
