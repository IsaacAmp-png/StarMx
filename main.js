import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ==========================================================
// 1. MOTOR DE AUDIO (Nombres de archivos actualizados)
// ==========================================================
const song = new Audio('soniditos/song.mp3');
song.loop = true; song.volume = 0.4; 

const sfxMove = new Audio('soniditos/Move.mp3');
sfxMove.loop = true; sfxMove.volume = 0.6; 

const sfxAceptar = new Audio('soniditos/Aceptar.mp3');
const sfxHover = new Audio('soniditos/SobreBoton.mp3');
const sfxPerdiste = new Audio('soniditos/perdiste.mp3');

// Metimos todos los archivos que detectó la captura para mayor dinamismo
const sfxShuts = [
  new Audio('soniditos/shut.mp3'),
  new Audio('soniditos/shut(1).mp3'),
  new Audio('soniditos/Shut(2).mp3'),
  new Audio('soniditos/shut 1.mp3'),
  new Audio('soniditos/shut 1(1).mp3'),
  new Audio('soniditos/Shut 1(2).mp3')
];

function playSfx(audioObj) {
  audioObj.currentTime = 0; 
  audioObj.play().catch(e => console.log("Audio temporalmente bloqueado."));
}

// ==========================================================
// 2. VARIABLES DE ESTADO Y UI
// ==========================================================
let juegoIniciado = false;
let puntos = 0, salud = 100, vidas = 3;
let tiempoSupervivencia = 0, tiempoUltimoEnemigo = 0; 

const menuInicio = document.getElementById('menuInicio');
const menuGameOver = document.getElementById('menuGameOver');
const hud = document.getElementById('hud');
const scoreTxt = document.getElementById('score');
const healthBar = document.getElementById('healthBar');
const vidasTxt = document.getElementById('lives');
const tiempoUI = document.getElementById('tiempoUI');
const hitMarker = document.getElementById('hitMarker');
const damageOverlay = document.getElementById('damageOverlay');
const crosshair = document.getElementById('crosshair');

// ==========================================================
// 3. EVENTOS DE MENÚ
// ==========================================================
document.querySelectorAll('.boton').forEach(boton => {
  boton.addEventListener('mouseenter', () => playSfx(sfxHover));
});

document.getElementById('btnPlay').addEventListener('click', () => {
  playSfx(sfxAceptar);
  song.play(); 
  menuInicio.style.display = 'none';
  hud.style.display = 'block';
  document.body.style.cursor = 'none'; 
  juegoIniciado = true;
});

document.getElementById('btnAceptarFin').addEventListener('click', () => {
  playSfx(sfxAceptar);
  setTimeout(() => { window.location.reload(); }, 400); 
});

// ==========================================================
// 4. ESCENA, CÁMARA Y RENDERIZADOR (CON SOMBRAS)
// ==========================================================
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x444455, 10, 80); 
scene.background = new THREE.Color(0x444455);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 10); 

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// ==========================================================
// 5. LUCES Y SOMBRAS
// ==========================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); 
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(3, 5, 2);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.camera.far = 100;
scene.add(directionalLight);

// ==========================================================
// 6. ENTORNO
// ==========================================================
const sueloGeo = new THREE.PlaneGeometry(300, 300);
const sueloMat = new THREE.MeshStandardMaterial({ color: 0x004411, flatShading: true });
const suelo = new THREE.Mesh(sueloGeo, sueloMat);
suelo.rotation.x = -Math.PI / 2; suelo.position.y = -6; 
suelo.receiveShadow = true; 
scene.add(suelo);

const pistaGeo = new THREE.PlaneGeometry(12, 300);
const pistaMat = new THREE.MeshStandardMaterial({ color: 0x224466, flatShading: true });
const pista = new THREE.Mesh(pistaGeo, pistaMat);
pista.rotation.x = -Math.PI / 2; pista.position.y = -5.9; 
pista.receiveShadow = true; 
scene.add(pista);

const edificios = [];
const edificioGeo = new THREE.BoxGeometry(3, 15, 3);
const edificioMat = new THREE.MeshStandardMaterial({ color: 0x888899, flatShading: true });
for(let i = 0; i < 15; i++) {
  const ed = new THREE.Mesh(edificioGeo, edificioMat);
  const lado = Math.random() > 0.5 ? 1 : -1;
  ed.position.set(lado * (10 + Math.random() * 20), -2, -Math.random() * 100);
  ed.castShadow = true; ed.receiveShadow = true;  
  scene.add(ed); edificios.push(ed);
}

