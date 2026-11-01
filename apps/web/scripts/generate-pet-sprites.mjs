import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PET_SPECIES_CATALOG } from '../src/pets/pet-model.ts'
import { getPetPixels, getPetSpriteDimensions } from '../src/pets/pet-sprites.ts'

const STATES = ['idle', 'walk', 'sit', 'sleep', 'happy']
const FRAMES = 4
const outDir = resolve(import.meta.dirname, '../public/pets')

await mkdir(outDir, { recursive: true })

for (const species of PET_SPECIES_CATALOG) {
  const { width, height } = getPetSpriteDimensions(species.id)
  const sheetWidth = width * FRAMES
  const sheetHeight = height * STATES.length
  const rects = []

  STATES.forEach((state, row) => {
    for (let col = 0; col < FRAMES; col++) {
      const offsetX = col * width
      const offsetY = row * height
      const pixels = getPetPixels(species.id, state, col)
      for (const p of pixels) {
        rects.push(
          `<rect x="${offsetX + p.x}" y="${offsetY + p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`,
        )
      }
    }
  })

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetWidth} ${sheetHeight}" width="${sheetWidth}" height="${sheetHeight}" shape-rendering="crispEdges">${rects.join('')}</svg>\n`
  await writeFile(resolve(outDir, `${species.id}-sheet.svg`), svg, 'utf8')
}

console.log('Generated 8 pet sprite sheets in public/pets/')
