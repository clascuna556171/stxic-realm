type Name = 'home' | 'chat' | 'person' | 'studio' | 'arrow' | 'check' | 'back'
const paths: Record<Name, string> = {
 home: 'm3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9',
 chat: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z',
 person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
 studio: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z',
 arrow: 'M5 12h14m-6-6 6 6-6 6', check: 'm5 12 4 4L19 6', back: 'M19 12H5m6-6-6 6 6 6',
}
export function Icon({ name }: { name: Name }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg> }
