# Cockpit-first entry correction

User feedback: the original entry was easier to understand; restore ride selection and contextual radio help, start inside the cockpit, and improve the Lamborghini road view.

Implementation (Cruise OS experiment only):
- Reuse RidePicker's vehicle catalog and actual GarageEnvironment/3D showcase. Five existing vehicles, optional Sunset/Night, one Start cruising action. Start remains available while scenery loads.
- Start sets driver camera immediately. The experience variant's delayed 12-second camera reveal is excluded from Cruise OS. Shared camera links also enter in the cockpit; users can change views afterward.
- Countach-only seat adjustment in lib/cruise-os/cockpit.ts, explicitly enabled by Cruise OS. Raise desktop eye from .79m to .90m and portrait .80m to .91m; move forward 13cm/18cm with a slightly downward gaze. The first higher-only candidate (.96/.98m) exposed too much roof and was rejected; its captures remain as evidence. Refined development captures show the road and retain the cabin. Radio focus and chase profiles retain their values. Visual acceptance requires actual rendered evidence, not coordinates alone.
- Contextual Tap the radio to tune in button opens the existing dashboard focus. It remains until opened or dismissed. Autodrive/camera guidance appears alongside it. Back to drive remains available.
- Preserve the prior short-window Play fix: no radio deck before starting, intrinsic-width map attribution, responsive entry and 44px minimum primary controls.

Preserved: public /cruise route, other experiment defaults, vehicles/assets, audio owner and stream switching, metadata/persistence, camera alternatives, advertisements and measurement gates. No services, subscriptions, assets, or deployment added.

Validation is recorded separately in QA.md by the independent review agent. Before evidence is in BEFORE.md. Browser emulation does not validate physical devices, real Chrome zoom, or human usability. Existing performance reports remain historical; this correction does not claim a new FPS result.

Checks before final browser validation: production candidate compiled and built successfully; 26 focused tests passed. Independent source reviewer /root/metadata found no critical regression. Actual QA agent /root/station_audit owns browser evidence; no unavailable model is claimed. No new sustained FPS benchmark.

Final production build: I9B7uUgJOo8_ygFiiap3Q, .next-cruise-os-cockpit-final-build, local port3081. Implementation commit: 2715376 (feature/cruise-os-20261015). Earlier compiled candidates remain preserved. No deployment.

Exact implementation files:
- components/cruise-os/CruiseOS.tsx
- components/cruise-os/cruise-os.css
- components/real-miami/jeep/JeepNight.tsx
- components/real-miami/jeep/RidePicker.tsx
- lib/cruise-os/cockpit.ts
- tests/cruise-os-cockpit.test.ts
- tsconfig.json (Next-generated dist type includes)

26 focused tests passed: cruise-os-cockpit, experience-atmosphere, cruise-os-input, cruise-os-frequency, experience-radio and human-radio-finds. The seven cockpit/atmosphere checks also passed after final seat refinement. Production build includes typechecking/lint; existing repository warnings remain (Next serverExternalPackages configuration, image optimization and hook dependencies). No new dependencies or recurring operating costs.

Local availability check after replacing the OS preview: /cruise/os on3081, preserved /cruise/experience on3077 and /cruise/human-radio on3074 all returned HTTP200. This is availability evidence, not a new functional regression test of the older versions.
