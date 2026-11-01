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

// Four genuine cat views, arranged as direction columns and state/frame rows.
const turns=[]
for(const [column,direction] of ['down','up','left','right'].entries()) {
 for(const [row,state] of STATES.entries()) for(let frame=0;frame<FRAMES;frame++) {
  for(const p of getPetPixels('cat',state,frame,direction)) turns.push(`<rect x="${column*32+p.x}" y="${(row*4+frame)*32+p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`)
 }
}
await writeFile(resolve(outDir,'cat-turns.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 640" width="128" height="640" shape-rendering="crispEdges">${turns.join('')}</svg>\n`,'utf8')
console.log('Generated 8 pet sheets and Village Cat directional sheet in public/pets/')

const wyrmTurns=[]
for (const [column,direction] of ['down','up','left','right'].entries()) {
 for (const [row,state] of STATES.entries()) for (let frame=0;frame<FRAMES;frame++) {
  for (const p of getPetPixels('triarch',state,frame,direction)) wyrmTurns.push(`<rect x="${column*48+p.x}" y="${(row*4+frame)*36+p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`)
 }
}
await writeFile(resolve(outDir,'triarch-turns.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 720" width="192" height="720" shape-rendering="crispEdges">${wyrmTurns.join('')}</svg>\n`,'utf8')
console.log('Generated First Wyrm directional sheet')
