export const REALM_ORBITAL_R_PATH = 'M10 51C42 21 86 7 123 13C147 17 155 31 147 45C141 55 127 62 106 67C126 72 141 82 149 99C127 83 108 77 83 75C103 68 121 57 121 44C121 30 104 25 84 26C56 26 32 36 10 51ZM11 61C29 49 45 43 64 40C44 52 36 63 43 72C51 84 79 84 105 77C80 92 49 98 27 92C9 87 3 75 11 61Z'

export function Brand({ compact = false }: { compact?: boolean }) {
 return <span className={compact ? 'realm-brand compact' : 'realm-brand'} aria-label="STXIC Realm"><svg aria-hidden="true" viewBox="0 0 160 110"><path fill="currentColor" d={REALM_ORBITAL_R_PATH}/></svg>{!compact && <span><small>STXIC</small><strong>Realm</strong></span>}</span>
}
