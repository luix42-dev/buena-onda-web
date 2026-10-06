# Cruise production release — 2026-10-06

Authorized by the user: “publish it now.”

Release base: current website main `10f3a76`. Cruise runtime comes from the verified isolated milestone `bef50d2`; the original project and the unrelated dirty WSL checkout were preserved. Existing root layout, analytics, checkout, radio API and `/drive` landing page remain intact. The site frame excludes navigation/footer/background player only on `/cruise`.

Cruise: Island Trail, Coastal Coupe, Classic Coupe; day/night; exterior, driver and radio-focus cameras; four continuous districts; shared radio controls and walkthrough; Records, Branches and Tideway place cards, directory, stable links and configurable advertising.

Rendering dependencies are pinned to Three 0.170.0, Fiber 8.18.0 and Drei 9.122.0. Source asset licenses and in-app credits are retained. Unused historical cinematic/vehicle experiments are excluded from this release; the existing bounded MiniMax comparison is retained. No generation or streaming purchase was made.

Predeployment checks: 18 Cruise contract tests and 27 existing website checkout/shipping/authentication tests pass. Prior visual, performance and 10-minute validation belongs to `JEEP-HANDOFF.md`, not a new production performance measurement. Physical mobile performance remains unverified; geometry is stylized and production analytics ingestion is not established by local diagnostic events.

Target: existing Vercel project `buena-onda-web`, domain https://buenaondalifestyle.com/cruise. Deployment uses existing production environment settings. Browser smoke evidence is recorded locally under `.vercel/live-proof/`; test analytics requests are blocked to avoid treating verification as audience traffic.
