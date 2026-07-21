import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ==========================================================
// 1. VARIABLES GLOBALES Y MENÚ
// ==========================================================
let juegoIniciado = false;
let puntos = 0;

const menu = document.getElementById('menuInicio');
const hud = document.getElementById('hud');
const btnDispararUI = document.getElementById('btnDisparar');
const scoreTxt = document.getElementById('score');
const hitMarker = document.getElementById('hitMarker');

document.getElementById('btnPlay').addEventListener('click', () => {
  menu.style.display = 'none';
  hud.style.display = 'block';
  btnDispararUI.style.display = 'block';
  juegoIniciado = true;
});

// ==========================================================
// 2. ESCENA, CÁMARA Y RENDERIZADOR
// ==========================================================
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x444455, 10, 80); // Niebla grisácea/azulada como en N64
scene.background = new THREE.Color(0x444455);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 10); 

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// ==========================================================
// 3. LUCES
// ==========================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// ==========================================================
// 4. ENTORNO (Suelo, Camino y Edificios)
// ==========================================================
// Suelo verde principal
const sueloGeo = new THREE.PlaneGeometry(300, 300);
const sueloMat = new THREE.MeshStandardMaterial({ color: 0x004411, flatShading: true });
const suelo = new THREE.Mesh(sueloGeo, sueloMat);
suelo.rotation.x = -Math.PI / 2;
suelo.position.y = -6;
scene.add(suelo);

// Pista/Ruta central (Azul/Grisácea)
const pistaGeo = new THREE.PlaneGeometry(12, 300);
const pistaMat = new THREE.MeshStandardMaterial({ color: 0x224466, flatShading: true });
const pista = new THREE.Mesh(pistaGeo, pistaMat);
pista.rotation.x = -Math.PI / 2;
pista.position.y = -5.9; // Un poco arriba del suelo
scene.add(pista);

// Generación de edificios grises a los lados
const edificios = [];
const edificioGeo = new THREE.BoxGeometry(3, 15, 3);
const edificioMat = new THREE.MeshStandardMaterial({ color: 0x888899, flatShading: true });

for(let i = 0; i < 15; i++) {
  const ed = new THREE.Mesh(edificioGeo, edificioMat);
  // Posiciones aleatorias a la izquierda o derecha del camino
  const lado = Math.random() > 0.5 ? 1 : -1;
  ed.position.set(lado * (10 + Math.random() * 20), -2, -Math.random() * 100);
  scene.add(ed);
  edificios.push(ed);
}

// ==========================================================
// 5. JUGADOR (Escuadrón MX - Nave Verde)
// ==========================================================
const jugador = new THREE.Group();

const cuerpoGeo = new THREE.ConeGeometry(0.8, 3, 4);
const cuerpoMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, flatShading: true }); // Verde brillante
const cuerpo = new THREE.Mesh(cuerpoGeo, cuerpoMat);
cuerpo.rotation.x = Math.PI / 2;
jugador.add(cuerpo);

const alasGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-2.5, 0, 0), new THREE.Vector3(2.5, 0, 0), new THREE.Vector3(0, 0, -1.5)
]);
const alasMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
const alas = new THREE.Mesh(alasGeo, alasMat);
jugador.add(alas);

scene.add(jugador);

// ==========================================================
// 6. ENEMIGOS (Escuadrón Rojo)
// ==========================================================
const enemigos = [];
const enemigoGeo = new THREE.ConeGeometry(1, 2.5, 4);
const enemigoMat = new THREE.MeshStandardMaterial({ color: 0xff0000, flatShading: true }); // Rojo agresivo

function crearEnemigo() {
  const enemigo = new THREE.Mesh(enemigoGeo, enemigoMat);
  enemigo.rotation.x = -Math.PI / 2;
  enemigo.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -80);
  scene.add(enemigo);
  enemigos.push(enemigo);
}
// Creamos 3 enemigos iniciales
for(let i=0; i<3; i++) crearEnemigo();

// ==========================================================
// 7. SISTEMA DE DISPARO (Lásers)
// ==========================================================
const lasers = [];
const laserGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Láser color cyan (N64 clásico)

