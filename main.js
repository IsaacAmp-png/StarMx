import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ==========================================================
// 1. MOTOR DE AUDIO
// ==========================================================
const song = new Audio('soniditos/song.mp3'); song.loop = true; song.volume = 0.4; 
const sfxMove = new Audio('soniditos/Move.mp3'); sfxMove.loop = true; sfxMove.volume = 0.6; 
const sfxAceptar = new Audio('soniditos/Aceptar.mp3');
const sfxHover = new Audio('soniditos/SobreBoton.mp3');
const sfxPerdiste = new Audio('soniditos/perdiste.mp3');
const sfxDano = new Audio('soniditos/DañoRecibido.mp3'); 

const sfxShuts = [
  new Audio('soniditos/shut.mp3'), new Audio('soniditos/shut(1).mp3'), new Audio('soniditos/Shut(2).mp3'),
  new Audio('soniditos/shut 1.mp3'), new Audio('soniditos/shut 1(1).mp3'), new Audio('soniditos/Shut 1(2).mp3')
];

// Arreglo de muertes (Enemigos explotando o tú muriendo)
const sfxMuertes = [
  new Audio('soniditos/muerte.mp3'), new Audio('soniditos/muerte2.mp3'), new Audio('soniditos/muerte3.mp3')
];

function playSfx(audioObj) {
  audioObj.currentTime = 0; audioObj.play().catch(e => {});
}
function playRandom(arr) {
  const sfx = arr[Math.floor(Math.random() * arr.length)];
  playSfx(sfx);
}

// ==========================================================
// 2. VARIABLES GLOBALES Y UI
// ==========================================================
let juegoIniciado = false;
let puntos = 0, salud = 100, vidas = 3;
let tiempoSupervivencia = 0, tiempoUltimoEnemigo = 0; 
let mouse = new THREE.Vector2(); // Para rastrear el apuntado

const menuInicio = document.getElementById('menuInicio');
const crawlContainer = document.getElementById('crawlContainer');
const briefingScreen = document.getElementById('briefingScreen');
const menuGameOver = document.getElementById('menuGameOver');
const hud = document.getElementById('hud');
const scoreTxt = document.getElementById('score');
const healthBar = document.getElementById('healthBar');
const vidasTxt = document.getElementById('lives');
const tiempoUI = document.getElementById('tiempoUI');
const crosshair = document.getElementById('crosshair');

// ==========================================================
// 3. SECUENCIAS CINEMÁTICAS
// ==========================================================
document.querySelectorAll('.boton').forEach(b => b.addEventListener('mouseenter', () => playSfx(sfxHover)));

document.getElementById('btnSalir').addEventListener('click', () => { window.location.href = "https://www.google.com"; });

document.getElementById('btnComenzar').addEventListener('click', () => {
  playSfx(sfxAceptar);
  menuInicio.style.display = 'none';
  crawlContainer.style.display = 'block';
  song.play();
  
  // La historia dura 15 segundos, luego pasa al Briefing
  window.historiaTimer = setTimeout(iniciarBriefing, 14000);
});

document.getElementById('btnOmitir').addEventListener('click', () => {
  playSfx(sfxAceptar);
  clearTimeout(window.historiaTimer);
  iniciarBriefing();
});

function iniciarBriefing() {
  crawlContainer.style.display = 'none';
  briefingScreen.style.display = 'flex';
  
  // Pantalla de misión por 3.5 segundos
  setTimeout(() => {
    briefingScreen.style.display = 'none';
    hud.style.display = 'block';
    document.body.style.cursor = 'none'; 
    juegoIniciado = true;
    
    // Spawn inicial agresivo (Más enemigos al empezar)
    for(let i=0; i<6; i++) spawnEnemigo();
  }, 3500);
}

document.getElementById('btnAceptarFin').addEventListener('click', () => {
  playSfx(sfxAceptar);
  setTimeout(() => { window.location.reload(); }, 400); 
});

