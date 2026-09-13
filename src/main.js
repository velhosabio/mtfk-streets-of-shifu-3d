import * as THREE from 'three'
import './style.css'
import { paulistaRun } from './paulistaMap.js'

const SAVE_KEY = 'mtfk-streets-of-shifu-3d-save-v1'

const fighters = {
  shifu: {
    name: 'SHIFU',
    subtitle: 'Kung Fu / Boxe Sábio',
    color: 0xd6a46a,
    shorts: 0xffffff,
    speed: 7,
    maxHp: 100,
    maxSpecial: 100,
    attack: 12,
    specialText: 'Voadora sábia!'
  },
  kaiowzuz: {
    name: 'KAIOWZUZ',
    subtitle: 'Policial tático',
    color: 0x1d2b4f,
    shorts: 0x07090f,
    speed: 5.5,
    maxHp: 125,
    maxSpecial: 100,
    attack: 16,
    specialText: 'Tiro atordoante!'
  }
}

const burgerMenu = [
  { name: 'Gé Clássico', cost: 10, heal: 20 },
  { name: 'Gé Bacon', cost: 12, heal: 30 },
  { name: 'Tio Gé Supremo', cost: 15, heal: 50 },
  { name: 'Dolly', cost: 5, heal: 10 }
]

const kikoJuices = [
  'Limão: parece abacaxi, mas é tamarindo.',
  'Abacaxi: parece tamarindo, mas é limão.',
  'Tamarindo: parece limão, mas é abacaxi.'
]

const state = {
  screen: 'title',
  mode: 'offline',
  fighterKey: 'shifu',
  hp: 100,
  special: 25,
  dinheiro: 0,
  larica: 25,
  inventory: [],
  feedback: 'MTFK • Streets of SHIFU 3D',
  shop: null,
  paused: false
}

let scene, camera, renderer, player, tioGe, kiko, clock
let enemies = []
let keys = {}
let lastAttack = 0
let boostUntil = 0

const app = document.querySelector('#app')
app.innerHTML = `
  <canvas id="game"></canvas>
  <div id="hud" class="hud hidden"></div>
  <div id="overlay" class="overlay"></div>
  <div id="mobile" class="mobile hidden">
    <div class="pad">
      <button data-key="w">▲</button>
      <button data-key="a">◀</button>
      <button data-key="s">▼</button>
      <button data-key="d">▶</button>
    </div>
    <div class="actions">
      <button data-key=" ">Pular</button>
      <button data-key="j">Soco</button>
      <button data-key="k">Chute</button>
      <button data-key="l">Especial</button>
      <button data-key="e">Interagir</button>
    </div>
  </div>
`


createPaulistaBackdrop()


createPaulistaBackdrop()

function createPaulistaBackdrop() {
  const old = document.querySelector('.paulistaBackdrop')
  if (old) old.remove()

  const backdrop = document.createElement('div')
  backdrop.className = 'paulistaBackdrop'
  backdrop.innerHTML = `
    <div class="matrixRain"></div>
    <img id="paulistaArt" class="paulistaArt" src="/art/paulista-arcade.svg" alt="Avenida Paulista arcade" />
  `
  app.prepend(backdrop)
}

const canvas = document.querySelector('#game')
const hud = document.querySelector('#hud')
const overlay = document.querySelector('#overlay')
const mobile = document.querySelector('#mobile')

load()
showTitle()

function initThree() {
  scene = new THREE.Scene()
  scene.background = null
  scene.fog = new THREE.Fog(0x080914, 18, 55)

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 3.9, 12)
  camera.lookAt(0, -1.15, 0)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true

  clock = new THREE.Clock()

  const ambient = new THREE.HemisphereLight(0x6fb7ff, 0x14090d, 2.2)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
  keyLight.position.set(6, 10, 8)
  keyLight.castShadow = true
  scene.add(keyLight)

  createStage()
  createActors()
  window.addEventListener('resize', onResize)
}

