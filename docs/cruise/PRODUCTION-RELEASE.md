# Cruise production release — 2026-10-06

Authorized by the user: “publish it now.”

Release base: current website main `10f3a76`. Cruise runtime comes from the verified isolated milestone `bef50d2`; the original project and the unrelated dirty WSL checkout were preserved. Existing analytics, checkout, radio API and `/drive` landing page remain intact. The site frame excludes navigation/footer/background player only on `/cruise`. The existing six root-layout font families are self-hosted with OFL licenses and source URLs after Google's response broke the old Next font loader. ArchiveLabel's permitted tags are narrowed to resolve the Three JSX type conflict.

Cruise: Island Trail, Coastal Coupe, Classic Coupe; day/night; exterior, driver and radio-focus cameras; four continuous districts; shared radio controls and walkthrough; Records, Branches and Tideway place cards, directory, stable links and configurable advertising.

Rendering dependencies are pinned to Three 0.170.0, Fiber 8.18.0 and Drei 9.122.0. Source asset licenses and in-app credits are retained. Unused historical cinematic/vehicle experiments are excluded from this release; the existing bounded MiniMax comparison is retained. No generation or streaming purchase was made.

Predeployment checks: 18 Cruise contract tests and 27 existing website checkout/shipping/authentication tests pass. Prior visual, performance and 10-minute validation belongs to `JEEP-HANDOFF.md`, not a new production performance measurement. Physical mobile performance remains unverified; geometry is stylized and production analytics ingestion is not established by local diagnostic events.

Target: existing Vercel project `buena-onda-web`, domain https://buenaondalifestyle.com/cruise. Deployment uses existing production environment settings. Browser smoke evidence is recorded locally under `.vercel/live-proof/`; test analytics requests are blocked to avoid treating verification as audience traffic.

## Published and verified

- Runtime commit: `5b1ddfe`, pushed to production main on 2026-10-06.
- Ready deployment: `dpl_BuC5nXAq1ePWBvgzD5wjFvcPY4ct`, promoted to the public domain.
- Public URL: https://buenaondalifestyle.com/cruise.
- User-approved copy: “BETA — STILL FINDING OUR GROOVE.” and “Support Buena Onda,” linking deliberately to `/themes` in a new tab. No donation account, sticker, or payment product was created.
- Vercel production build and integrated typecheck passed. A local full build compiled and typechecked but could not prerender catalog pages without production Supabase variables; the successful Vercel build used the existing production configuration.
- Live Edge browser verification passed at 1280×800: all three vehicles, camera changes, night, house audio, Jolt playback, volume, radio focus, directory, Branches card/deep link and distinct card-open diagnostic event. Zero browser runtime errors and zero missing Cruise assets.
- Homepage, `/radio`, `/drive`, `/api/radio/tracks` returned HTTP 200. Beta and support link inspected at desktop and 390×844 mobile emulation. This is not physical-device or human usability testing.
- Desktop garage, radio, night, place and mobile screenshots plus machine-readable report are retained under `.vercel/live-proof/` in the isolated release checkout. Production analytics ingestion has not been claimed; verification blocks tracking requests.
- No additional video credits, native app, paid streaming service or hosting plan upgrade was used. Existing Vercel usage applies; dollar cost was not measured.
