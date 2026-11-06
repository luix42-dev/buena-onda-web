import assert from 'node:assert/strict'
import test from 'node:test'
import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import Navigation from '../components/layout/Navigation'

test('navigation first render remains identical when server and browser pathnames differ', context => {
  // The node/tsx harness uses classic JSX; Next uses the automatic JSX runtime.
  const reactGlobal = Object.getOwnPropertyDescriptor(globalThis, 'React')
  Object.assign(globalThis, { React })
  context.after(() => {
    if (reactGlobal) Object.defineProperty(globalThis, 'React', reactGlobal)
    else Reflect.deleteProperty(globalThis, 'React')
  })
  const render = (pathname: string) => renderToStaticMarkup(
    createElement(PathnameContext.Provider, { value: pathname }, createElement(Navigation)),
  )

  const home = render('/')
  assert.equal(render('/index'), home)
  assert.equal(render('/culture'), home)
  assert.match(home, /aria-label="Main navigation"/)
  assert.match(home, /href="\/culture"/)
})
