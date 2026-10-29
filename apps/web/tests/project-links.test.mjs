import test from 'node:test'
import assert from 'node:assert/strict'
import { safeProjectUrl } from '../src/world/project-links.ts'
test('project links accept external HTTPS addresses and reject active content, credentials and ambiguous URLs', () => {
 for (const url of ['https://example.com', 'https://project.example.org/readme?q=one#intro', 'https://example.com:443/']) assert.equal(safeProjectUrl(url), url)
 for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'http://example.com', '//example.com', 'https://user:pass@example.com', 'https://example.com@evil.com', 'https://example.com\\@evil.com', 'https://localhost', 'https://127.0.0.1', 'https://example.com:8080', 'https://example.com/\nsecret', 'https://example.com/<script>', 'https://example.com/' + 'x'.repeat(2048)]) assert.equal(safeProjectUrl(url), null, url)
})
