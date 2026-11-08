# Independent TV playback

The Cruise Cast button now uses the registered Google Cast receiver's own Cruise
scene and radio player. The phone or laptop sends controls instead of capturing
and streaming its canvas. The TV uses its widescreen layout and low graphics
quality independently of the sender's screen orientation or visibility.

`useCastSource` supplies the current station, requested playback, volume, mute,
world, car, time, mood and camera to the existing acknowledged Cast handoff.
Playlist position is sampled after choosing the TV. The receiver confirms scene
readiness and actual playback while muted; only then does the sender stop its
local radio and restore the TV volume. Camera/world changes and audio controls
continue through the existing command channel.

Unmounting the source or Cast button only unregisters state/listeners. It never
ends the receiver session. Explicit Stop Cast retains its existing shutdown and
local playback restoration behavior. The receiver's sender-disconnected handler
only cleans up obsolete mirroring sessions; it does not pause the independent
player. CAF idle shutdown remains disabled because the custom scene owns playback
outside CAF's media element. See Google's [receiver options](https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.CastReceiverOptions).

The receiver retains compatibility with older mirror clients and can accept a
complete independent handoff after entering mirror mode. An already-open receiver
from before this release must be stopped and relaunched once to load new code.

Validation:

- Full automated suite: 297 tests pass, including sender detach/rejoin without STOP.
- Source TypeScript: 570 files, zero errors.
- Chrome desktop sender (960x600) and Pixel viewport emulation (412x892, DPR 2)
  both hand off to a separate 1280x720 TV browser, operate station/camera controls,
  create zero sender WebRTC peers, and leave the TV driving/playing after sender
  context closure plus a CAF sender-disconnected event. During 20 seconds without
  senders, the TV audio clock advanced from 5.07 to 26.54 seconds (desktop) and
  5.10 to 26.55 seconds (mobile). Distance advanced from 30.5 to 347.6 and from
  32.0 to 354.5 respectively. Mobile launch used Veridian before tuning Darksynth.
  TV browser quality low, DPR 0.75; end FPS 36.8/32.9 on the host computer.
- Browser and hardware evidence is recorded in the workspace's
  `.tmp/cast-check-20261107/` and `docs/cruise/live-cast-20261107/` directories.
- Physical La Sala testing initially refused to interrupt an active Cruise session.
  Desktop/mobile browser emulation must not be described as a physical Pixel test.
