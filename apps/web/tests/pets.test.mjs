import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PET_SPECIES_CATALOG,
  getPetSpecies,
  petDisplayName,
  validatePetNickname,
} from '../src/pets/pet-model.ts'
import { getPetPixels, getPetSpriteDimensions } from '../src/pets/pet-sprites.ts'
import { bannerRoamBounds, nextBannerStop } from '../src/pets/banner-roam.ts'
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
  nextPetWaypoint,
} from '../src/world/pet-actor.ts'
import { petRestTile, petCornerPixels } from '../src/world/pet-corner.ts'
import { OBJECTS, ROOM } from '../src/world/room.ts'
import { readRoomPets } from '../src/world/pet-room-state.ts'
import { getUserPets, adoptStarterPet, bondWildlifePet, equipPets, updatePetNickname, interactWithPet, grantFounderPet, evaluateWildlifeEncounter } from '../src/pets/pet-repository.ts'

test('pet schema outages reject every account read and mutation without fabricating ownership', async () => {
  const storageBefore = globalThis.localStorage
  let storageAccesses = 0
  globalThis.localStorage = { getItem() { storageAccesses++; return null }, setItem() { storageAccesses++ } }
  const db = { rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function in the schema cache' } }) }
  try {
    for (const call of [
      () => getUserPets(db, 'ordinary-user'), () => adoptStarterPet(db, 'cat'),
      () => bondWildlifePet(db, 'encounter'), () => equipPets(db, 'house', []),
      () => updatePetNickname(db, 'pet', 'Miso'), () => interactWithPet(db, 'pet'),
      () => grantFounderPet(db), () => evaluateWildlifeEncounter(db),
    ]) await assert.rejects(call, /temporarily unavailable.*migrations/)
    assert.equal(storageAccesses, 0)
  } finally {
    if (storageBefore === undefined) delete globalThis.localStorage
    else globalThis.localStorage = storageBefore
  }
})

test('pet repository preserves server errors and authoritative successful responses', async () => {
  const denial = { code: '42501', message: 'Not permitted' }
  await assert.rejects(getUserPets({ rpc: async () => ({ data: null, error: denial }) }), error => error === denial)
  const snapshot = { owned: [], equipment: { house_pets: [], banner_pet: null }, is_founder: false }
  assert.equal(await getUserPets({ rpc: async () => ({ data: snapshot, error: null }) }), snapshot)
})

test('authoritative empty room pet snapshots clear previous companions and wildlife', () => {
  const prior = readRoomPets({ house_pets: [{ id: 'old-pet' }], wildlife_encounter: { id: 'old-encounter' } })
  assert.equal(prior.housePets.length, 1)
  assert.deepEqual(readRoomPets({ house_pets: [], wildlife_encounter: null }), { housePets: [], wildlife: null })
  assert.deepEqual(readRoomPets({}), { housePets: [], wildlife: null })
  assert.equal(prior.housePets.length, 1, 'reading a new snapshot must not mutate the prior visit')
})

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

test('Village Cat has four distinct bounded views with stable native pixel dimensions', () => {
  const directions = ['down','up','left','right']
  assert.equal(new Set(directions.map(d=>JSON.stringify(getPetPixels('cat','idle',0,d)))).size,4)
  for(const direction of directions) for(const state of ['idle','walk','sit','sleep','happy']) for(let frame=0;frame<4;frame++) {
    for(const p of getPetPixels('cat',state,frame,direction)) {
      assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=32&&p.y+p.h<=32,`${direction}/${state}/${frame} must stay inside the sprite`)
      assert.ok([p.x,p.y,p.w,p.h].every(Number.isInteger))
    }
  }
  assert.notDeepEqual(getPetPixels('cat','sleep',0),getPetPixels('cat','idle',0),'sleep needs a curled silhouette')
})

test('resting corner follows the sofa and never occupies a blocked or entrance tile', () => {
  const mat=petRestTile(OBJECTS)
  assert.deepEqual(mat,{x:6,y:7})
  assert.equal(isWalkableForPet(mat,OBJECTS),true)
  assert.equal(petRestTile(OBJECTS.filter(o=>o.id!=='sofa')),null)
  const moved=OBJECTS.filter(o=>!['sofa','desk','lantern'].includes(o.id)).concat({...OBJECTS.find(o=>o.id==='sofa'),x:3,y:2})
  assert.notDeepEqual(petRestTile(moved),mat)
  const alternate=petRestTile(OBJECTS,[mat])
  assert.ok(alternate && (alternate.x!==mat.x||alternate.y!==mat.y))
  for(const mood of ['cozy','medieval','tech'])for(const p of petCornerPixels(OBJECTS,mood)) {
    assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=512&&p.y+p.h<=384)
    assert.match(p.color,/^#[0-9a-f]{6}$/i)
  }
})

