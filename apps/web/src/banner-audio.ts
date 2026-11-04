// Client-side IndexedDB audio storage and 20s downsampling compressor.
// Zero backend storage consumption; bounded to 20 seconds at 22.05 kHz mono.

const DB_NAME = 'stxic_realm_anthems'
const STORE_NAME = 'custom_anthems'
const DB_VERSION = 1

function openAnthemDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'))
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export type CompressedAudioData = {
  sampleRate: number
  channels: number
  duration: number
  samples: Float32Array
}

export async function storeCustomAnthem(
  file: File,
  userId: string,
  maxDurationSeconds = 20
): Promise<{ duration: number; sizeBytes: number }> {
  const arrayBuffer = await file.arrayBuffer()
  const tempCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
    sampleRate: 22050,
  })

  try {
    const decoded = await tempCtx.decodeAudioData(arrayBuffer)
    const targetDuration = Math.min(decoded.duration, maxDurationSeconds)
    const targetSampleRate = 22050
    const targetLength = Math.floor(targetDuration * targetSampleRate)

    // Downmix to mono into targetLength
    const monoSamples = new Float32Array(targetLength)
    const numChannels = decoded.numberOfChannels

    for (let c = 0; c < numChannels; c++) {
      const channelData = decoded.getChannelData(c)
      const ratio = 1 / numChannels
      for (let i = 0; i < targetLength; i++) {
        monoSamples[i] += (channelData[i] || 0) * ratio
      }
    }

    // Apply quick 50ms fade-out at the end to prevent click on loop
    const fadeSamples = Math.min(Math.floor(targetSampleRate * 0.05), targetLength)
    for (let i = 0; i < fadeSamples; i++) {
      const factor = (fadeSamples - i) / fadeSamples
      monoSamples[targetLength - 1 - i] *= factor
    }

    const payload: CompressedAudioData = {
      sampleRate: targetSampleRate,
      channels: 1,
      duration: targetDuration,
      samples: monoSamples,
    }

    const db = await openAnthemDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const putReq = store.put(payload, userId)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    })

    return {
      duration: targetDuration,
      sizeBytes: monoSamples.byteLength,
    }
  } finally {
    void tempCtx.close().catch(() => {})
  }
}

export async function getCustomAnthemBuffer(userId: string, targetCtx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const db = await openAnthemDB()
    const data = await new Promise<CompressedAudioData | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(userId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })

    if (!data || !data.samples) return null

    // Create an AudioBuffer matching the audio context
    const buffer = targetCtx.createBuffer(1, data.samples.length, data.sampleRate)
    buffer.getChannelData(0).set(data.samples)
    return buffer
  } catch {
    return null
  }
}

export async function deleteCustomAnthem(userId: string): Promise<void> {
  try {
    const db = await openAnthemDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(userId)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Ignore cleanup error
  }
}
