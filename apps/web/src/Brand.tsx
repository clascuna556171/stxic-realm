export function Brand({ compact = false }: { compact?: boolean }) {
 return <span className={compact ? 'realm-brand compact' : 'realm-brand'} aria-label="STXIC Realm"><svg aria-hidden="true" viewBox="0 0 160 110"><path fill="currentColor" d="M12 49C43 25 82 9 117 13C142 16 151 29 145 42C140 52 128 59 109 65C126 70 139 79 146 96C126 81 109 76 86 74C103 67 119 57 119 45C119 32 104 27 87 28C61 27 36 35 12 49ZM13 59C30 48 44 43 61 40C43 52 36 62 42 71C50 83 77 83 102 77C78 91 49 97 28 91C10 86 4 74 13 59Z"/></svg>{!compact && <span><small>STXIC</small><strong>Realm</strong></span>}</span>
}