// ==========================================================
// 4. MOTOR 3D Y LUCES
// ==========================================================
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x444455, 10, 80); scene.background = new THREE.Color(0x444455);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 10); 
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const clock = new THREE.Clock();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(3, 5, 2); directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -30; directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30; directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.camera.far = 100; scene.add(directionalLight);

// ==========================================================
// 5. ENTORNO Y MODELOS
// ==========================================================
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x004411, flatShading: true }));
suelo.rotation.x = -Math.PI / 2; suelo.position.y = -6; suelo.receiveShadow = true; scene.add(suelo);

const pista = new THREE.Mesh(new THREE.PlaneGeometry(12, 300), new THREE.MeshStandardMaterial({ color: 0x224466, flatShading: true }));
pista.rotation.x = -Math.PI / 2; pista.position.y = -5.9; pista.receiveShadow = true; scene.add(pista);

const edificios = [];
const edificioGeo = new THREE.BoxGeometry(3, 15, 3);
const edificioMat = new THREE.MeshStandardMaterial({ color: 0x888899, flatShading: true });
for(let i = 0; i < 20; i++) {
  const ed = new THREE.Mesh(edificioGeo, edificioMat);
  ed.position.set((Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 20), -2, -Math.random() * 100);
  ed.castShadow = true; ed.receiveShadow = true; scene.add(ed); edificios.push(ed);
}

const jugador = new THREE.Group();
const cuerpo = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 4), new THREE.MeshStandardMaterial({ color: 0x00ff00, flatShading: true }));
cuerpo.rotation.x = Math.PI / 2; cuerpo.castShadow = true; jugador.add(cuerpo);
const alas = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.5, 0, 0), new THREE.Vector3(2.5, 0, 0), new THREE.Vector3(0, 0, -1.5)]), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide }));
alas.castShadow = true; jugador.add(alas);
scene.add(jugador);

// ==========================================================
// 6. ENEMIGOS (IA DE EVASIÓN)
// ==========================================================
const enemigos = [];
const enemigoGeo = new THREE.ConeGeometry(1, 2.5, 4);
const enemigoMat = new THREE.MeshStandardMaterial({ color: 0x0033a0, flatShading: true }); 

function spawnEnemigo() {
  const enemigo = new THREE.Mesh(enemigoGeo, enemigoMat);
  enemigo.rotation.x = -Math.PI / 2;
  enemigo.position.set((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 12, -90);
  enemigo.castShadow = true;
  // Añadimos una semilla única a cada enemigo para que su movimiento sea diferente
  enemigo.userData.seed = Math.random() * 100;
  scene.add(enemigo); enemigos.push(enemigo);
}

// ==========================================================
// 7. SISTEMA DE APUNTADO Y DISPARO REAL 3D
// ==========================================================
const lasersJugador = [];
const lasersEnemigos = [];
const laserMXGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 8); 
laserMXGeo.rotateX(Math.PI / 2); // Vital para que lookAt funcione
const laserMXMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
const laserUSAGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 8); 
laserUSAGeo.rotateX(Math.PI / 2);
const laserUSAMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); 

window.addEventListener('mousedown', () => {
  if (!juegoIniciado) return;
  playRandom(sfxShuts);

  const laser = new THREE.Mesh(laserMXGeo, laserMXMat);
  laser.position.copy(jugador.position); 
  
  // MAGIA DEL APUNTADO: Convertimos el 2D del mouse a 3D
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const targetPoint = new THREE.Vector3();
  raycaster.ray.at(100, targetPoint); // Proyectamos un punto a 100 metros de distancia
  
  // Apuntamos el láser hacia ese punto y calculamos su dirección
  laser.lookAt(targetPoint);
  laser.userData.velocidad = new THREE.Vector3().subVectors(targetPoint, jugador.position).normalize();
  
  scene.add(laser); lasersJugador.push(laser);
});

