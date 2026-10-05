# 0003 — Simulated flight market and the price-insight engine

Status: accepted · Date: 2026-10-05

Context: no real flight/pricing provider is connected, but the product's differentiator is advice on when to
buy. Advice needs price history.

Decision:

- Flights are not stored. A flight id encodes route, date, airline, slot and cabin
  (`THRMHD20261020IR03E`); a deterministic seeded simulation rebuilds schedule, fare and 60-day price history
  from it. The same id always yields the same flight, so links and bookings stay valid without a flights table.
- `FLIGHT_PROVIDER` selects the provider; the simulation sits behind the same interface a real provider would
  implement. Payments follow the same pattern (`PAYMENT_PROVIDER`, simulated gateway with an outcome switch
  that the web only shows when the API reports `simulated`).
- `analyzePrice` (pure, in `packages/contracts`) turns history + days to departure + seats left into a verdict,
  a 7-day expectation, BUY_NOW/WAIT, confidence and human-readable reasons. `cheaperThanPercent` is the share
  of observed days on which the flight was MORE expensive than today. Ties count half.
- The UI always labels the analysis an estimate, shows confidence, and never promises a future price.

Consequences: demo data is plausible but fictional; every surface says so. Replacing the provider changes data
sources, not UI or contracts. Fares tuned for realism (peak dates, last-14-day pressure) are covered by
`price-insight.test.ts` and `simulation.spec.ts`.