function createStage() {
  const street = new THREE.Mesh(
    new THREE.BoxGeometry(150, 0.22, 11),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
  )
  street.position.y = -0.15
  street.receiveShadow = true
  scene.add(street)

  const sidewalkBack = new THREE.Mesh(
    new THREE.BoxGeometry(150, 0.1, 2.2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
  )
  sidewalkBack.position.set(0, 0, -5.4)
  scene.add(sidewalkBack)

  const sidewalkFront = sidewalkBack.clone()
  sidewalkFront.position.z = 5.4
  scene.add(sidewalkFront)

  for (let i = -70; i <= 70; i += 8) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.035, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf6e58d, emissive: 0x332800 })
    )
    line.visible = false
    line.position.set(i, 0.04, 0)
    scene.add(line)
  }

  for (let i = -68; i <= 68; i += 12) {
    const glow = new THREE.PointLight(i % 24 === 0 ? 0xff2638 : 0x39ff88, 1.8, 12)
    glow.position.set(i, 4.2, -3.8)
    scene.add(glow)
  }
}

function createActors() {
  const data = fighters[state.fighterKey]
  state.hp = Math.min(state.hp || data.maxHp, data.maxHp)

  player = createHumanoid(data)
  player.position.set(-22, -1.15, 0)
  scene.add(player)

  tioGe = createNpc(0xffb347, 'Tio Gé')
  tioGe.position.set(-4, -1.15, 2.2)
  scene.add(tioGe)

  kiko = createNpc(0x7cf7ff, 'Kiko')
  kiko.position.set(6, -1.15, 2.2)
  scene.add(kiko)

  for (let i = 0; i < 5; i++) {
    const enemy = createEnemy()
    enemy.position.set(8 + i * 5, -1.15, Math.random() * 4.4 - 2.2)
    enemy.userData.hp = 35
    enemies.push(enemy)
    scene.add(enemy)
  }
}

function createHumanoid(data) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.45), new THREE.MeshStandardMaterial({ color: data.color }))
  body.position.y = 0.7
  body.castShadow = true
  group.add(body)

  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.48), new THREE.MeshStandardMaterial({ color: data.shorts }))
  shorts.position.y = 0.1
  group.add(shorts)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 18), new THREE.MeshStandardMaterial({ color: 0xc98b5a }))
  head.position.y = 1.65
  group.add(head)

  group.scale.set(0.55, 0.55, 0.55)
  return group
}

function createEnemy() {
  const enemy = createHumanoid({ color: 0x35aa46, shorts: 0x111111 })
  enemy.scale.set(0.95, 0.95, 0.95)
  return enemy
}

function createNpc(color) {
  const npc = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1.7, 0.6), new THREE.MeshStandardMaterial({ color }))
  mesh.position.y = 0.8
  npc.add(mesh)
  return npc
}

function showTitle() {
  overlay.className = 'overlay matrixMenu'
  hud.classList.add('hidden')
  mobile.classList.add('hidden')
  overlay.innerHTML = `
    <div class="matrixPanel title">
      <div class="eyebrow">THE MTFK SYSTEM PRESENTS</div>
      <h1>STREETS OF<br>SHIFU 3D</h1>
      <p>Paulista noturna. Kung Fu, Diêro, Larica e memória arcade.</p>
      <button onclick="window.startSelect()">Entrar na Matrix MTFK</button>
    </div>
  `
}


window.startSelect = () => {
  state.screen = 'select'
  overlay.innerHTML = `
    <div class="panel">
      <h2>Selecionar Player</h2>
      <div class="grid">
        <button onclick="window.pickFighter('shifu')"><b>P1 SHIFU</b><span>baixo, atlético, Kung Fu/boxe sábio</span></button>
        <button onclick="window.pickFighter('kaiowzuz')"><b>P2 KAIOWZUZ</b><span>policial tático, pesado, tiro atordoante</span></button>
        <button disabled>P3 THAÍS REX<br><span>oculta por enquanto</span></button>
        <button disabled>P4<br><span>planejado</span></button>
      </div>
      <h2>Modo</h2>
      <div class="grid">
        <button onclick="window.setMode('offline')">Offline</button>
        <button onclick="window.setMode('online')">Online planejado</button>
      </div>
      <button onclick="window.beginGame()">Começar São Paulo</button>
    </div>
  `
}

window.pickFighter = key => {
  state.fighterKey = key
  state.feedback = `${fighters[key].name} selecionado`
  save()
}

