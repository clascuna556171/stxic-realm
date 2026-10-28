type Name = 'home' | 'chat' | 'person' | 'studio' | 'arrow' | 'check' | 'back' | 'sparkle' | 'shuffle'
const paths: Record<Name, string> = {
 home: 'm3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9',
 chat: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z',
 person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
 studio: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z',
 arrow: 'M5 12h14m-6-6 6 6-6 6', check: 'm5 12 4 4L19 6', back: 'M19 12H5m6-6-6 6 6 6',
 sparkle: 'm12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17Zm14-14 .7 1.8L21.5 5.5 19.7 6.2 19 8l-.7-1.8L16.5 5.5l1.8-.7L19 3Z',
 shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
}
export function Icon({ name }: { name: Name }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg> }
