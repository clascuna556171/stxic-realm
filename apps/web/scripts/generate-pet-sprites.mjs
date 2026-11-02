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

// All species: direction columns, then state/frame rows, at native resolution.
for (const species of PET_SPECIES_CATALOG) {
  const {width,height}=getPetSpriteDimensions(species.id), turns=[]
  for (const [column,direction] of ['down','up','left','right'].entries()) {
    for (const [row,state] of STATES.entries()) for(let frame=0;frame<FRAMES;frame++) {
      for (const p of getPetPixels(species.id,state,frame,direction)) turns.push(`<rect x="${column*width+p.x}" y="${(row*4+frame)*height+p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`)
    }
  }
  await writeFile(resolve(outDir,`${species.id}-turns.svg`),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width*4} ${height*20}" width="${width*4}" height="${height*20}" shape-rendering="crispEdges">${turns.join('')}</svg>\n`,'utf8')
}
console.log('Generated eight sheets and eight directional turn sheets in public/pets/')