window.setMode = mode => {
  state.mode = mode
  state.feedback = mode === 'online' ? 'Multiplayer online planejado para próxima fase' : 'Modo offline selecionado'
  save()
}

window.beginGame = () => {
  overlay.className = 'overlay hidden'
  hud.classList.remove('hidden')
  mobile.classList.remove('hidden')
  state.screen = 'game'
  initThree()
  animate()
}

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.033)
  update(dt)
  renderer.render(scene, camera)
  updateLabels()
}

function update(dt) {
  if (state.screen !== 'game' || state.shop || state.paused) return

  const data = fighters[state.fighterKey]
  const boosted = performance.now() < boostUntil
  const speed = data.speed * (boosted ? 1.55 : 1)

  const dx = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0)
  const dz = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0)

  player.position.x = THREE.MathUtils.clamp(player.position.x + dx * speed * dt, -68, 68)
  player.position.z = THREE.MathUtils.clamp(player.position.z + dz * speed * dt, -2.2, 2.2)

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x + 1.5, 0.12)
  camera.lookAt(player.position.x + 2, -1.15, 0)

  const backdrop = document.querySelector('.paulistaBackdrop')
  if (backdrop) backdrop.style.setProperty('--stage-scroll', `${-player.position.x * 45}px`)

  enemies.forEach(enemy => {
    if (enemy.userData.dead) return
    const dir = player.position.clone().sub(enemy.position)
    if (dir.length() < 12) {
      dir.normalize()
      enemy.position.x += dir.x * dt * 0.75
      enemy.position.z += dir.z * dt * 0.75
    }
    if (enemy.position.distanceTo(player.position) < 1.2) {
      state.hp = Math.max(0, state.hp - dt * 1.2)
    }
  })

  updateHud()
}

function attack(kind) {
  const now = performance.now()
  if (now - lastAttack < 300) return
  lastAttack = now

  const data = fighters[state.fighterKey]
  let damage = kind === 'kick' ? data.attack + 4 : data.attack
  if (kind === 'special') {
    if (state.special < 25) return feedback('Especial insuficiente')
    state.special -= 25
    damage = 45
    feedback(data.specialText)
  }

  enemies.forEach(enemy => {
    if (enemy.userData.dead) return
    if (enemy.position.distanceTo(player.position) < 2.2) {
      enemy.userData.hp -= damage
      enemy.position.x += 0.8
      if (enemy.userData.hp <= 0) {
        enemy.userData.dead = true
        enemy.visible = false
        state.dinheiro += 3
        state.larica += 2
        state.special = Math.min(100, state.special + 8)
        feedback('+3 Diêro, +2 Larica')
      }
    }
  })
  save()
}

function interact() {
  if (player.position.distanceTo(tioGe.position) < 2.4) return openBurger()
  if (player.position.distanceTo(kiko.position) < 2.4) return openKiko()
  feedback('Nada para interagir aqui')
}

function openBurger() {
  state.shop = 'burger'
  overlay.className = 'overlay'
  overlay.innerHTML = `
    <div class="matrixPanel shop">
      <h2>Tio Gé</h2>
      <p>“Vai querer qual, rapaz?”</p>
      <p>Larica: <b>${state.larica}</b></p>
      ${burgerMenu.map((item, i) => `<button onclick="window.buyBurger(${i})">${item.name} — ${item.cost} Laricas — +${item.heal} HP</button>`).join('')}
      <button onclick="window.closeShop()">Cancelar</button>
    </div>
  `
}

window.buyBurger = index => {
  const item = burgerMenu[index]
  const maxHp = fighters[state.fighterKey].maxHp
  if (state.larica < item.cost) return feedback('Larica insuficiente')
  if (state.hp >= maxHp) return feedback('HP já está cheio')
  state.larica -= item.cost
  state.hp = Math.min(maxHp, state.hp + item.heal)
  feedback(`${item.name}: +${item.heal} HP`)
  save()
  openBurger()
}

