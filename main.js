
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ==========================================================
// 1. VARIABLES GLOBALES Y MENÚ
// ==========================================================
let juegoIniciado = false;
let enemigosDerribados = 0;

const menu = document.getElementById('menuInicio');
const marcador = document.getElementById('marcador');
const puntosTxt = document.getElementById('puntosTxt');

document.getElementById('btnPlay').addEventListener('click', () => {
  menu.style.display = 'none';
  marcador.style.display = 'block';
  juegoIniciado = true;
  console.log("¡Misión iniciada! Sistemas en línea.");
});

document.getElementById('btnSalir').addEventListener('click', () => {
  alert("Transmisión terminada.");
  window.location.reload();
});

// ==========================================================
// 2. ESCENA, CÁMARA Y RENDERIZADOR
// ==========================================================
const scene = new THREE.Scene();
// Niebla para dar ese look de N64 donde el fondo se desvanece
scene.fog = new THREE.Fog(0x000000, 10, 60); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Elevamos la cámara y la hacemos ligeramente hacia atrás
camera.position.set(0, 3, 10); 

const renderer = new THREE.WebGLRenderer({ antialias: false }); // Antialias false = Look retro garantizado
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// RELOJ PARA EL DELTA TIME
const clock = new THREE.Clock();

// ==========================================================
// 3. LUCES
// ==========================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// ==========================================================
// 4. JUGADOR (Nave Retro Triangular - Escuadrón MX)
// ==========================================================
const jugador = new THREE.Group();

// Fuselaje central (Cono)
const cuerpoGeo = new THREE.ConeGeometry(0.6, 2.5, 4);
const cuerpoMat = new THREE.MeshStandardMaterial({ color: 0x006847, flatShading: true }); // Verde México
const cuerpo = new THREE.Mesh(cuerpoGeo, cuerpoMat);
cuerpo.rotation.x = Math.PI / 2;
jugador.add(cuerpo);

// Alas triangulares
const alasGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-2, 0, 0), // Punta izquierda
  new THREE.Vector3(2, 0, 0),  // Punta derecha
  new THREE.Vector3(0, 0, -1.5) // Centro trasero
]);
const alasMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
const alas = new THREE.Mesh(alasGeo, alasMat);
jugador.add(alas);

scene.add(jugador);

// ==========================================================
// 5. ENEMIGO (Nave USA - Enemigo genérico)
// ==========================================================
const obstaculoGeo = new THREE.ConeGeometry(1, 2, 4);
const obstaculoMat = new THREE.MeshStandardMaterial({ color: 0x0033a0, flatShading: true }); // Azul
const obstaculo = new THREE.Mesh(obstaculoGeo, obstaculoMat);
obstaculo.rotation.x = -Math.PI / 2; // Apunta hacia nosotros

function reiniciarObstaculo() {
  obstaculo.position.z = -60; // Lo mandamos muy al fondo
  obstaculo.position.x = (Math.random() - 0.5) * 30; // Rango X aleatorio
  obstaculo.position.y = (Math.random() - 0.5) * 10; // Rango Y aleatorio
}
reiniciarObstaculo();
scene.add(obstaculo);

// ==========================================================
// 6. ENTORNO (Suelo Retro estilo cuadrícula)
// ==========================================================
// Esto ayuda muchísimo a dar la sensación de velocidad
const rejilla = new THREE.GridHelper(200, 100, 0x00ff00, 0x004400);
rejilla.position.y = -5;
scene.add(rejilla);

// ==========================================================
// 7. CONTROLES
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

// ==========================================================
// 8. BUCLE DE ANIMACIÓN (Game Loop)
// ==========================================================
const velJugador = 15.0;
const velObstaculo = 40.0;

function animate() {
  requestAnimationFrame(animate);

  if (!juegoIniciado) {
    renderer.render(scene, camera);
    return;
  }

  const deltaTime = clock.getDelta();

  // Movimiento del jugador con límites de pantalla
  if (teclas.a && jugador.position.x > -12) jugador.position.x -= velJugador * deltaTime;
  if (teclas.d && jugador.position.x < 12)  jugador.position.x += velJugador * deltaTime;
  if (teclas.w && jugador.position.y < 8)   jugador.position.y += velJugador * deltaTime;
  if (teclas.s && jugador.position.y > -3)  jugador.position.y -= velJugador * deltaTime;

  // ¡TRUCO RETRO! Inclinamos la nave visualmente al moverse a los lados
  jugador.rotation.z = -jugador.position.x * 0.05;

  // Animación del entorno (Movemos la rejilla hacia nosotros para simular velocidad)
  rejilla.position.z += velObstaculo * deltaTime;
  if (rejilla.position.z > 2) {
    rejilla.position.z = 0; // Se resetea suavemente
  }

  // Animación del enemigo
  obstaculo.position.z += velObstaculo * deltaTime;

  // Colisión (Jugador vs Obstáculo)
  const distancia = jugador.position.distanceTo(obstaculo.position);
  if (distancia < 2.5) {
    console.error("¡Impacto!");
    // Reseteamos el marcador al chocar
    enemigosDerribados = 0;
    puntosTxt.innerText = enemigosDerribados;
    reiniciarObstaculo();
    // Opcional: Podría agregar un efecto rojo a la pantalla aquí
  }

  // Esquivado / Pasó de largo (Simulamos que le ganamos o lo esquivamos)
  if (obstaculo.position.z > camera.position.z) {
    enemigosDerribados++;
    puntosTxt.innerText = enemigosDerribados;
    reiniciarObstaculo();
  }

  renderer.render(scene, camera);
}

animate();

// ==========================================================
// 9. AJUSTE DE PANTALLA
// ==========================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
  