function dispararEnemigo(naveEnemiga) {
  const laser = new THREE.Mesh(laserUSAGeo, laserUSAMat);
  laser.position.copy(naveEnemiga.position);
  // El enemigo te apunta directo a ti
  laser.lookAt(jugador.position);
  laser.userData.velocidad = new THREE.Vector3().subVectors(jugador.position, naveEnemiga.position).normalize();
  scene.add(laser); lasersEnemigos.push(laser);
}

// ==========================================================
// 8. CONTROLES Y RATÓN
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
  if (juegoIniciado) { 
    crosshair.style.left = e.clientX + 'px'; crosshair.style.top = e.clientY + 'px'; 
    // Normalizamos posición para el Raycaster (-1 a +1)
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
});

// ==========================================================
// 9. DAÑO Y SISTEMA DE MEDALLAS
// ==========================================================
function recibirDano() {
  if (!juegoIniciado) return;
  salud -= 15; healthBar.style.width = salud + '%';
  document.getElementById('damageOverlay').style.display = 'block';
  setTimeout(() => { document.getElementById('damageOverlay').style.display = 'none'; }, 150);

  if (salud <= 0) {
    vidas--; vidasTxt.innerText = "▲ x " + vidas;
    salud = 100; healthBar.style.width = '100%';
    
    if (vidas < 0) {
      juegoIniciado = false;
      song.pause(); sfxMove.pause(); 
      playRandom(sfxMuertes); // Muerte de tu nave
      playSfx(sfxPerdiste);
      document.body.style.cursor = 'default'; 
      
      const titulo = document.getElementById('tituloFinal');
      const medalla = document.getElementById('medallaTxt');
      
      document.getElementById('puntosFinalesTxt').innerText = "Puntos obtenidos: " + puntos;
      
      // LOGICA DE MEDALLAS
      if (puntos >= 3000) {
        titulo.innerText = "¡MISIÓN CUMPLIDA!"; titulo.style.color = "#00ff00";
        medalla.innerText = "🥇 MEDALLA DE ORO"; medalla.style.color = "#ffd700";
      } else if (puntos >= 2000) {
        titulo.innerText = "¡MISIÓN CUMPLIDA!"; titulo.style.color = "#00ff00";
        medalla.innerText = "🥈 MEDALLA DE PLATA"; medalla.style.color = "#c0c0c0";
      } else if (puntos >= 1000) {
        titulo.innerText = "¡MISIÓN CUMPLIDA!"; titulo.style.color = "#00ff00";
        medalla.innerText = "🥉 MEDALLA DE BRONCE"; medalla.style.color = "#cd7f32";
      } else {
        titulo.innerText = "M.I.A. (MISSING IN ACTION)"; titulo.style.color = "red";
        medalla.innerText = "Sin medalla"; medalla.style.color = "#888";
      }
      
      menuGameOver.style.display = 'flex'; 
    } else {
      playSfx(sfxDano); // Daño pero sigues vivo
    }
  } else {
    playSfx(sfxDano); // Impacto recibido
  }
}

// ==========================================================
// 10. BUCLE DE ANIMACIÓN
// ==========================================================
const velJugador = 12.0; let velMundo = 30.0;
const velLaserMX = 70.0, velLaserUSA = 40.0;

