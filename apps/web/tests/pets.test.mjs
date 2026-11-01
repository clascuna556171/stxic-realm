import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PET_SPECIES_CATALOG,
  getPetSpecies,
  petDisplayName,
  validatePetNickname,
} from '../src/pets/pet-model.ts'
import { getPetPixels, getPetSpriteDimensions } from '../src/pets/pet-sprites.ts'
import {
  ALL_HABITAT_TAGS,
  FURNITURE_HABITAT_TAGS,
  describeHabitatProgress,
  evaluateRoomHabitats,
  findEligibleWildlifeSpecies,
  getFurnitureHabitatTags,
  meetsHabitatRequirements,
} from '../src/world/wildlife-engine.ts'
import {
  chooseNextPetState,
  findSafePetTile,
  isWalkableForPet,
  stepPetBehavior,
} from '../src/world/pet-actor.ts'
import { OBJECTS, ROOM } from '../src/world/room.ts'

test('pet catalog contains all 8 species with starter, wildlife, achievement, and founder categories', () => {
  assert.equal(PET_SPECIES_CATALOG.length, 8)
  assert.deepEqual(
    PET_SPECIES_CATALOG.filter(s => s.type === 'starter').map(s => s.id),
    ['cat', 'slime', 'pup']
  )
  assert.deepEqual(
    PET_SPECIES_CATALOG.filter(s => s.type === 'wildlife' || s.type === 'achievement').map(s => s.id),
    ['fox', 'wisp', 'bat', 'owl']
  )

  const triarch = getPetSpecies('triarch')
  assert.ok(triarch)
  assert.equal(triarch.type, 'founder')
  assert.equal(triarch.rarity, 'founder')
  assert.equal(triarch.title, 'The First Wyrm')
})

test('nickname validation trims, allows empty to clear, and rejects invalid characters or lengths', () => {
  assert.equal(validatePetNickname('   '), null)
  assert.equal(validatePetNickname('  Mochi-Bean  '), null)
  assert.equal(validatePetNickname('A'.repeat(25)), 'Nickname must be 24 characters or fewer.')
  assert.equal(
    validatePetNickname('Bad<script>'),
    'Nickname cannot contain control characters or angle brackets.'
  )
  assert.equal(petDisplayName({ name: 'Village Cat', nickname: 'Miso' }), 'Miso')
  assert.equal(petDisplayName({ name: 'Village Cat', nickname: null }), 'Village Cat')
})

