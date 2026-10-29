import { useCallback, useEffect, useRef, useState } from 'react'
import { rpc, errorText } from '../account-repository'
import { client } from '../data'
import { parseHall, type HallLayout } from './hall-layout'
export { safeProjectUrl } from './project-links.ts'

export type ProjectLink = { title: string; url: string }
export type HomeSocialState = { posting: 'friends' | 'closed'; links: ProjectLink[]; revision: number; can_post: boolean; can_moderate: boolean; entries: { id: string; author_id: string; display_name: string; body: string; created_at: string }[] }
export type Announcement = { id: string; author_id: string | null; body: string; revision: number; created_at: string; updated_at: string }
export type SharedHallState = { space_id: string; name: string; enabled: boolean; layout: HallLayout | null; portals: (string | null)[]; portal_names: (string | null)[]; revision: number; owner: boolean; can_edit: boolean; can_announce: boolean; decorators: string[]; announcements: Announcement[] }
export async function getSharedHall(space: string) {
 const state = await rpc<SharedHallState>(client!, 'get_server_hall', { p_space: space })
 if (state.layout) {
  const layout = parseHall(JSON.stringify(state.layout))
  if (!layout) throw new Error('This shared hall uses an unsupported layout. Return to chat or ask its owner to review it.')
  state.layout = layout
 }
 return state
}
// Polls are authoritative; focus/online reconciliation works without relying on Realtime delivery.
// Any denied/failed read clears visible protected content. Request ordering prevents late stale reads.
export function useSocialSnapshot<T>(load: () => Promise<T>) {
 const [data, setData] = useState<T | null>(null), [error, setError] = useState('')
 const serial = useRef(0), alive = useRef(false)
 const apply = useCallback((next: T) => { serial.current++; setData(next); setError('') }, [])
 const refresh = useCallback(async () => {
  const ticket = ++serial.current
  try { const next = await load(); if (alive.current && ticket === serial.current) { setData(next); setError('') }; return next }
  catch (e) { if (alive.current && ticket === serial.current) { setData(null); setError(errorText(e)) }; throw e }
 }, [load])
 useEffect(() => {
  alive.current = true
  const resume = () => { if (!document.hidden) void refresh().catch(() => {}) }
  resume(); const timer = setInterval(resume, 10000)
  window.addEventListener('online', resume); window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume)
  return () => { alive.current = false; serial.current++; clearInterval(timer); window.removeEventListener('online', resume); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume) }
 }, [refresh])
 return { data, error, refresh, apply }
}