// ==========================================================
// 7. JUGADOR Y ENEMIGOS
// ==========================================================
const jugador = new THREE.Group();
const cuerpoGeo = new THREE.ConeGeometry(0.8, 3, 4);
const cuerpoMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, flatShading: true }); 
const cuerpo = new THREE.Mesh(cuerpoGeo, cuerpoMat);
cuerpo.rotation.x = Math.PI / 2; cuerpo.castShadow = true; jugador.add(cuerpo);

const alasGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-2.5, 0, 0), new THREE.Vector3(2.5, 0, 0), new THREE.Vector3(0, 0, -1.5)
]);
const alasMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
const alas = new THREE.Mesh(alasGeo, alasMat); 
alas.castShadow = true; jugador.add(alas);
scene.add(jugador);

const enemigos = [];
const enemigoGeo = new THREE.ConeGeometry(1, 2.5, 4);
const enemigoMat = new THREE.MeshStandardMaterial({ color: 0x0033a0, flatShading: true }); 

function spawnEnemigo() {
  const enemigo = new THREE.Mesh(enemigoGeo, enemigoMat);
  enemigo.rotation.x = -Math.PI / 2;
  enemigo.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -90);
  enemigo.castShadow = true;
  scene.add(enemigo); enemigos.push(enemigo);
}

// ==========================================================
// 8. ARSENAL DE DISPARO
// ==========================================================
const lasersJugador = [];
const lasersEnemigos = [];
const laserMXGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 8);
const laserMXMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
const laserUSAGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 8);
const laserUSAMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); 

window.addEventListener('mousedown', () => {
  if (!juegoIniciado) return;
  const randomShut = sfxShuts[Math.floor(Math.random() * sfxShuts.length)];
  playSfx(randomShut);

  const laser = new THREE.Mesh(laserMXGeo, laserMXMat);
  laser.rotation.x = Math.PI / 2; laser.position.copy(jugador.position); 
  scene.add(laser); lasersJugador.push(laser);
});

function dispararEnemigo(naveEnemiga) {
  const laser = new THREE.Mesh(laserUSAGeo, laserUSAMat);
  laser.rotation.x = Math.PI / 2; laser.position.copy(naveEnemiga.position);
  scene.add(laser); lasersEnemigos.push(laser);
}

// ==========================================================
// 9. CONTROLES DE VUELO Y RATÓN
// ==========================================================
const teclas = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'A') teclas.a = true;
  if (e.key === 'd' || e.key === 'D') teclas.d = true;
  if (e.key === 'w' || e.key === 'W') teclas.w = true;
  if (e.key === 's' || e.key === 'S') teclas.s = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'a' || e.key === 'A') teclas.a = false;
  if (e.key === 'd' || e.key === 'D') teclas.d = false;
  if (e.key === 'w' || e.key === 'W') teclas.w = false;
  if (e.key === 's' || e.key === 'S') teclas.s = false;
});
window.addEventListener('mousemove', (e) => {
  if (juegoIniciado) { crosshair.style.left = e.clientX + 'px'; crosshair.style.top = e.clientY + 'px'; }
});

// ==========================================================
// 10. DAÑO Y GAME OVER
// ==========================================================
function recibirDano() {
  if (!juegoIniciado) return;
  salud -= 15; healthBar.style.width = salud + '%';
  damageOverlay.style.display = 'block';
  setTimeout(() => { damageOverlay.style.display = 'none'; }, 150);

  if (salud <= 0) {
    vidas--; vidasTxt.innerText = "▲ x " + vidas;
    salud = 100; healthBar.style.width = '100%';
    
    if (vidas < 0) {
      juegoIniciado = false;
      song.pause(); sfxMove.pause(); playSfx(sfxPerdiste); 
      document.body.style.cursor = 'default'; 
      document.getElementById('puntosFinalesTxt').innerText = "Puntos obtenidos: " + puntos;
      menuGameOver.style.display = 'flex'; 
    }
  }
}

// ==========================================================
// 11. BUCLE DE ANIMACIÓN
// ==========================================================
const velJugador = 12.0; 
let velMundo = 30.0;
const velLaserMX = 60.0, velLaserUSA = 40.0;

