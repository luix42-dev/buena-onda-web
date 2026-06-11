import PlayerClient from './PlayerClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

export default async function PlayerPage() {
  return <PlayerClient />
}