function disparar() {
  if (!juegoIniciado) return;
  const laser = new THREE.Mesh(laserGeo, laserMat);
  laser.rotation.x = Math.PI / 2;
  // El láser sale de la posición actual de nuestra nave
  laser.position.copy(jugador.position); 
  scene.add(laser);
  lasers.push(laser);
}

// Escuchamos el botón en pantalla y la barra espaciadora
btnDispararUI.addEventListener('touchstart', (e) => { e.preventDefault(); disparar(); });
btnDispararUI.addEventListener('mousedown', disparar);

// ==========================================================
// 8. CONTROLES Y TECLADO
// ==========================================================
const teclas = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'A') teclas.a = true;
  if (e.key === 'd' || e.key === 'D') teclas.d = true;
  if (e.key === 'w' || e.key === 'W') teclas.w = true;
  if (e.key === 's' || e.key === 'S') teclas.s = true;
  if (e.key === ' ') disparar(); // Disparar con espacio
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'a' || e.key === 'A') teclas.a = false;
  if (e.key === 'd' || e.key === 'D') teclas.d = false;
  if (e.key === 'w' || e.key === 'W') teclas.w = false;
  if (e.key === 's' || e.key === 'S') teclas.s = false;
});

// ==========================================================
// 9. BUCLE DE ANIMACIÓN (Game Loop)
// ==========================================================
const velJugador = 18.0;
const velMundo = 50.0;
const velLaser = 80.0;

function animate() {
  requestAnimationFrame(animate);
  if (!juegoIniciado) { renderer.render(scene, camera); return; }

  const deltaTime = clock.getDelta();

  // Movimiento del jugador
  if (teclas.a && jugador.position.x > -12) jugador.position.x -= velJugador * deltaTime;
  if (teclas.d && jugador.position.x < 12)  jugador.position.x += velJugador * deltaTime;
  if (teclas.w && jugador.position.y < 8)   jugador.position.y += velJugador * deltaTime;
  if (teclas.s && jugador.position.y > -3)  jugador.position.y -= velJugador * deltaTime;
  jugador.rotation.z = -jugador.position.x * 0.05;

  // Animación del entorno (Movemos los edificios hacia nosotros)
  for (let i = 0; i < edificios.length; i++) {
    edificios[i].position.z += velMundo * deltaTime;
    // Si el edificio pasa la cámara, lo mandamos al fondo de nuevo
    if (edificios[i].position.z > camera.position.z) {
      edificios[i].position.z = -100;
      edificios[i].position.x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 20);
    }
  }

  // Mover enemigos hacia nosotros
  for (let i = 0; i < enemigos.length; i++) {
    enemigos[i].position.z += (velMundo * 0.6) * deltaTime;
    if (enemigos[i].position.z > camera.position.z) {
      enemigos[i].position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -80);
    }
  }

  // Mover lásers y checar colisiones
  for (let i = lasers.length - 1; i >= 0; i--) {
    lasers[i].position.z -= velLaser * deltaTime;

    // Checar si el láser le dio a algún enemigo
    for (let j = 0; j < enemigos.length; j++) {
      if (lasers[i] && lasers[i].position.distanceTo(enemigos[j].position) < 2.5) {
        // ¡Impacto!
        enemigos[j].position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -80); // Resetea enemigo
        
        // Destruir láser
        scene.remove(lasers[i]);
        lasers.splice(i, 1);
        
        // Actualizar HUD
        puntos += 10;
        // Rellenar con ceros (ej. 010, 020)
        scoreTxt.innerText = puntos.toString().padStart(3, '0');
        
        // Mostrar texto en pantalla rápido
        hitMarker.style.display = 'block';
        setTimeout(() => { hitMarker.style.display = 'none'; }, 200);
        break; // Rompe el ciclo del enemigo para este láser
      }
    }

    // Borrar lásers que se fueron muy lejos para no saturar la memoria
    if (lasers[i] && lasers[i].position.z < -100) {
      scene.remove(lasers[i]);
      lasers.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}
animate();

// Ajuste de pantalla
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
