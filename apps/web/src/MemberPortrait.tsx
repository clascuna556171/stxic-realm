import { AccountPortrait } from './AccountPortrait'
import type { PublicIdentity } from './account-repository'

export function MemberPortrait({ person }: { person?: PublicIdentity }) {
  return (
    <a
      className="member-portrait"
      href={person ? `/?profile=${person.id}` : undefined}
      aria-label={person ? `View ${person.display_name} profile` : 'Account unavailable'}
    >
      <AccountPortrait person={person} />
    </a>
  )
}