function animate() {
  requestAnimationFrame(animate);
  if (!juegoIniciado) { renderer.render(scene, camera); return; }

  const deltaTime = clock.getDelta();
  tiempoSupervivencia += deltaTime;

  const enMovimiento = teclas.w || teclas.a || teclas.s || teclas.d;
  if (enMovimiento && sfxMove.paused) sfxMove.play().catch(()=>{});
  else if (!enMovimiento && !sfxMove.paused) sfxMove.pause();

  const min = Math.floor(tiempoSupervivencia / 60), sec = Math.floor(tiempoSupervivencia % 60);
  tiempoUI.innerText = `Tiempo: ${min}:${sec.toString().padStart(2, '0')}`;

  // Dificultad ajustada para más enemigos
  let frecuenciaSpawn = 2.0, probDisparoEnemigo = 0.005; 
  if (tiempoSupervivencia > 30) { frecuenciaSpawn = 1.0; } 
  if (tiempoSupervivencia > 90) { frecuenciaSpawn = 0.6; probDisparoEnemigo = 0.01; velMundo = 40.0; }
  if (tiempoSupervivencia > 150) { frecuenciaSpawn = 0.3; probDisparoEnemigo = 0.03; velMundo = 60.0; tiempoUI.style.color = "#ff0000"; }

  if (tiempoSupervivencia - tiempoUltimoEnemigo > frecuenciaSpawn) { spawnEnemigo(); tiempoUltimoEnemigo = tiempoSupervivencia; }

  // Física Jugador
  if (teclas.a && jugador.position.x > -12) jugador.position.x -= velJugador * deltaTime;
  if (teclas.d && jugador.position.x < 12)  jugador.position.x += velJugador * deltaTime;
  if (teclas.w && jugador.position.y < 8)   jugador.position.y += velJugador * deltaTime;
  if (teclas.s && jugador.position.y > -3)  jugador.position.y -= velJugador * deltaTime;
  jugador.rotation.z = -jugador.position.x * 0.05;

  // Física Edificios
  for (let i = 0; i < edificios.length; i++) {
    edificios[i].position.z += velMundo * deltaTime;
    if (edificios[i].position.z > camera.position.z) {
      edificios[i].position.z = -100;
      edificios[i].position.x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 20);
    }
  }

  // Física Enemigos (Con Evasión)
  for (let i = enemigos.length - 1; i >= 0; i--) {
    enemigos[i].position.z += (velMundo * 0.6) * deltaTime;
    
    // IA DE MOVIMIENTO EVASIVO: Oscilación suave usando seno y su semilla única
    enemigos[i].position.x += Math.sin(tiempoSupervivencia * 2 + enemigos[i].userData.seed) * 3.0 * deltaTime;
    
    if (Math.random() < probDisparoEnemigo && enemigos[i].position.z < 0) dispararEnemigo(enemigos[i]);
    if (enemigos[i].position.z > camera.position.z) { scene.remove(enemigos[i]); enemigos.splice(i, 1); }
  }

  // Lásers Jugador (Viajan en la dirección calculada)
  for (let i = lasersJugador.length - 1; i >= 0; i--) {
    lasersJugador[i].position.add(lasersJugador[i].userData.velocidad.clone().multiplyScalar(velLaserMX * deltaTime));
    
    for (let j = enemigos.length - 1; j >= 0; j--) {
      if (lasersJugador[i] && lasersJugador[i].position.distanceTo(enemigos[j].position) < 3.0) {
        scene.remove(enemigos[j]); enemigos.splice(j, 1); 
        scene.remove(lasersJugador[i]); lasersJugador.splice(i, 1); 
        puntos += 50; // Más puntos por nave para alcanzar los 3000
        scoreTxt.innerText = puntos.toString().padStart(4, '0');
        playRandom(sfxMuertes); // Sonido de explosión enemiga
        document.getElementById('hitMarker').style.display = 'block'; setTimeout(() => { document.getElementById('hitMarker').style.display = 'none'; }, 100);
        break; 
      }
    }
    if (lasersJugador[i] && (lasersJugador[i].position.z < -120 || Math.abs(lasersJugador[i].position.x) > 50)) { scene.remove(lasersJugador[i]); lasersJugador.splice(i, 1); }
  }

  // Lásers Enemigos
  for (let i = lasersEnemigos.length - 1; i >= 0; i--) {
    lasersEnemigos[i].position.add(lasersEnemigos[i].userData.velocidad.clone().multiplyScalar(velLaserUSA * deltaTime));
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
  
