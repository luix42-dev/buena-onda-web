'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './screen-mirror-help.css'

type Platform = 'android' | 'ios' | 'mac' | 'desktop'
type Props = { open: boolean; onClose: () => void }

/** OS mirroring keeps the actual local drive and audio as the source. */
export default function ScreenMirrorHelp({ open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const headingId = useId(), descriptionId = useId()
  const [platform, setPlatform] = useState<Platform | ''>('')

  useEffect(() => {
    const ua = navigator.userAgent
    const ipad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setPlatform(/Android/i.test(ua) ? 'android' : /iPhone|iPod/.test(ua) || ipad ? 'ios'
      : /Mac/.test(navigator.platform) ? 'mac' : 'desktop')
  }, [])

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    // showModal supplies focus containment; close restores focus to the opener.
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open, platform])

  if (!platform) return null
  return createPortal(<dialog ref={dialog} className="screen-mirror-help" aria-labelledby={headingId}
    aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onClose() }}
    onClose={() => { if (open) onClose() }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }}>
    <header className="screen-mirror-header">
      <div><p className="screen-mirror-brand">BUENA ONDA / CRUISE</p><h2 id={headingId}>Mirror Cruise to your TV</h2></div>
      <button type="button" className="screen-mirror-close" autoFocus onClick={onClose} aria-label="Close mirroring help">×</button>
    </header>
    <p id={descriptionId} className="screen-mirror-intro">Your drive, music, and controls — on the big screen.</p>
    <label className="screen-mirror-platform">Your device
      <select value={platform} onChange={event => setPlatform(event.target.value as Platform)}>
        <option value="" disabled>Choose your device</option>
        <option value="android">Android / Pixel</option>
        <option value="ios">iPhone / iPad</option>
        <option value="mac">Mac / AirPlay</option>
        <option value="desktop">Computer / Chrome</option>
      </select>
    </label>
    <p className="screen-mirror-network">Connect this device and your TV to the same Wi-Fi.</p>

    {platform === 'android' && <section aria-label="Android screen mirroring">
      <a className="screen-mirror-open" href="intent:#Intent;action=android.settings.CAST_SETTINGS;package=com.android.settings;end">Open screen cast</a>
      <p className="screen-mirror-network">If settings don’t open, follow these steps:</p>
      <ol>
        <li>Swipe down to Quick Settings and tap <strong>Screen Cast</strong>. On Pixel, you can also open <strong>Settings → Connected devices → Connection preferences → Google Cast</strong>.</li>
        <li>Choose your TV and approve screen sharing.</li>
        <li>Return to Cruise and keep your phone awake. Turn it sideways for a wider view.</li>
      </ol>
      <details><summary>Use Google Home instead</summary>
        <p>Open Google Home and select your TV. Choose <strong>Cast my screen</strong> or <strong>Cast screen</strong>, then confirm. Return to Cruise.</p>
        <a href="https://support.google.com/chromecast/answer/6059461?hl=en" target="_blank" rel="noreferrer">Google Home instructions ↗</a>
      </details>
      <p className="screen-mirror-stop">Stop sharing from Screen Cast or Google Home.</p>
      <a className="screen-mirror-link" href="https://support.google.com/pixelphone/answer/2865484?hl=en" target="_blank" rel="noreferrer">Pixel screen-mirroring help ↗</a>
    </section>}

    {platform === 'ios' && <section aria-label="iPhone and iPad screen mirroring">
      <ol>
        <li>Open <strong>Control Center → Screen Mirroring</strong>.</li>
        <li>Choose an Apple TV or AirPlay-compatible TV. Enter its code if asked.</li>
        <li>Return to Cruise and keep your screen awake. Turn your device sideways for a wider view.</li>
      </ol>
      <p className="screen-mirror-stop">To finish, return to Screen Mirroring and choose Stop Mirroring.</p>
      <a className="screen-mirror-link" href="https://support.apple.com/en-us/102661" target="_blank" rel="noreferrer">Apple screen-mirroring help ↗</a>
    </section>}

    {platform === 'mac' && <section aria-label="Mac screen mirroring">
      <ol>
        <li>Open <strong>Control Center → Screen Mirroring</strong> in your Mac’s menu bar.</li>
        <li>Choose an Apple TV or AirPlay-compatible TV, then choose to <strong>mirror</strong> your display.</li>
        <li>Return to Cruise and keep playing on your Mac.</li>
      </ol>
      <p className="screen-mirror-stop">Stop sharing from Screen Mirroring. For a Google Cast TV, select Computer / Chrome above.</p>
      <a className="screen-mirror-link" href="https://support.apple.com/guide/mac-help/stream-content-to-apple-tv-mh40624/mac" target="_blank" rel="noreferrer">Mac screen-mirroring help ↗</a>
    </section>}

    {platform === 'desktop' && <section aria-label="Chrome tab mirroring">
      <ol>
        <li>In Chrome, open <strong>⋮ → Cast, save and share → Cast</strong>.</li>
        <li>Under <strong>Sources</strong>, select <strong>Cast tab</strong>, then choose your TV. Enable tab audio if offered.</li>
        <li>Keep this Cruise tab open and control your drive here.</li>
      </ol>
      <p className="screen-mirror-stop">To finish, open Chrome’s Cast menu and stop casting.</p>
      <a className="screen-mirror-link" href="https://support.google.com/chrome/answer/3228332" target="_blank" rel="noreferrer">Chrome tab-casting help ↗</a>
    </section>}

    <p className="screen-mirror-system">{platform === 'android'
      ? 'Choose your TV and approve screen sharing in Android, then return to Cruise.'
      : 'Start screen sharing from your device’s controls, then return to Cruise.'}</p>
    <button type="button" className="screen-mirror-return" onClick={onClose}>Back to my drive</button>
  </dialog>, document.body)
}