function animate() {
  requestAnimationFrame(animate);
  if (!juegoIniciado) { renderer.render(scene, camera); return; }

  const deltaTime = clock.getDelta();
  tiempoSupervivencia += deltaTime;

  // Motores Direccionales (Move.mp3)
  const enMovimiento = teclas.w || teclas.a || teclas.s || teclas.d;
  if (enMovimiento && sfxMove.paused) sfxMove.play().catch(() => {});
  else if (!enMovimiento && !sfxMove.paused) sfxMove.pause();

  // Reloj
  const min = Math.floor(tiempoSupervivencia / 60), sec = Math.floor(tiempoSupervivencia % 60);
  tiempoUI.innerText = `Tiempo: ${min}:${sec.toString().padStart(2, '0')}`;

  // Dificultad
  let frecuenciaSpawn = 3.0, probDisparoEnemigo = 0.005; 
  if (tiempoSupervivencia > 30) { frecuenciaSpawn = 2.0; } 
  if (tiempoSupervivencia > 90) { frecuenciaSpawn = 1.0; probDisparoEnemigo = 0.01; velMundo = 40.0; }
  if (tiempoSupervivencia > 150) { frecuenciaSpawn = 0.4; probDisparoEnemigo = 0.03; velMundo = 60.0; tiempoUI.style.color = "#ff0000"; }

  if (tiempoSupervivencia - tiempoUltimoEnemigo > frecuenciaSpawn) { spawnEnemigo(); tiempoUltimoEnemigo = tiempoSupervivencia; }

  // Física Jugador
  if (teclas.a && jugador.position.x > -12) jugador.position.x -= velJugador * deltaTime;
  if (teclas.d && jugador.position.x < 12)  jugador.position.x += velJugador * deltaTime;
  if (teclas.w && jugador.position.y < 8)   jugador.position.y += velJugador * deltaTime;
  if (teclas.s && jugador.position.y > -3)  jugador.position.y -= velJugador * deltaTime;
  jugador.rotation.z = -jugador.position.x * 0.05;

  // Física Entorno
  for (let i = 0; i < edificios.length; i++) {
    edificios[i].position.z += velMundo * deltaTime;
    if (edificios[i].position.z > camera.position.z) {
      edificios[i].position.z = -100;
      edificios[i].position.x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 20);
    }
  }

  // Física Enemigos
  for (let i = enemigos.length - 1; i >= 0; i--) {
    enemigos[i].position.z += (velMundo * 0.6) * deltaTime;
    if (Math.random() < probDisparoEnemigo && enemigos[i].position.z < 0) dispararEnemigo(enemigos[i]);
    if (enemigos[i].position.z > camera.position.z) { scene.remove(enemigos[i]); enemigos.splice(i, 1); }
  }

  // Colisiones Jugador -> Enemigo
  for (let i = lasersJugador.length - 1; i >= 0; i--) {
    lasersJugador[i].position.z -= velLaserMX * deltaTime;
    for (let j = enemigos.length - 1; j >= 0; j--) {
      if (lasersJugador[i] && lasersJugador[i].position.distanceTo(enemigos[j].position) < 2.5) {
        scene.remove(enemigos[j]); enemigos.splice(j, 1); 
        scene.remove(lasersJugador[i]); lasersJugador.splice(i, 1); 
        puntos += 10; scoreTxt.innerText = puntos.toString().padStart(3, '0');
        hitMarker.style.display = 'block'; setTimeout(() => { hitMarker.style.display = 'none'; }, 100);
        break; 
      }
    }
    if (lasersJugador[i] && lasersJugador[i].position.z < -100) { scene.remove(lasersJugador[i]); lasersJugador.splice(i, 1); }
  }

  // Colisiones Enemigo -> Jugador
  for (let i = lasersEnemigos.length - 1; i >= 0; i--) {
    lasersEnemigos[i].position.z += velLaserUSA * deltaTime; 
    if (lasersEnemigos[i].position.distanceTo(jugador.position) < 2.0) {
      recibirDano(); scene.remove(lasersEnemigos[i]); lasersEnemigos.splice(i, 1); continue;
    }
    if (lasersEnemigos[i].position.z > camera.position.z) { scene.remove(lasersEnemigos[i]); lasersEnemigos.splice(i, 1); }
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
  
