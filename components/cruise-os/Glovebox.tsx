'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import './glovebox.css'

export type GloveboxPage = 'home' | 'garage' | 'places' | 'settings' | 'postcards'
export type GloveboxProps = {
  page: GloveboxPage | null
  onPage: (page: GloveboxPage | null) => void
  onCollection: (tab: 'finds' | 'presets') => void
  children?: ReactNode
  listeningControls?: ReactNode
}
const titles: Record<GloveboxPage, string> = { home: 'Glovebox', garage: 'Garage', places: 'Places', settings: 'Settings', postcards: 'Postcards' }

/** Controlled native modal. The parent owns navigation, collections and playback. */
export default function Glovebox({ page, onPage, onCollection, children, listeningControls }: GloveboxProps) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null), previousPage = useRef<GloveboxPage | null>(null)
  const latest = useRef({ page, onPage }); latest.current = { page, onPage }
  const restoreFrame = useRef<number | null>(null), collectionTransition = useRef(false)
  const restoreFocus = useCallback(() => {
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current)
    // A collection dialog may open in the same commit. Never pull focus out of it.
    restoreFrame.current = requestAnimationFrame(() => {
      restoreFrame.current = null
      if (latest.current.page !== null || collectionTransition.current || document.querySelector('dialog[open]')) return
      if (opener.current?.isConnected && !opener.current.closest('[inert]')) opener.current.focus({ preventScroll: true })
    })
  }, [])
  useEffect(() => {
    const target = dialog.current
    if (!target) return
    if (page !== null) {
      if (!target.open) {
        if (restoreFrame.current !== null) { cancelAnimationFrame(restoreFrame.current); restoreFrame.current = null }
        collectionTransition.current = false
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        target.showModal()
      }
      if (page !== previousPage.current) {
        if (body.current) body.current.scrollTop = 0
        heading.current?.focus({ preventScroll: true })
      }
    } else if (target.open) {
      target.close()
      restoreFocus()
    }
    previousPage.current = page
  }, [page, restoreFocus]) // The root keeps the dialog mounted while changing controlled pages.
  useEffect(() => {
    const target = dialog.current
    return () => {
      if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current)
      if (target?.open) target.close()
    }
  }, [])
  const collection = (tab: 'finds' | 'presets') => {
    collectionTransition.current = true
    // onCollection must atomically close this controlled overlay and open the collection.
    onCollection(tab)
  }
  return <dialog ref={dialog} className="os-glovebox os-dialog" aria-labelledby="os-glovebox-title"
    onCancel={event => { event.preventDefault(); onPage(page === 'home' ? null : 'home') }}
    onClose={() => { if (latest.current.page !== null) latest.current.onPage(null) }}>
    <div className="os-glovebox-shell">
      <header className="os-glovebox-header">
        <div className="os-glovebox-heading"><p>BUENA ONDA / CRUISE</p><h2 ref={heading} tabIndex={-1} id="os-glovebox-title">{titles[page || 'home']}</h2>{page === 'home' && <span>Your finds, your ride, your way.</span>}</div>
        <div className="os-glovebox-header-actions">{page !== null && page !== 'home' && <button type="button" className="os-glovebox-back" aria-label="Back to Glovebox" onClick={() => onPage('home')}>Glovebox</button>}<button type="button" className="os-glovebox-close" aria-label="Close Glovebox" onClick={() => onPage(null)}>Close</button></div>
      </header>
      <div ref={body} className="os-glovebox-body">
        {page === 'home' ? <nav className="os-glovebox-nav" aria-label="Glovebox sections">
          <button type="button" aria-label="My Finds" onClick={() => collection('finds')}><span className="os-glovebox-number" aria-hidden="true">01</span><span><strong>My Finds</strong><small>Music discovered along the way.</small></span><span aria-hidden="true">↗</span></button>
          <button type="button" aria-label="Saved stations" onClick={() => collection('presets')}><span className="os-glovebox-number" aria-hidden="true">02</span><span><strong>Saved stations</strong><small>Your radio presets, in your order.</small></span><span aria-hidden="true">↗</span></button>
          <button type="button" aria-label="Postcards" onClick={() => onPage('postcards')}><span className="os-glovebox-number" aria-hidden="true">03</span><span><strong>Postcards</strong><small>Scenes from your own drive.</small></span><span aria-hidden="true">↗</span></button>
          <button type="button" aria-label="Places" onClick={() => onPage('places')}><span className="os-glovebox-number" aria-hidden="true">04</span><span><strong>Places</strong><small>A few stops worth slowing down for.</small></span><span aria-hidden="true">↗</span></button>
          <button type="button" aria-label="Garage" onClick={() => onPage('garage')}><span className="os-glovebox-number" aria-hidden="true">05</span><span><strong>Garage</strong><small>Change your ride. Keep your frequency.</small></span><span aria-hidden="true">↗</span></button>
          <button type="button" aria-label="Settings" onClick={() => onPage('settings')}><span className="os-glovebox-number" aria-hidden="true">06</span><span><strong>Settings</strong><small>Make the drive comfortable.</small></span><span aria-hidden="true">↗</span></button>
        </nav> : page !== null ? children : null}
      </div>
      {listeningControls && <footer className="os-glovebox-listening" aria-label="Listening controls">{listeningControls}</footer>}
    </div>
  </dialog>
}