function openKiko() {
  state.shop = 'kiko'
  overlay.className = 'overlay'
  overlay.innerHTML = `
    <div class="matrixPanel shop">
      <h2>Sucos do Kiko</h2>
      <p>O conteúdo é suspeito! Você nunca sabe o que vai no suco.</p>
      <p>Todos custam 5 Laricas. Larica: <b>${state.larica}</b></p>
      ${kikoJuices.map((item, i) => `<button onclick="window.buyJuice(${i})">${item}</button>`).join('')}
      <button onclick="window.closeShop()">Cancelar</button>
    </div>
  `
}

window.buyJuice = index => {
  if (state.larica < 5) return feedback('Larica insuficiente')
  state.larica -= 5
  const maxHp = fighters[state.fighterKey].maxHp
  const effect = Math.floor(Math.random() * 6)

  if (effect === 0) feedback('Nada acontece. Suspeito.')
  if (effect === 1) { state.hp = Math.min(maxHp, state.hp + 20); feedback('Suco estranho: +20 HP') }
  if (effect === 2) { state.hp = maxHp; feedback('Suco lendário: vida cheia') }
  if (effect === 3) { state.special = Math.min(100, state.special + 35); feedback('Especial aumentou') }
  if (effect === 4) { state.special = 0; feedback('Perdeu todo o especial') }
  if (effect === 5) { boostUntil = performance.now() + 7000; feedback('Boost temporário!') }

  state.inventory.push(`Suco do Kiko #${index + 1}`)
  save()
  openKiko()
}

window.closeShop = () => {
  state.shop = null
  overlay.className = 'overlay hidden'
}

function toggleInventory() {
  if (state.shop) return window.closeShop()
  state.paused = !state.paused
  overlay.className = state.paused ? 'overlay' : 'overlay hidden'
  overlay.innerHTML = `
    <div class="matrixPanel shop">
      <h2>Inventário</h2>
      <p>Diêro: ${state.dinheiro} | Larica: ${state.larica}</p>
      <p>${state.inventory.length ? state.inventory.join('<br>') : 'Inventário vazio.'}</p>
      <button onclick="window.resumeGame()">Voltar</button>
    </div>
  `
}

window.resumeGame = () => {
  state.paused = false
  overlay.className = 'overlay hidden'
}

function feedback(text) {
  state.feedback = text
  updateHud()
}

function updateHud() {
  const data = fighters[state.fighterKey]
  hud.innerHTML = `
    <div><b>${data.name}</b> | ${state.mode.toUpperCase()}</div>
    <div>HP: ${Math.ceil(state.hp)}/${data.maxHp}</div>
    <div>Especial: ${Math.ceil(state.special)}/100</div>
    <div>Diêro: ${state.dinheiro} | Larica: ${state.larica}</div>
    <div>${state.feedback}</div>
  `
}

function updateLabels() {
  document.querySelectorAll('.worldLabel').forEach(label => {
    const vector = new THREE.Vector3(+label.dataset.x, +label.dataset.y, +label.dataset.z)
    vector.project(camera)
    label.style.left = `${(vector.x * 0.5 + 0.5) * window.innerWidth}px`
    label.style.top = `${(-vector.y * 0.5 + 0.5) * window.innerHeight}px`
  })
}

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    fighterKey: state.fighterKey,
    hp: state.hp,
    special: state.special,
    dinheiro: state.dinheiro,
    larica: state.larica,
    inventory: state.inventory
  }))
}

function load() {
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(SAVE_KEY)) || {})
  } catch {}
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('keydown', event => {
  keys[event.key] = true
  if (event.key === 'j') attack('punch')
  if (event.key === 'k') attack('kick')
  if (event.key === 'l') attack('special')
  if (event.key === 'e') interact()
  if (event.key === 'i') toggleInventory()
  if (event.key === 'Escape') state.shop ? window.closeShop() : window.resumeGame()
})

window.addEventListener('keyup', event => {
  keys[event.key] = false
})

document.querySelectorAll('[data-key]').forEach(button => {
  const key = button.dataset.key
  button.addEventListener('touchstart', event => {
    event.preventDefault()
    keys[key] = true
    if (key === 'j') attack('punch')
    if (key === 'k') attack('kick')
    if (key === 'l') attack('special')
    if (key === 'e') interact()
  })
  button.addEventListener('touchend', () => keys[key] = false)
})
