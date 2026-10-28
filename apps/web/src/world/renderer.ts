import Phaser from 'phaser'
import { readAppearance, type Appearance } from '../appearance'
import type { Visitor } from '../account-repository'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels, type Pixel } from '../character'
import { ROOM, type Point, type RoomObject } from './room'
import { furniturePixels, roomPixels } from './art'

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

   // Atmospheric soft lighting overlays (window moonbeams, orbital portal glow, entrance lanterns)
   const ambient = this.add.graphics().setDepth(1)
   const glow = (x: number, y: number, rx: number, ry: number, color: number, alpha: number) => {
    ambient.fillStyle(color, alpha * 0.45)
    ambient.fillEllipse(x, y, rx * 2, ry * 2)
    ambient.fillStyle(color, alpha)
    ambient.fillEllipse(x, y, rx * 1.15, ry * 1.15)
   }
   glow(244, 68, 72, 34, 0xffe49e, 0.14)
   glow(294, 260, 42, 30, 0xa78bfa, 0.22)
   glow(202, 344, 24, 18, 0xffd27d, 0.18)
   glow(310, 344, 24, 18, 0xffd27d, 0.18)

   // Floating callout badge above orbital portal
   const portalTag = this.add
    .text(294, 232, 'Chat', {
     fontFamily: 'Inter, "Segoe UI", sans-serif',
     fontSize: '9px',
     color: '#f3e8ff',
     backgroundColor: '#1a1829',
     padding: { x: 6, y: 3 },
    })
    .setOrigin(0.5, 1)
    .setDepth(245)

   let furnishings: Phaser.GameObjects.GameObject[] = []
   let zones: Phaser.GameObjects.Zone[] = []
   const drawObjects = (objects: RoomObject[]) => {
    furnishings.forEach(o => o.destroy())
    zones.forEach(o => o.destroy())
    furnishings = []
    zones = []
    for (const item of objects) {
     const baseDepth = item.y * tile + item.height * tile
     const g = this.add.graphics({ x: item.x * tile, y: item.y * tile }).setDepth(baseDepth)
     g.fillStyle(0x12131c, 0.34)
     g.fillEllipse(item.width * 16, item.height * 32 - 3, item.width * 32 + 8, 12)
     if (item.id === 'lantern' || item.id === 'floor-lamp') {
      g.fillStyle(0xffe299, 0.16)
      g.fillEllipse(16, 18, 68, 52)
     } else if (item.id === 'desk' || item.id === 'console') {
      g.fillStyle(0x5ce6dc, 0.12)
      g.fillEllipse(item.width * 16, 14, item.width * 28, 36)
     }
     draw(g, furniturePixels(item.id))
     furnishings.push(g)

     if (item.id === 'coffee-table') {
      const tag = this.add
       .text((item.x + item.width * 0.38) * tile, item.y * tile - 2, 'Guestbook', {
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
     hoverRing.lineStyle(1.5, 0xa78bfa, 0.85)
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
   sprite.setPosition(-CHARACTER_WIDTH * 0.33, -CHARACTER_HEIGHT * 0.66).setScale(0.66)
   const aura = this.add.ellipse(0, -1, 26, 10, 0xa78bfa, 0.25)
   const shadow = this.add.ellipse(0, -2, 22, 7, 0x12131c, 0.42)
   const avatar = this.add.container(0, 0, [aura, shadow, sprite])
   const position = (p: Point) => {
    avatar.setPosition(p.x * tile + 16, p.y * tile + 27).setDepth((p.y + 1) * tile)
   }
   position(getPosition())
   this.game.events.on('room:move', position)

   let guests: Phaser.GameObjects.Container[] = []
   const drawPeople = (people: Visitor[]) => {
    guests.forEach(g => g.destroy(true))
    guests = []
    for (const person of people) {
     const art = this.add.graphics()
     draw(art, characterPixels({ ...appearance, ...person.character }))
     art.setScale(0.66).setPosition(-CHARACTER_WIDTH * 0.33, -CHARACTER_HEIGHT * 0.66)
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
     guests.push(this.add.container(person.x * tile + 16, person.y * tile + 27, [guestShadow, art, label]).setDepth((person.y + 1) * tile))
    }
   }
   drawPeople(options?.people?.() ?? [])
   this.game.events.on('room:people', drawPeople)

   this.events.once('shutdown', () => {
    portalTag.destroy()
    this.game.events.off('room:layout', drawObjects)
    this.game.events.off('room:move', position)
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
 })
}
