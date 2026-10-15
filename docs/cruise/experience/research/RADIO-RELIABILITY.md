# Radio reliability and rights boundaries

This pass reuses the Human Radio audit instead of inventing new streams or repeating broad research. Exact URLs, official station identities and endpoint observations are retained in `../../human-radio/STATIONS.md`; metadata providers and recognition evaluation are in `../../human-radio/METADATA.md`. The observations are dated evidence, not an uptime guarantee.

Fresh moving-browser Phase1/2 tests on October15 verified Jolt audio advancing and NTS selection plus continued audio after scenery removal. Endpoint availability alone does not prove embedding permission or audio fidelity. A listener can always change stations or visit the attributed station website.

| Destination | Current implementation boundary |
| --- | --- |
| Jolt, NTS1/2, Rinse France, The Lot, dublab | Existing direct source adapters; catalog eligibility is technical, not a legal clearance |
| Kiosk | Existing official HLS returned404 in prior audit; external station link retained |
| Buena Onda owned playlist | Existing upstream failure remains; explicit manual choice retained, excluded from Surprise/seek |
| WDNA, Depa, FG, Sucker Free and investigated candidates | External destinations or unresolved identity/rights; no fabricated playback endpoint |

Only official Jolt/NTS/dublab metadata adapters exist. Combined station/program titles remain shows; they are never parsed speculatively into artist/song pairs. Missing, stale, invalid, mismatched-source or failed responses display Track information unavailable. Show bookmarks remain distinct from verified tracks. Tests that use manufactured official-shaped metadata are clearly labeled FIXTURE and demonstrate UI/persistence, not identification accuracy.

Recognition: no provider token, trial, paid request, continuous recording or audio submission added. Previously researched AudD trial/pricing must be reconfirmed before activation; no recurring free service is assumed. Station permissions, catalog ownership documentation and provider terms require review before broad launch. No Cruise advertising interrupts broadcast audio.

Incremental paid services activated: none. Direct128kbit/s audio is approximately57.6MB/listener-hour at the provider; Cruise does not proxy or record it. Metadata polling at20seconds is approximately180requests/listener-hour to the existing same-origin route before cache effects. These are arithmetic traffic estimates, not verified provider bills or a hosting quote. Existing Vercel/Supabase/storage plan charges and bandwidth limits remain unaudited. A production monthly dollar estimate needs real traffic, station bitrates, cache hit rates and the actual hosting plan.
