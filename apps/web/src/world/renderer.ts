import Phaser from 'phaser'
import { readAppearance, type Appearance } from '../appearance'
import type { Visitor } from '../account-repository'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels, type Pixel } from '../character'
import { ROOM, type Point, type RoomObject } from './room'
import { furniturePixels, roomPixels } from './art'
import { roomLighting } from './lighting'

const tile = 32
export function createRoom(
 parent: HTMLElement,
 onInspect: (id: string) => void,
 getPosition: () => Point,
 getObjects: () => RoomObject[],
 options?: { appearance?: Appearance; people?: () => Visitor[] },
) {
 class RoomScene extends Phaser.Scene {
  constructor() {
   super('room')
  }
  create() {
   const appearance = options?.appearance ?? readAppearance()
   const draw = (g: Phaser.GameObjects.Graphics, pixels: Pixel[]) => {
    for (const p of pixels) {
     g.fillStyle(parseInt(p.color.slice(1), 16))
     g.fillRect(p.x, p.y, p.w, p.h)
    }
   }
   draw(this.add.graphics(), roomPixels(appearance.mood))

   let lighting: Phaser.GameObjects.Image[] = []
   const drawLighting = (objects: RoomObject[]) => {
    lighting.forEach(light => light.destroy())
    lighting = roomLighting(appearance.mood, objects).map(light => {
     const key = `realm-light-${light.color}`
     if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 128, 128)!
      const ctx = texture.context
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      gradient.addColorStop(0, light.color)
      gradient.addColorStop(.4, `${light.color}88`)
      gradient.addColorStop(1, `${light.color}00`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 128, 128)
      texture.refresh()
     }
     return this.add.image(light.x, light.y, key).setDisplaySize(light.rx * 2, light.ry * 2).setAlpha(light.strength).setDepth(1)
    })
   }

   let furnishings: Phaser.GameObjects.GameObject[] = []
   let zones: Phaser.GameObjects.Zone[] = []
   const drawObjects = (objects: RoomObject[]) => {
    drawLighting(objects)
    furnishings.forEach(o => o.destroy())
    zones.forEach(o => o.destroy())
    furnishings = []
    zones = []
    for (const item of objects) {
     const baseDepth = item.y * tile + item.height * tile
     const g = this.add.graphics({ x: item.x * tile, y: item.y * tile }).setDepth(baseDepth)
     g.fillStyle(0x12131c, 0.34)
     g.fillEllipse(item.width * 16, item.height * 32 - 3, item.width * 32 + 8, 12)
     draw(g, furniturePixels(item.id, appearance.mood))
     furnishings.push(g)

     if (item.id === 'coffee-table') {
      const tag = this.add
       .text((item.x + item.width * 0.38) * tile, item.y * tile - 2, item.name, {
        fontFamily: 'Inter, "Segoe UI", sans-serif',
        fontSize: '8.5px',
        color: '#ececf4',
        backgroundColor: '#1b1926',
        padding: { x: 5, y: 2 },
       })
       .setOrigin(0.5, 1)
       .setDepth(baseDepth + 2)
      furnishings.push(tag)
     }

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
      .on('pointerover', () => hoverRing.setVisible(true))
      .on('pointerout', () => hoverRing.setVisible(false))
      .on('pointerdown', () => onInspect(item.id))
     zones.push(zone)
    }
   }
   drawObjects(getObjects())
   this.game.events.on('room:layout', drawObjects)

   const sprite = this.add.graphics()
   draw(sprite, characterPixels(appearance))
   const baseY = -CHARACTER_HEIGHT * 0.66
   sprite.setPosition(-CHARACTER_WIDTH * 0.33, baseY).setScale(0.66)
   const aura = this.add.ellipse(0, -1, 26, 10, 0xd8c6a1, 0.1)
   const shadow = this.add.ellipse(0, -2, 22, 7, 0x12191a, 0.5)
   const avatar = this.add.container(0, 0, [aura, shadow, sprite])

   let idleTween: Phaser.Tweens.Tween | null = null
   const startIdle = () => {
    if (idleTween) idleTween.stop()
    sprite.y = baseY
    idleTween = this.tweens.add({
     targets: sprite,
     y: baseY - 1.5,
     duration: 1000,
     yoyo: true,
     repeat: -1,
     ease: 'Sine.easeInOut',
    })
   }
   startIdle()

   let moveTween: Phaser.Tweens.Tween | null = null
   let bobTween: Phaser.Tweens.Tween | null = null

   const position = (p: Point, immediate = false) => {
    const targetX = p.x * tile + 16
    const targetY = p.y * tile + 27
    const targetDepth = (p.y + 1) * tile

    if (immediate || (avatar.x === 0 && avatar.y === 0)) {
     avatar.setPosition(targetX, targetY).setDepth(targetDepth)
     return
    }

    if (moveTween) moveTween.stop()
    if (bobTween) bobTween.stop()
    if (idleTween) idleTween.pause()

    bobTween = this.tweens.add({
     targets: sprite,
     y: baseY - 3,
     duration: 110,
     yoyo: true,
     ease: 'Quad.easeOut',
    })

    moveTween = this.tweens.add({
     targets: avatar,
     x: targetX,
     y: targetY,
     duration: 220,
     ease: 'Linear',
     onUpdate: () => {
      avatar.setDepth(targetDepth)
     },
     onComplete: () => {
      startIdle()
     },
    })
   }
   position(getPosition(), true)
   this.game.events.on('room:move', position)

   let actionBadge: Phaser.GameObjects.Container | null = null
   const onAction = (action: { type: string; target: string; label: string } | null) => {
    if (actionBadge) {
     actionBadge.destroy(true)
     actionBadge = null
    }
    if (!action) {
     sprite.setPosition(-CHARACTER_WIDTH * 0.33, baseY)
     startIdle()
     return
    }
    if (action.type === 'sit') {
     if (idleTween) idleTween.stop()
     if (moveTween) moveTween.stop()
     // Lower character slightly into the chair or sofa cushion
     sprite.setPosition(-CHARACTER_WIDTH * 0.33, baseY + 5)

     const badgeBg = this.add.graphics()
     badgeBg.fillStyle(0x191b24, 0.88)
     badgeBg.fillRoundedRect(-38, -58, 76, 18, 4)
     badgeBg.lineStyle(1, action.target === 'desk' ? 0x5ce6dc : 0xd8c6a1, 0.85)
     badgeBg.strokeRoundedRect(-38, -58, 76, 18, 4)

     const text = action.target === 'desk' ? '💻 At PC Desk' : '☕ Relaxing'
     const badgeText = this.add.text(0, -49, text, {
      fontFamily: 'Inter, "Segoe UI", sans-serif',
      fontSize: '8px',
      color: '#f3f4f8',
     }).setOrigin(0.5, 0.5)

     actionBadge = this.add.container(0, 0, [badgeBg, badgeText])
     avatar.add(actionBadge)

     idleTween = this.tweens.add({
      targets: sprite,
      y: baseY + 4,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
     })
    }
   }
   this.game.events.on('room:action', onAction)

   let guests: Map<string, Phaser.GameObjects.Container> = new Map()
   const drawPeople = (people: Visitor[]) => {
    const incomingIds = new Set(people.map(p => p.id))
    for (const [id, container] of guests) {
     if (!incomingIds.has(id)) {
      container.destroy(true)
      guests.delete(id)
     }
    }
    for (const person of people) {
     const targetX = person.x * tile + 16
     const targetY = person.y * tile + 27
     const targetDepth = (person.y + 1) * tile
     let guestContainer = guests.get(person.id)
     if (!guestContainer) {
      const art = this.add.graphics()
      draw(art, characterPixels({ ...appearance, ...person.character }))
      art.setScale(0.66).setPosition(-CHARACTER_WIDTH * 0.33, baseY)
      const guestShadow = this.add.ellipse(0, -2, 22, 7, 0x12131c, 0.38)
      const label = this.add
       .text(0, -46, person.name.slice(0, 18), {
        fontFamily: 'Inter, "Segoe UI", sans-serif',
        fontSize: '9px',
        color: '#f5f3ff',
        backgroundColor: '#1d1b29',
        padding: { x: 4, y: 2 },
       })
       .setOrigin(0.5, 1)
      guestContainer = this.add.container(targetX, targetY, [guestShadow, art, label]).setDepth(targetDepth)
      guests.set(person.id, guestContainer)
     } else {
      this.tweens.add({
       targets: guestContainer,
       x: targetX,
       y: targetY,
       duration: 220,
       ease: 'Linear',
       onUpdate: () => {
        guestContainer?.setDepth(targetDepth)
       },
      })
     }
    }
   }
   drawPeople(options?.people?.() ?? [])
   this.game.events.on('room:people', drawPeople)

   this.events.once('shutdown', () => {
    this.game.events.off('room:layout', drawObjects)
    this.game.events.off('room:move', position)
    this.game.events.off('room:action', onAction)
    this.game.events.off('room:people', drawPeople)
   })
  }
 }
 return new Phaser.Game({
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
}