test('pet routes detour around furniture and decline unreachable destinations', () => {
  const wall={id:'test-wall',name:'Wall',description:'',x:6,y:6,width:1,height:3}
  let point={x:5,y:7},target={x:7,y:7},steps=0
  while((point.x!==target.x||point.y!==target.y)&&steps<20) {
    const next=nextPetWaypoint(point,target,[wall])
    assert.ok(next)
    assert.equal(Math.abs(next.x-point.x)+Math.abs(next.y-point.y),1)
    assert.equal(isWalkableForPet(next,[wall]),true)
    point=next;steps++
  }
  assert.deepEqual(point,target)
  assert.ok(steps>2,'route must go around the wall')
  assert.equal(nextPetWaypoint({x:5,y:7},target,[wall],[target]),null)
})

test('personalities choose grounded activities: rest, inspect, follow, retreat and play', () => {
  const pet=(personality,point={x:7,y:8})=>({id:'behavior',speciesId:'cat',personality,point,direction:'down',animState:'idle',ticksInState:9,stateDurationTicks:4})
  let sleepy=pet('Sleepy',{x:9,y:8}),sleptOnMat=false
  for(let i=0;i<60;i++) {
    sleepy=stepPetBehavior(sleepy,OBJECTS,ROOM.spawn,[],.1)
    if(sleepy.animState==='sleep'&&JSON.stringify(sleepy.point)===JSON.stringify(petRestTile(OBJECTS)))sleptOnMat=true
  }
  assert.equal(sleptOnMat,true)
  const curious=stepPetBehavior(pet('Curious'),OBJECTS,ROOM.spawn,[],.1)
  assert.equal(curious.intent,'inspect');assert.ok(curious.target)
  const loyal=stepPetBehavior(pet('Loyal'),OBJECTS,{x:10,y:9},[],.1)
  assert.equal(loyal.intent,'follow');assert.equal(Math.abs(loyal.target.x-10)+Math.abs(loyal.target.y-9),1)
  const shy=stepPetBehavior(pet('Shy'),OBJECTS,{x:7,y:7},[],.99)
  assert.equal(shy.intent,'retreat');assert.ok(Math.abs(shy.target.x-7)+Math.abs(shy.target.y-7)>1)
  const visiting=stepPetBehavior(pet('Shy'),OBJECTS,{x:12,y:9},[],.99,[{x:7,y:7}])
  assert.equal(visiting.intent,'retreat','an approaching visitor also triggers shy behavior')
  assert.equal(stepPetBehavior(pet('Playful'),OBJECTS,ROOM.spawn,[],.1).intent,'play')
  assert.equal(stepPetBehavior(pet('Mischievous'),OBJECTS,ROOM.spawn,[],.1).intent,'inspect')
})

test('First Wyrm has distinct directional silhouettes and bounded native-pixel poses', () => {
  const signatures = ['down', 'up', 'left', 'right'].map(direction => JSON.stringify(getPetPixels('triarch', 'idle', 0, direction)))
  assert.equal(new Set(signatures).size, 4)
  for (const direction of ['down', 'up', 'left', 'right']) for (const state of ['idle', 'walk', 'sit', 'sleep', 'happy']) for (let frame = 0; frame < 4; frame++) {
    const pixels = getPetPixels('triarch', state, frame, direction)
    for (const p of pixels) {
      assert.ok([p.x, p.y, p.w, p.h].every(Number.isInteger))
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= 48 && p.y + p.h <= 36, `${direction}/${state}/${frame}: ${JSON.stringify(p)}`)
    }
    if (state === 'sleep') assert.ok(Math.min(...pixels.map(p => p.y)) >= 20, 'sleep lowers all three heads and folds the wings')
    if (direction === 'up') assert.equal(pixels.some(p => p.color === '#ffc775'), false, 'rear has no eyes')
  }
})

test('banner routes keep the entire pet inside its measured lane, clear of avatar overlap', () => {
  for (const width of [200, 256, 288, 320, 440, 560, 1000]) for (const spriteWidth of [64, 96]) {
    const bounds = bannerRoamBounds(width, spriteWidth)
    assert.ok(bounds.min >= 0 && bounds.max + spriteWidth <= width)
    if (width >= 288) assert.ok(bounds.min >= 154, 'avatar overlap stays clear')
    for (const personality of ['Sleepy', 'Curious', 'Playful', 'Shy', 'Loyal', 'Mischievous']) {
      let x = bounds.max
      for (let step = 0; step < 12; step++) {
        x = nextBannerStop(x, bounds, step, personality)
        assert.ok(x >= bounds.min && x <= bounds.max)
      }
    }
  }
})