test('all 8 pet species generate valid pixel frames across all 5 animation states and 4 frames', () => {
  const states = ['idle', 'walk', 'sit', 'sleep', 'happy']
  for (const species of PET_SPECIES_CATALOG) {
    const dims = getPetSpriteDimensions(species.id)
    if (species.id === 'triarch') {
      assert.deepEqual(dims, { width: 48, height: 36 })
    } else {
      assert.deepEqual(dims, { width: 32, height: 32 })
    }

    for (const state of states) {
      for (let frame = 0; frame < 4; frame++) {
        const pixels = getPetPixels(species.id, state, frame)
        assert.ok(pixels.length >= 6, `${species.id} ${state} frame ${frame} should have pixels`)
        for (const { x, y, w, h, color } of pixels) {
          assert.ok(
            x >= 0 && x + w <= dims.width,
            `${species.id} ${state} frame ${frame} pixel x=${x}+${w} out of bounds (width=${dims.width})`
          )
          assert.ok(
            y >= 0 && y + h <= dims.height,
            `${species.id} ${state} frame ${frame} pixel y=${y}+${h} out of bounds (height=${dims.height})`
          )
          assert.match(color, /^#[0-9a-fA-F]{6}$/)
        }
      }
    }
  }

  // Verify Triarch's 3 heads move independently across idle frames
  const triarchIdle0 = JSON.stringify(getPetPixels('triarch', 'idle', 0))
  const triarchIdle1 = JSON.stringify(getPetPixels('triarch', 'idle', 1))
  const triarchIdle2 = JSON.stringify(getPetPixels('triarch', 'idle', 2))
  assert.notEqual(triarchIdle0, triarchIdle1)
  assert.notEqual(triarchIdle1, triarchIdle2)
})

test('habitat evaluation engine maps both core room catalog items and named wildlife decor items', () => {
  assert.equal(ALL_HABITAT_TAGS.length, 8)
  for (const obj of OBJECTS) {
    assert.ok(
      getFurnitureHabitatTags(obj.id).length > 0,
      `core room object ${obj.id} should have habitat tags`
    )
  }

  assert.deepEqual(FURNITURE_HABITAT_TAGS['mushroom-lamp'], ['Forest', 'Warm'])
  assert.deepEqual(FURNITURE_HABITAT_TAGS['potted-fern'], ['Forest'])
  assert.deepEqual(FURNITURE_HABITAT_TAGS['wooden-pet-bed'], ['Cozy'])
  assert.deepEqual(FURNITURE_HABITAT_TAGS['crystal-lantern'], ['Magical', 'Light'])
  assert.deepEqual(FURNITURE_HABITAT_TAGS['ancient-altar'], ['Ancient', 'Magical'])
  assert.deepEqual(FURNITURE_HABITAT_TAGS['dark-candle'], ['Dark', 'Ancient'])

  const fox = getPetSpecies('fox')
  const wisp = getPetSpecies('wisp')
  const bat = getPetSpecies('bat')

  // Moss Fox attraction: >= 2 Forest and >= 1 Cozy
  const forestCozyCounts = evaluateRoomHabitats([
    { id: 'mushroom-lamp' },
    { id: 'potted-fern' },
    { id: 'wooden-pet-bed' },
  ])
  assert.equal(forestCozyCounts.Forest, 2)
  assert.equal(forestCozyCounts.Cozy, 1)
  assert.equal(meetsHabitatRequirements(forestCozyCounts, fox.habitat_requirements), true)
  assert.equal(meetsHabitatRequirements(forestCozyCounts, wisp.habitat_requirements), false)

  // Crystal Wisp attraction: >= 2 Magical
  const magicalCounts = evaluateRoomHabitats([
    { id: 'crystal-lantern' },
    { id: 'ancient-altar' },
  ])
  assert.equal(meetsHabitatRequirements(magicalCounts, wisp.habitat_requirements), true)

  // Cave Bat attraction: >= 1 Dark and >= 1 Ancient
  const darkAncientCounts = evaluateRoomHabitats([{ id: 'dark-candle' }])
  assert.equal(meetsHabitatRequirements(darkAncientCounts, bat.habitat_requirements), true)

  // Eligible species filter excludes already owned species
  const unownedEligible = findEligibleWildlifeSpecies(OBJECTS, ['fox', 'wisp'])
  assert.deepEqual(
    unownedEligible.map(s => s.id),
    ['bat', 'owl']
  )

  const progress = describeHabitatProgress(forestCozyCounts, fox)
  assert.equal(progress.length, 2)
  assert.ok(progress.every(p => p.met))
})

test('house pet actor respects room boundaries, furniture footprints, player spawn, and personality state weights', () => {
  // Spawn tile is never walkable for pets
  assert.equal(isWalkableForPet(ROOM.spawn, OBJECTS), false)
  // Wall tile is never walkable
  assert.equal(isWalkableForPet({ x: 0, y: 0 }, OBJECTS), false)
  // Furniture tile (desk at 2,2) is never walkable
  assert.equal(isWalkableForPet({ x: 2, y: 2 }, OBJECTS), false)

  const startTile = findSafePetTile({ x: 6, y: 8 }, OBJECTS, [ROOM.spawn])
  assert.equal(isWalkableForPet(startTile, OBJECTS, [ROOM.spawn]), true)

  const pet0 = {
    id: 'pet-1',
    speciesId: 'cat',
    personality: 'Sleepy',
    point: startTile,
    direction: 'down',
    animState: 'idle',
    ticksInState: 5,
    stateDurationTicks: 5,
  }

  // If furniture is placed directly over pet0's tile, stepPetBehavior relocates it safely
  const customFurniture = [
    ...OBJECTS,
    { id: 'custom-block', name: 'Block', x: pet0.point.x, y: pet0.point.y, width: 1, height: 1 },
  ]
  const relocated = stepPetBehavior(pet0, customFurniture, ROOM.spawn, [], 0.25)
  assert.equal(isWalkableForPet(relocated.point, customFurniture, [ROOM.spawn]), true)
  assert.notDeepEqual(relocated.point, pet0.point)

  // Personality weights: Sleepy chooses sleep at low random roll; Playful chooses walk at low random roll
  assert.equal(chooseNextPetState('Sleepy', 'idle', 0.1).state, 'sleep')
  assert.equal(chooseNextPetState('Playful', 'idle', 0.1).state, 'walk')
  assert.equal(chooseNextPetState('Loyal', 'idle', 0.95).state, 'happy')

  const safeTile = findSafePetTile({ x: 2, y: 2 }, OBJECTS, [ROOM.spawn])
  assert.equal(isWalkableForPet(safeTile, OBJECTS, [ROOM.spawn]), true)
})
