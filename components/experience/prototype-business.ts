export type DemoBusinessEvent = {
  label: 'DEMO / TEST'; type: 'opportunity' | 'activation'; campaignId: string
  placementId: string; surface: 'world' | 'directory'; atMs: number
}

/** Local test observations, never audience counts. No network, storage or listener data. */
export function createDemoBusinessRecorder(onEvent: (event: DemoBusinessEvent) => void) {
  const opportunities = new Set<string>()
  const activations = new Map<string, number>()
  return {
    opportunity(campaignId: string, placementId: string, qualified: boolean, atMs: number) {
      const key = `${campaignId}:${placementId}`
      if (!qualified) { opportunities.delete(key); return }
      if (opportunities.has(key) || !Number.isFinite(atMs)) return
      opportunities.add(key)
      onEvent({label:'DEMO / TEST',type:'opportunity',campaignId,placementId,surface:'world',atMs})
    },
    activate(campaignId: string, placementId: string, surface: 'world' | 'directory', atMs: number) {
      const key = `${surface}:${campaignId}:${placementId}`
      const previous = activations.get(key)
      if (!Number.isFinite(atMs) || (previous !== undefined && atMs - previous < 600)) return false
      activations.set(key,atMs)
      if (activations.size > 128) activations.delete(activations.keys().next().value!)
      onEvent({label:'DEMO / TEST',type:'activation',campaignId,placementId,surface,atMs})
      return true
    },
    resetOpportunities() { opportunities.clear() },
    retain(keys:ReadonlySet<string>) { for(const key of opportunities)if(!keys.has(key))opportunities.delete(key) },
  }
}
