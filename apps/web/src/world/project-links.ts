// Keep this allowlist aligned with realm_private.valid_project_links. No requests are made to links.
export function safeProjectUrl(value: string): string | null {
 if (value.length > 2048 || !/^https:\/\/[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}(:443)?([/?#][^\s<>\\]*)?$/.test(value) || /[\x00-\x1f\x7f]/.test(value)) return null
 try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? value : null } catch { return null }
}
