import Phaser from 'phaser'
import { readAppearance, type Appearance } from '../appearance'
import type { Visitor } from '../account-repository'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels, seatedCharacterPixels, type Pixel } from '../character'
import { ROOM, type Direction, type Point, type RoomObject, type RoomAction } from './room'
import { facingFrom, samePoint } from './navigation'
import { furniturePixels, roomPixels, furnitureActionForeground } from './art'
import { roomLighting } from './lighting'
import { roomAmbientPixels, characterBlinkPixels } from './room-life'
import { furniturePose } from './furniture-pose'
import { activityOverlay } from './activity-overlay'
import type { WorldSnapshot, FocusState } from './activity-state'
import { petDisplayName, type EquippedPetSummary, type WildlifeEncounter } from '../pets/pet-model'
import { getPetPixels, getPetSpriteDimensions } from '../pets/pet-sprites'
import { findSafePetTile, stepPetBehavior, type PetBehaviorState } from './pet-actor'

const tile = 32
const animatedFurnitureIds = new Set(['desk', 'sofa', 'bed', 'coffee-table', 'lantern', 'floor-lamp', 'console', 'plant', 'bookshelf'])

export function createRoom(
 parent: HTMLElement,
 onInspect: (id: string) => void,
 getPosition: () => Point,
 getObjects: () => RoomObject[],
 options?: {
  activity?: () => WorldSnapshot
  localId?: string
  focus?: () => FocusState
  action?: () => RoomAction | null
  lights?: () => Record<string, boolean>
  appearance?: Appearance
  people?: () => Visitor[]
  pets?: () => EquippedPetSummary[]
  wildlife?: () => WildlifeEncounter | null
  onPetInteract?: (pet: EquippedPetSummary) => void
  onWildlifeClick?: (encounter: WildlifeEncounter) => void
  onWalk?: (point: Point) => void
  editor?: {
   enabled: () => boolean
   error: (id: string, x: number, y: number) => string | null
   place: (id: string, x: number, y: number) => void
   status: (message: string) => void
  }
 },
) {
 class RoomScene extends Phaser.Scene {
  constructor() {
   super('room')
  }
  create() {
   const appearance = options?.appearance ?? readAppearance()
   const colorCache = new Map<string, number>()
   const parseColor = (hex: string) => {
    let val = colorCache.get(hex)
    if (val === undefined) {
     val = parseInt(hex.slice(1), 16)
     colorCache.set(hex, val)
    }
    return val
   }

   const draw = (g: Phaser.GameObjects.Graphics, pixels: Pixel[]) => {
    for (const p of pixels) {
     g.fillStyle(parseColor(p.color))
     g.fillRect(p.x, p.y, p.w, p.h)
    }
   }

   let enabledLights: Record<string, boolean> = options?.lights?.() ?? {}

   // Pre-render 4 background frames into cached textures once at startup.
   // Eliminates 798 vector rectangles per frame, dropping CPU tessellation by 95%.
   for (let f = 0; f < 4; f++) {
    const key = `realm-room-bg-${appearance.mood}-${f}`
    if (!this.textures.exists(key)) {
     const canvas = this.textures.createCanvas(key, 512, 384)!
     const ctx = canvas.context
     for (const p of roomPixels(appearance.mood)) {
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.w, p.h)
     }
     const beamColor = appearance.mood === 'tech' ? 'rgba(155,231,242,' : 'rgba(255,228,160,'
     for (let s = 0; s < 4; s++) {
      ctx.fillStyle = `${beamColor}${0.075 - s * 0.014})`
      ctx.fillRect(194 + s * 4, 54 + s * 11, 44 - s * 2, 10)
      ctx.fillRect(248 + s * 4, 54 + s * 11, 44 - s * 2, 10)
     }
     for (const p of roomAmbientPixels(appearance.mood, [], f, enabledLights)) {
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.w, p.h)
     }
     canvas.refresh()
    }
   }
   const bgImage = this.add.image(0, 0, `realm-room-bg-${appearance.mood}-0`).setOrigin(0, 0).setDepth(0)

   let lighting: Phaser.GameObjects.Image[] = []
   const drawLighting = (objects: RoomObject[]) => {
    lighting.forEach(light => light.destroy())
    this.tweens.killTweensOf(lighting)
    lighting = roomLighting(appearance.mood, objects, enabledLights).map((light, i) => {
     const key = `realm-light-${light.color}`
     if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 128, 128)!
      const ctx = texture.context
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      gradient.addColorStop(0, light.color)
      gradient.addColorStop(0.4, `${light.color}88`)
      gradient.addColorStop(1, `${light.color}00`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 128, 128)
      texture.refresh()
     }
     const img = this.add.image(light.x, light.y, key).setDisplaySize(light.rx * 2, light.ry * 2).setAlpha(light.strength).setDepth(1)
     if (!motion.matches) {
      this.tweens.add({
       targets: img,
       alpha: { from: light.strength * 0.84, to: light.strength * 1.14 },
       duration: 2000 + i * 220,
       yoyo: true,
       repeat: -1,
       ease: 'Sine.easeInOut',
      })
     }
     return img
    })
   }

   let furnishings: Phaser.GameObjects.GameObject[] = []
   let itemLife: Map<string, { item: RoomObject; g: Phaser.GameObjects.Graphics }> = new Map()
   let zones: Phaser.GameObjects.Zone[] = []
   let lifeTick = 0
   const motion = matchMedia('(prefers-reduced-motion: reduce)')

   const paintRoomLife = (tick: number) => {
    if (motion.matches) {
     itemLife.forEach(({ g }) => g.clear())
     bgImage.setTexture(`realm-room-bg-${appearance.mood}-0`)
     return
    }
    bgImage.setTexture(`realm-room-bg-${appearance.mood}-${tick % 4}`)
    itemLife.forEach(({ item, g }) => {
     g.clear()
     draw(g, roomAmbientPixels(appearance.mood, [item], tick, enabledLights))
    })
   }

   const onLights = (enabled: Record<string, boolean>) => {
    enabledLights = enabled
    drawLighting(getObjects())
    paintRoomLife(lifeTick)
   }
   this.game.events.on('room:lights', onLights)

   const drawObjects = (objects: RoomObject[]) => {
    drawLighting(objects)
    furnishings.forEach(o => o.destroy())
    itemLife.forEach(({ g }) => g.destroy())
    zones.forEach(o => o.destroy())
    furnishings = []
    itemLife = new Map()
    zones = []
    for (const item of objects) {
     const baseDepth = item.y * tile + item.height * tile
     const g = this.add.graphics({ x: item.x * tile, y: item.y * tile }).setDepth(baseDepth)
     g.fillStyle(0x12131c, 0.38)
     g.fillEllipse(item.width * 16, item.height * 32 - 3, item.width * 32 + 10, 13)
     draw(g, furniturePixels(item.id, appearance.mood))
     furnishings.push(g)

     if (animatedFurnitureIds.has(item.id)) {
      const lifeG = this.add.graphics().setDepth(baseDepth + 0.5)
      itemLife.set(item.id, { item, g: lifeG })
     }

     const tag = this.add
      .text((item.x + item.width * 0.5) * tile, item.y * tile - 3, item.name, {
       fontFamily: 'Inter, "Segoe UI", sans-serif',
       fontSize: '8.5px',
       color: '#ececf4',
       backgroundColor: '#1b1926',
       padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(baseDepth + 2)
      .setVisible(false)
     furnishings.push(tag)

     const hoverRing = this.add
      .graphics({ x: item.x * tile, y: item.y * tile })
      .setDepth(baseDepth - 1)
      .setVisible(false)
     hoverRing.lineStyle(1, 0xe7c58c, 0.85)
     hoverRing.strokeRoundedRect(1, 2, item.width * tile - 2, item.height * tile - 2, 5)
     furnishings.push(hoverRing)

     const zone = this.add
      .zone((item.x + item.width / 2) * tile, (item.y + item.height / 2) * tile, item.width * tile, item.height * tile)
      .setDepth(baseDepth + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
       hoverRing.setVisible(true)
       tag.setVisible(true)
      })
      .on('pointerout', () => {
       hoverRing.setVisible(false)
       tag.setVisible(false)
      })

     zones.push(zone)
    }
    paintRoomLife(lifeTick)
   }
   drawObjects(getObjects())
   this.game.events.on('room:layout', drawObjects)

   // One pointer path serves mouse and touch; editing never runs walking handlers.
   const preview = this.add.graphics().setDepth(10000)
   let drag: { id: string; x: number; y: number; offsetX: number; offsetY: number; last: string } | null = null
   const clearPlacement = () => {
    drag = null
    preview.clear()
   }
   const pointerTile = (p: Phaser.Input.Pointer) => ({ x: Math.floor(p.x / tile), y: Math.floor(p.y / tile) })
   const hit = (p: Point) => [...getObjects()].reverse().find(o => p.x >= o.x && p.x < o.x + o.width && p.y >= o.y && p.y < o.y + o.height)
   const hitPet = (p: Point) => [...petActors.values()].find(pa => pa.state.point.x === p.x && pa.state.point.y === p.y)
   const hitWildlife = (p: Point) => (wildlifeNode && wildlifeNode.point.x === p.x && wildlifeNode.point.y === p.y ? wildlifeNode : null)

   this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (pointer.button > 0) return
    const p = pointerTile(pointer),
     item = hit(p)
    parent.focus({ preventScroll: true })
    if (options?.editor) {
     if (!options.editor.enabled() || !item) return
     onInspect(item.id)
     drag = { id: item.id, x: item.x, y: item.y, offsetX: p.x - item.x, offsetY: p.y - item.y, last: '' }
     const event = pointer.event as PointerEvent
     if (event.pointerId !== undefined) this.game.canvas.setPointerCapture(event.pointerId)
     return
    }
    const wildHit = hitWildlife(p)
    if (wildHit) {
     options?.onWildlifeClick?.(wildHit.encounter)
     return
    }
    const petHit = hitPet(p)
    if (petHit) {
     petHit.state.animState = 'happy'
     petHit.state.ticksInState = 0
     petHit.state.stateDurationTicks = 6
     paintPet(petHit, lifeTick)
     options?.onPetInteract?.(petHit.summary)
     return
    }
    if (item) onInspect(item.id)
    else options?.onWalk?.(p)
   })
   this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (!drag || !options?.editor) return
    const p = pointerTile(pointer),
     x = p.x - drag.offsetX,
     y = p.y - drag.offsetY,
     key = `${x},${y}`
    if (drag.last === key) return
    drag.last = key
    const item = getObjects().find(o => o.id === drag!.id)!
    const error = options.editor.error(item.id, x, y)
    preview.clear()
    preview.fillStyle(error ? 0xc86767 : 0xb7e7d5, 0.22)
    preview.fillRect(x * tile, y * tile, item.width * tile, item.height * tile)
    preview.lineStyle(2, error ? 0xffa3a3 : 0xb7e7d5, 1)
    preview.strokeRect(x * tile + 1, y * tile + 1, item.width * tile - 2, item.height * tile - 2)
    if (error) {
     preview.lineBetween(x * tile, y * tile, (x + item.width) * tile, (y + item.height) * tile)
     preview.lineBetween((x + item.width) * tile, y * tile, x * tile, (y + item.height) * tile)
    }
    options.editor.status(error ? `Invalid placement: ${error}` : `Valid placement · Column ${x + 1}, row ${y + 1}. Release to place.`)
   })
   this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    if (!drag || !options?.editor) return
    const start = drag,
     p = pointerTile(pointer)
    clearPlacement()
    const x = p.x - start.offsetX,
     y = p.y - start.offsetY
    if (options.editor.enabled() && (x !== start.x || y !== start.y)) options.editor.place(start.id, x, y)
   })
   const cancelPlacement = () => {
    if (drag) options?.editor?.status('Placement cancelled. Original position kept.')
    clearPlacement()
   }
   this.input.on('pointerupoutside', cancelPlacement)
   window.addEventListener('blur', cancelPlacement)
   this.game.canvas.addEventListener('pointercancel', cancelPlacement)
   this.game.events.on('room:cancel-placement', cancelPlacement)

   type Actor = {
    container: Phaser.GameObjects.Container
    art: Phaser.GameObjects.Graphics
    blink: Phaser.GameObjects.Graphics
    shadow: Phaser.GameObjects.Ellipse
    point: Point
    direction: Direction
    appearance: Appearance
    until: number
    sequence: number
    seated: boolean
    blinking: boolean
   }
   const baseY = -CHARACTER_HEIGHT * 0.66
   const paint = (actor: Actor, frame = 0) => {
    actor.art.clear()
    actor.blink.clear()
    actor.blinking = false
    actor.art.setY(baseY)
    actor.blink.setY(baseY)
    draw(actor.art, actor.seated ? seatedCharacterPixels(actor.appearance, actor.direction) : characterPixels(actor.appearance, actor.direction, frame))
   }
   const makeActor = (p: Point, value: Appearance): Actor => {
    const art = this.add.graphics().setScale(0.66).setPosition(-CHARACTER_WIDTH * 0.33, baseY)
    const blink = this.add.graphics().setScale(0.66).setPosition(-CHARACTER_WIDTH * 0.33, baseY)
    const shadow = this.add.ellipse(0, -2, 22, 7, 0x12191a, 0.5)
    const container = this.add.container(p.x * tile + 16, p.y * tile + 27, [shadow, art, blink]).setDepth((p.y + 1) * tile)
    const actor: Actor = {
     container,
     art,
     blink,
     shadow,
     point: { ...p },
     direction: 'down',
     appearance: value,
     until: 0,
     sequence: -1,
     seated: false,
     blinking: false,
    }
    paint(actor)
    return actor
   }
   const avatar = makeActor(getPosition(), appearance)
   const moveActor = (actor: Actor, p: Point, reset = false) => {
    if (reset) {
     this.tweens.killTweensOf(actor.container)
     actor.direction = 'down'
     actor.point = { ...p }
     actor.until = 0
     actor.container.setPosition(p.x * tile + 16, p.y * tile + 27).setDepth((p.y + 1) * tile)
     paint(actor)
     return
    }
    if (samePoint(actor.point, p)) return
    const adjacent = Math.abs(p.x - actor.point.x) + Math.abs(p.y - actor.point.y) === 1
    actor.direction = facingFrom(actor.point, p, actor.direction)
    actor.point = { ...p }
    paint(actor)
    this.tweens.killTweensOf(actor.container)
    const x = p.x * tile + 16,
     y = p.y * tile + 27,
     depth = (p.y + 1) * tile
    // Polling can skip tiles. Snap authoritative snapshots rather than drawing a route through obstacles.
    if (motion.matches || !adjacent) {
     actor.container.setPosition(x, y).setDepth(depth)
     actor.until = 0
     return
    }
    actor.until = this.time.now + 220
    this.tweens.add({
     targets: actor.container,
     x,
     y,
     duration: 220,
     ease: 'Linear',
     onUpdate: () => actor.container.setDepth(actor.container.y + 5),
     onComplete: () => {
      actor.container.setDepth(depth)
      actor.until = 0
      paint(actor)
     },
    })
   }
   const position = (p: Point) => {
    if (activeAction && !samePoint(avatar.point, p)) onAction(null)
    moveActor(avatar, p)
   }
   this.game.events.on('room:move', position)
   let activeAction: RoomAction | null = null
   let actionBadge: Phaser.GameObjects.Text | null = null
   let furnitureFront: Phaser.GameObjects.Graphics | null = null
   const onAction = (action: RoomAction | null) => {
    actionBadge?.destroy()
    actionBadge = null
    furnitureFront?.destroy()
    furnitureFront = null
    const pose = furniturePose(avatar.point, action, getObjects())
    activeAction = pose ? action : null
    this.tweens.killTweensOf(avatar.container)
    avatar.until = 0
    avatar.seated = pose?.type === 'sit'
    avatar.shadow.setVisible(!pose)
    avatar.art.setPosition(-CHARACTER_WIDTH * 0.33, baseY).setRotation(0)
    avatar.blink.setPosition(-CHARACTER_WIDTH * 0.33, baseY).setRotation(0)
    if (pose) {
     avatar.direction = pose.direction
     avatar.container.setPosition(pose.x, pose.y).setDepth(pose.depth)
     furnitureFront = this.add.graphics({ x: pose.object.x * tile, y: pose.object.y * tile }).setDepth(pose.depth + 1)
     draw(furnitureFront, furnitureActionForeground(pose.kind, appearance.mood, appearance.skin))
     actionBadge = this.add
      .text(0, -48, pose.type === 'rest' ? 'zZz' : action!.label, {
       fontFamily: 'Inter, sans-serif',
       fontSize: '8px',
       color: '#f3f4f8',
       backgroundColor: '#191b24',
       padding: { x: 4, y: 3 },
      })
      .setOrigin(0.5, 1)
     avatar.container.add(actionBadge)
    } else avatar.container.setPosition(avatar.point.x * tile + 16, avatar.point.y * tile + 27).setDepth((avatar.point.y + 1) * tile)
    paint(avatar)
   }
   this.game.events.on('room:action', onAction)
   onAction(options?.action?.() ?? null)

   // --- EQUIPPED HOUSE PETS (Up to 3 living companions) ---
   type PetNode = {
    summary: EquippedPetSummary
    state: PetBehaviorState
    container: Phaser.GameObjects.Container
    art: Phaser.GameObjects.Graphics
    label: Phaser.GameObjects.Text
   }
   const petActors = new Map<string, PetNode>()
   const startSpots: Point[] = [
    { x: 6, y: 8 },
    { x: 10, y: 8 },
    { x: 7, y: 5 },
   ]

   const paintPet = (node: PetNode, frameTick: number) => {
    node.art.clear()
    const dims = getPetSpriteDimensions(node.summary.species_id)
    const scale = node.summary.species_id === 'triarch' ? 0.8 : 0.85
    node.art.setScale(scale).setPosition((-dims.width * scale) / 2, -dims.height * scale + 2)
    const frame = motion.matches ? 0 : frameTick % 4
    draw(node.art, getPetPixels(node.summary.species_id, node.state.animState, frame))
   }

   const syncPets = (pets: EquippedPetSummary[]) => {
    const incomingIds = new Set(pets.slice(0, 3).map(p => p.id))
    for (const [id, node] of petActors) {
     if (!incomingIds.has(id)) {
      this.tweens.killTweensOf(node.container)
      node.container.destroy(true)
      petActors.delete(id)
     }
    }
    const objects = getObjects()
    pets.slice(0, 3).forEach((pet, idx) => {
     const existing = petActors.get(pet.id)
     if (existing) {
      existing.summary = pet
      existing.label.setText(petDisplayName(pet))
      paintPet(existing, lifeTick)
      return
     }
     const occupied = [...petActors.values()].map(n => n.state.point)
     const spawnPt = findSafePetTile(startSpots[idx] ?? startSpots[0], objects, occupied)
     const shadow = this.add.ellipse(0, 0, pet.species_id === 'triarch' ? 26 : 18, 6, 0x10131c, 0.45)
     const art = this.add.graphics()
     const labelText = pet.title ? `${petDisplayName(pet)} · ${pet.title}` : petDisplayName(pet)
     const label = this.add
      .text(0, -30, labelText, {
       fontFamily: 'Inter, sans-serif',
       fontSize: '8px',
       color: pet.species_id === 'triarch' ? '#f5d986' : '#ececf4',
       backgroundColor: '#191824',
       padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
     const container = this.add
      .container(spawnPt.x * tile + 16, spawnPt.y * tile + 26, [shadow, art, label])
      .setDepth((spawnPt.y + 0.9) * tile)
     const node: PetNode = {
      summary: pet,
      state: {
       id: pet.id,
       speciesId: pet.species_id,
       personality: pet.personality,
       point: spawnPt,
       direction: 'down',
       animState: 'idle',
       ticksInState: 0,
       stateDurationTicks: 4 + idx * 2,
      },
      container,
      art,
      label,
     }
     paintPet(node, lifeTick)
     petActors.set(pet.id, node)
    })
   }

   syncPets(options?.pets?.() ?? [])
   this.game.events.on('room:pets', syncPets)

   // --- ACTIVE WILDLIFE VISITOR ---
   type WildlifeNode = {
    encounter: WildlifeEncounter
    point: Point
    container: Phaser.GameObjects.Container
    art: Phaser.GameObjects.Graphics
   }
   let wildlifeNode: WildlifeNode | null = null

   const syncWildlife = (enc: WildlifeEncounter | null) => {
    if (!enc || enc.status !== 'active') {
     if (wildlifeNode) {
      wildlifeNode.container.destroy(true)
      wildlifeNode = null
     }
     return
    }
    if (wildlifeNode && wildlifeNode.encounter.id === enc.id) {
     wildlifeNode.encounter = enc
     return
    }
    if (wildlifeNode) {
     wildlifeNode.container.destroy(true)
     wildlifeNode = null
    }
    const objects = getObjects()
    const occupied = [...petActors.values()].map(n => n.state.point)
    const pt = findSafePetTile({ x: 8, y: 5 }, objects, occupied)
    const ring = this.add.ellipse(0, 0, 26, 10, 0xd9b152, 0.35)
    const art = this.add.graphics()
    const dims = getPetSpriteDimensions(enc.species_id)
    art.setScale(0.9).setPosition((-dims.width * 0.9) / 2, -dims.height * 0.9 + 2)
    draw(art, getPetPixels(enc.species_id, 'idle', 0))
    const badge = this.add
     .text(0, -32, `✦ Wild ${enc.name} (Click to bond)`, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '8.5px',
      color: '#fef08a',
      backgroundColor: '#251e38',
      padding: { x: 5, y: 2 },
     })
     .setOrigin(0.5, 1)
    const container = this.add
     .container(pt.x * tile + 16, pt.y * tile + 26, [ring, art, badge])
     .setDepth((pt.y + 0.95) * tile)
    wildlifeNode = { encounter: enc, point: pt, container, art }
   }

   syncWildlife(options?.wildlife?.() ?? null)
   this.game.events.on('room:wildlife', syncWildlife)

   const reconcilePose = () => {
    if (activeAction) onAction(activeAction)
    const objects = getObjects()
    const used: Point[] = []
    for (const node of petActors.values()) {
     const safe = findSafePetTile(node.state.point, objects, used)
     used.push(safe)
     if (safe.x !== node.state.point.x || safe.y !== node.state.point.y) {
      this.tweens.killTweensOf(node.container)
      node.state.point = safe
      node.container.setPosition(safe.x * tile + 16, safe.y * tile + 26).setDepth((safe.y + 0.9) * tile)
     }
    }
    if (wildlifeNode) {
     const safeWild = findSafePetTile(wildlifeNode.point, objects, used)
     wildlifeNode.point = safeWild
     wildlifeNode.container.setPosition(safeWild.x * tile + 16, safeWild.y * tile + 26).setDepth((safeWild.y + 0.95) * tile)
    }
   }
   this.game.events.on('room:layout', reconcilePose)

   const guests = new Map<string, Actor>()
   const drawPeople = (people: Visitor[]) => {
    const ids = new Set(people.map(p => p.id))
    for (const [id, actor] of guests)
     if (!ids.has(id)) {
      actor.container.destroy(true)
      guests.delete(id)
     }
    for (const person of people) {
     let actor = guests.get(person.id)
     if (!actor) {
      actor = makeActor(person, { ...appearance, ...person.character })
      const label = this.add
       .text(0, -46, person.name.slice(0, 18), {
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: '#f5f3ff',
        backgroundColor: '#1d1b29',
        padding: { x: 4, y: 2 },
       })
       .setOrigin(0.5, 1)
      actor.container.add(label)
      guests.set(person.id, actor)
     }
     const reset = person.sequence < actor.sequence
     actor.sequence = person.sequence
     actor.appearance = { ...appearance, ...person.character }
     moveActor(actor, person, reset)
     if (!actor.until) paint(actor)
    }
   }
   drawPeople(options?.people?.() ?? [])
   this.game.events.on('room:people', drawPeople)
   const disposeActivity = activityOverlay(
    this,
    () => new Map([[options?.localId ?? 'local', avatar], ...guests]),
    () => options?.activity?.() ?? { messages: [], activity: [] },
    options?.localId ?? 'local',
    () => options?.focus?.(),
   )
   let lastLifeAt = 0
   const animation = this.time.addEvent({
    delay: 85,
    loop: true,
    callback: () => {
     const now = this.time.now
     for (const actor of [avatar, ...guests.values()]) {
      if (actor.until > now && !motion.matches) paint(actor, Math.floor(now / 85) % 2 + 1)
     }
     if (motion.matches || document.hidden) return
     if (now - lastLifeAt >= 250) {
      lastLifeAt = now
      lifeTick++
      paintRoomLife(lifeTick)

      // Animate equipped house pets & advance behavior every 3 lifeTicks (~750ms)
      const objects = getObjects()
      for (const node of petActors.values()) {
       if (lifeTick % 3 === 0) {
        const prevPoint = { ...node.state.point }
        const others = [...petActors.values()].filter(o => o.summary.id !== node.summary.id).map(o => o.state.point)
        if (wildlifeNode) others.push(wildlifeNode.point)
        node.state = stepPetBehavior(node.state, objects, avatar.point, others)
        if (node.state.point.x !== prevPoint.x || node.state.point.y !== prevPoint.y) {
         this.tweens.killTweensOf(node.container)
         const targetX = node.state.point.x * tile + 16
         const targetY = node.state.point.y * tile + 26
         const targetDepth = (node.state.point.y + 0.9) * tile
         this.tweens.add({
          targets: node.container,
          x: targetX,
          y: targetY,
          duration: 380,
          ease: 'Sine.easeInOut',
          onUpdate: () => node.container.setDepth(node.container.y + 2),
          onComplete: () => node.container.setDepth(targetDepth),
         })
        }
       }
       paintPet(node, lifeTick)
      }

      if (wildlifeNode) {
       wildlifeNode.art.clear()
       draw(wildlifeNode.art, getPetPixels(wildlifeNode.encounter.species_id, 'idle', lifeTick % 4))
      }

      const actors = [avatar, ...guests.values()]
      actors.forEach((actor, idx) => {
       if (actor.until > now) return
       const blink = characterBlinkPixels(actor.appearance, actor.direction, lifeTick + idx * 3)
       if (blink.length > 0 || actor.blinking) {
        actor.blink.clear()
        if (blink.length > 0) {
         draw(actor.blink, blink)
         actor.blinking = true
        } else {
         actor.blinking = false
        }
       }
      })
     }
    },
   })
   const reduce = () => {
    bgImage.setTexture(`realm-room-bg-${appearance.mood}-0`)
    itemLife.forEach(({ g }) => g.clear())
    this.tweens.killTweensOf(lighting)
    lighting.forEach(light => light.setAlpha(1))
    for (const actor of [avatar, ...guests.values()]) {
     this.tweens.killTweensOf(actor.container)
     actor.container.setPosition(actor.point.x * tile + 16, actor.point.y * tile + 27).setDepth((actor.point.y + 1) * tile)
     actor.until = 0
     paint(actor)
    }
    for (const node of petActors.values()) {
     this.tweens.killTweensOf(node.container)
     node.state.animState = 'sit'
     node.container
      .setPosition(node.state.point.x * tile + 16, node.state.point.y * tile + 26)
      .setDepth((node.state.point.y + 0.9) * tile)
     paintPet(node, 0)
    }
    reconcilePose()
   }
   motion.addEventListener('change', reduce)

   this.events.once('shutdown', () => {
    this.game.events.off('room:layout', drawObjects)
    this.game.events.off('room:layout', reconcilePose)
    this.game.events.off('room:move', position)
    this.game.events.off('room:action', onAction)
    this.game.events.off('room:lights', onLights)
    this.game.events.off('room:people', drawPeople)
    this.game.events.off('room:pets', syncPets)
    this.game.events.off('room:wildlife', syncWildlife)
    this.game.events.off('room:cancel-placement', cancelPlacement)
    this.game.canvas.removeEventListener('pointercancel', cancelPlacement)
    window.removeEventListener('blur', cancelPlacement)
    motion.removeEventListener('change', reduce)
    animation.remove()
    disposeActivity()
   })
  }
 }
 const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: ROOM.width * tile,
  height: ROOM.height * tile,
  backgroundColor: '#11121c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: RoomScene,
  audio: { noAudio: true },
  banner: false,
 })
 let frame = 0
 const resize = new ResizeObserver(() => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
   if (game.isRunning) {
    game.scale.getParentBounds()
    game.scale.refresh()
   }
  })
 })
 resize.observe(parent)
 game.events.once('destroy', () => {
  resize.disconnect()
  cancelAnimationFrame(frame)
 })
 return game
}
