# 0007 — Route network realism: regional gateways, pilgrim/Russian routes, charter-only routes, aircraft by sector

Status: accepted · Date: 2026-10-07

Context: an aviation review of the simulated network found regional airports that fly abroad in reality
(Rasht, Urmia, Yazd, Kerman, Qeshm) missing, no Hajj/Umrah or Russian destinations, a few doubtful pairs
(Kish–Doha, Tabriz–Tbilisi), wide-bodies on 200 km hops, and too many daily frequencies on secondary spokes.

Decision:

- `INTL_DESTINATIONS` in `routes.ts` stays the single source of the network; an airport's `international`
  flag is true exactly when it has an entry there (`reference.test.ts` enforces it). New airports: Jeddah,
  Medina, Moscow (SVO), St Petersburg (LED). Product rules are unchanged: Imam Khomeini is international-only,
  Mehrabad flies abroad only to Najaf, Baghdad and Sabiha, every international route has one Iranian end.
- Routes can be `charterOnly` (seasonal or pilgrim programmes). Every Saudi route, Tabriz–Tbilisi and
  Tehran–St Petersburg are charter-only, so their flights are sold as `CHARTER`. Kish–Doha and Bandar
  Abbas–Doha, which are not regular scheduled services, are not in the network.
- International frequency is the foreign airport's weight times a per-Iranian-airport share (Imam Khomeini
  keeps 1.0, secondary airports 0.15–0.35), so secondary spokes fly one to three flights a day.
- Aircraft carry a sector window (`minSectorKm`/`maxSectorKm`). Wide-bodies start at 1,500 km (777 at
  2,000 km); an airline with no fitting type does not fly the route. Foreign carriers can list `gateways`, the
  Iranian airports they actually serve; Emirates was removed because its wide-body-only fleet fits no sector
  of the network (flydubai, Qatar and Etihad narrow-bodies serve those routes).

Consequences: reality gaps that remain are listed in the review notes, not hidden by invented routes; a route
the reviewer was unsure about is either charter-only or left out. Covered by `reference.test.ts` and
`simulation.spec.ts`.
