import type { Appearance } from '../appearance'

export const worldPalettes = {
 cozy: { name: 'Cozy conservatory', description: 'Cream plaster, honey oak and soft sage.', wall: ['#d8c7a9', '#cbb99a', '#e7d7bb'], trim: '#f3dfbd', stone: ['#a99e8f', '#c6b9a1', '#ded0b4'], timber: ['#533b30', '#8b5f42', '#c48b5a'], floor: ['#ad7850', '#bb865a', '#c99668', '#d2a475'], seam: '#81593f', cloth: ['#3c564a', '#64806b', '#92aa87'], sky: ['#6992a1', '#a7c0bf', '#e8cb94'], glow: '#ffd590' },
 medieval: { name: 'Emberkeep hall', description: 'Hewn limestone, wine-red cloth and firelight.', wall: ['#737a80', '#626b75', '#8a9093'], trim: '#bfbaa8', stone: ['#626b76', '#939a9f', '#b6b8ac'], timber: ['#392e2c', '#66483b', '#986e4b'], floor: ['#75604f', '#856b52', '#957956', '#a48a64'], seam: '#55483d', cloth: ['#512e3e', '#854454', '#b56d70'], sky: ['#26364d', '#435973', '#a7b5c4'], glow: '#ffc77e' },
 tech: { name: 'Moonlit observatory', description: 'Midnight slate, silver trim and cyan instruments.', wall: ['#35465b', '#2b3a50', '#43566b'], trim: '#8ba8bd', stone: ['#26364d', '#4d667c', '#7693a6'], timber: ['#202b3d', '#3a4c60', '#617b91'], floor: ['#29394b', '#34475b', '#3c5266', '#476078'], seam: '#19283a', cloth: ['#243d52', '#377688', '#78c6cb'], sky: ['#14253c', '#294c6d', '#77b9cd'], glow: '#a2e7e4' },
} as const
export type WorldMood = Appearance['mood']
