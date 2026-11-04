import test from 'node:test'
import assert from 'node:assert/strict'

// Test reaction toggling logic
function applyReactionToggle(reactions, msgId, emoji, reactingUser) {
  const msgReactions = { ...(reactions[msgId] || {}) }
  const users = [...(msgReactions[emoji] || [])]
  const idx = users.indexOf(reactingUser)
  if (idx >= 0) {
    users.splice(idx, 1)
    if (users.length === 0) delete msgReactions[emoji]
    else msgReactions[emoji] = users
  } else {
    users.push(reactingUser)
    msgReactions[emoji] = users
  }
  return { ...reactions, [msgId]: msgReactions }
}

// Test 2D grid index calculation
function computeGridNav(currentIndex, totalCount, cols, direction) {
  if (direction === 'ArrowRight') {
    return Math.min(totalCount - 1, currentIndex + 1)
  }
  if (direction === 'ArrowLeft') {
    return Math.max(0, currentIndex - 1)
  }
  if (direction === 'ArrowDown') {
    return currentIndex + cols < totalCount ? currentIndex + cols : totalCount - 1
  }
  if (direction === 'ArrowUp') {
    return currentIndex - cols >= 0 ? currentIndex - cols : 0
  }
  return currentIndex
}

test('reaction toggle adds a new user reaction to an empty message', () => {
  const initial = {}
  const res = applyReactionToggle(initial, 'msg-1', '👍', 'user-alice')
  assert.deepEqual(res['msg-1']['👍'], ['user-alice'])
})

test('reaction toggle appends additional user reactions to existing emoji', () => {
  const initial = { 'msg-1': { '👍': ['user-alice'] } }
  const res = applyReactionToggle(initial, 'msg-1', '👍', 'user-bob')
  assert.deepEqual(res['msg-1']['👍'], ['user-alice', 'user-bob'])
})

test('reaction toggle removes user reaction and prunes empty emoji keys', () => {
  const initial = { 'msg-1': { '👍': ['user-alice'] } }
  const res = applyReactionToggle(initial, 'msg-1', '👍', 'user-alice')
  assert.equal(res['msg-1']['👍'], undefined)
})

test('2D grid navigation calculates correct horizontal and vertical jumps', () => {
  const total = 32
  const cols = 8 // 8 columns per row

  // Right from 0 -> 1
  assert.equal(computeGridNav(0, total, cols, 'ArrowRight'), 1)
  // Left from 5 -> 4
  assert.equal(computeGridNav(5, total, cols, 'ArrowLeft'), 4)
  // Left at 0 stays at 0
  assert.equal(computeGridNav(0, total, cols, 'ArrowLeft'), 0)

  // Down from index 2 moves to index 10 (one row down)
  assert.equal(computeGridNav(2, total, cols, 'ArrowDown'), 10)
  // Up from index 10 moves to index 2 (one row up)
  assert.equal(computeGridNav(10, total, cols, 'ArrowUp'), 2)
  // Up at row 0 clamps to 0
  assert.equal(computeGridNav(3, total, cols, 'ArrowUp'), 0)

  // Down near bottom clamps to total - 1
  assert.equal(computeGridNav(30, total, cols, 'ArrowDown'), 31)
})

test('quick reactions enforce maximum 3 entries', () => {
  const initial = ['😆', '👍']
  const addThird = [...initial, '❤️'].slice(0, 3)
  assert.deepEqual(addThird, ['😆', '👍', '❤️'])

  const addFourth = [...addThird, '🔥'].slice(0, 3)
  assert.deepEqual(addFourth, ['😆', '👍', '❤️'])
})
