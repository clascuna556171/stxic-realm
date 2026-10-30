import { useState } from 'react'
import { WorkspaceNav } from './WorkspaceNav'
import { ServerHall } from './ServerHall'
import type { Space } from './space-repository'

const examples: Space[] = [
 { id: 'preview-grove', name: 'The Hearth', revision: 0, archived_at: null, closed_at: null },
 { id: 'preview-archive', name: 'Moonlit Archive', revision: 0, archived_at: null, closed_at: null },
 { id: 'preview-workshop', name: 'The Workshop', revision: 0, archived_at: null, closed_at: null },
]

export default function HallPreview() {
 const [selected, setSelected] = useState(examples[0].id)
 return <main className="workspace-page halls-page viewport-world"><WorkspaceNav current="spaces" /><header className="workspace-header"><div><span>Realm</span><span className="header-divider">/</span><strong>Server Halls</strong></div><a href="/">Sign in to Realm</a></header><div className="halls-content"><ServerHall spaces={examples} selected={selected} onSelect={setSelected} channels={['general', 'introductions', 'the-common-room'].map(name => ({ id: name, name, space_id: selected, archived_at: null, revision: 0 }))} loading={false} preview /></div></main>
}
