import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import CameraControls from "camera-controls";

CameraControls.install({ THREE });
const points = Array.from(document.querySelector(".points").children);

const loaderBtn = document.querySelector(".loader-btn");

const manager = new THREE.LoadingManager();
manager.onLoad = () => {
  console.log("loaded");
  document.querySelector(".loading-text").style.display = "none";
  loaderBtn.style.display = "block";
};

loaderBtn.addEventListener("click", () => {
  document.querySelector(".loader").style.display = "none";
  document.querySelector(".points").style.display = "block";
});

let currentPos = "top";

const leather1 = document.getElementById("leather1");
const leather2 = document.getElementById("leather2");

const leatherWrapper = document.querySelector(".material-view-wrapper");

const clock = new THREE.Clock();

let animating = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// camera.position.set(-6.415, 1.4, -0.255);
camera.position.set(0, 35, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.CineonToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new CameraControls(camera, renderer.domElement);
const cameraPosition = controls.camera.position.clone();
const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
  controls.camera.quaternion
);
const newTarget = cameraPosition.clone().add(forward.multiplyScalar(0.1));
controls.setTarget(newTarget.x, newTarget.y, newTarget.z, true);

const fps = {
  moveSpeed: 0.07,
  lookSpeed: 0.002,
  enabled: false,
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  moveUp: false,
  moveDown: false,
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  rotation: new THREE.Euler(0, 0, 0, "YXZ"),
  mouseMoved: false,
  prevMouseX: 0,
  prevMouseY: 0,
};

const lockPointer = () => {
  document.body.requestPointerLock =
    document.body.requestPointerLock ||
    document.body.mozRequestPointerLock ||
    document.body.webkitRequestPointerLock;
  document.body.requestPointerLock();
};

// document.addEventListener("click", () => {
//   console.log(camera.position);
//   if (!fps.enabled) {
//     lockPointer();
//     return;
//   }
//   controls.enabled = false;
//   moveToStartPoint();
//   pathAnimation.play();
// });

let hdrMap = null;

new RGBELoader().load("/assets/studio.hdr", function (texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;

  hdrMap = texture;
  scene.environment = texture;
  // scene.background = texture;
});

const positions = {
  top: new THREE.Vector3(0, 35, 0),
  hall: new THREE.Vector3(-6.415, 1.4, -0.255),
  pool: new THREE.Vector3(-3.37, 1.4, -5.77),
  kitchen: new THREE.Vector3(-2.23, 1.4, 1.72),
  ka: new THREE.Vector3(-6.78, 1.4, 3.15),
  kb: new THREE.Vector3(-2.23, 1.4, 4.15),
  upperHall: new THREE.Vector3(1.14, 4.36, 1.88),
  uha: new THREE.Vector3(2.5, 1.4, -1),
  uhb: new THREE.Vector3(2.58, 2.68, -2.5),
  uhc: new THREE.Vector3(1.02, 3.34, -2.5),
  uhd: new THREE.Vector3(1.1, 4.0, -0.35),
  upperBed: new THREE.Vector3(3.9, 4.0, 2.23),
};

const roomConnections = {
  top: ["pool"],
  hall: ["ka", "pool", "uha"],
  kitchen: ["kb"],
  pool: ["hall"],
  upperHall: ["upperBed", "uhd"],
  upperBed: ["upperHall"],
  ka: ["kb", "hall"],
  kb: ["ka", "kitchen"],
  uha: ["uhb", "hall"],
  uhb: ["uhc", "uha"],
  uhc: ["uhd", "uhb"],
  uhd: ["upperHall", "uhc"],
};

function findShortestPath(graph, start, end) {
  if (start === end) return [start];

  let queue = [[start]];
  let visited = new Set();

  while (queue.length > 0) {
    let path = queue.shift();
    let node = path[path.length - 1];

    if (visited.has(node)) continue;
    visited.add(node);

    for (let neighbor of graph[node] || []) {
      let newPath = [...path, neighbor];

      if (neighbor === end) return newPath;

      queue.push(newPath);
    }
  }
  return null;
}

console.log(findShortestPath(roomConnections, "kitchen", "upperBed"));

let curve = null;

function createCurve(journeyArr) {
  console.log(journeyArr);
  curve = new THREE.CatmullRomCurve3(journeyArr);
  pathAnimation.restart();
}

const _tmp = new THREE.Vector3();
const animationProgress = { value: 0 };

const pathAnimation = gsap.fromTo(
  animationProgress,
  {
    value: 0,
  },
  {
    value: 1,
    duration: 5,
    overwrite: true,
    paused: true,

    onUpdateParams: [animationProgress],
    onUpdate({ value }) {
      if (!this.isActive()) return;

      curve.getPoint(value, _tmp);
      const cameraX = _tmp.x;
      const cameraY = _tmp.y;
      const cameraZ = _tmp.z;

      controls.moveTo(cameraX, cameraY, cameraZ, false);
      curve.getPoint(Math.min(value + 0.05, 1), _tmp);
      controls.setLookAt(
        cameraX,
        cameraY,
        cameraZ,
        _tmp.x,
        _tmp.y,
        _tmp.z,
        true
      );
    },

    onStart() {
      // controls.enabled = false;
    },

    onComplete() {
      controls.enabled = true;
      const cameraPosition = controls.camera.position.clone();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        controls.camera.quaternion
      );
      const newTarget = cameraPosition.clone().add(forward.multiplyScalar(0.5));
      controls.setTarget(newTarget.x, newTarget.y, newTarget.z, true);
    },
  }
);

document.addEventListener("pointerlockchange", pointerLockChange, false);
document.addEventListener("mozpointerlockchange", pointerLockChange, false);
document.addEventListener("webkitpointerlockchange", pointerLockChange, false);

function pointerLockChange() {
  if (
    document.pointerLockElement === document.body ||
    document.mozPointerLockElement === document.body ||
    document.webkitPointerLockElement === document.body
  ) {
    fps.enabled = true;
  } else {
    fps.enabled = false;
  }
}

const dracoLoader = new DRACOLoader();

dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
);

dracoLoader.setDecoderConfig({ type: "js" });

const loader = new GLTFLoader(manager);
loader.setDRACOLoader(dracoLoader);

const fans = [];
let sofa = null;

loader.load("/assets/home_interior.glb", function (gltf) {
  const model = gltf.scene;

  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;

      // Convert material to MeshStandardMaterial
      if (object.material) {
        const oldMaterial = object.material;

        // Create a new standard material
        const newMaterial = new THREE.MeshStandardMaterial({
          map: oldMaterial.map, // Copy the texture map if it exists
          color: oldMaterial.color ? oldMaterial.color : 0xffffff,
          roughness: 0.7,
          metalness: 0.1,
        });

        if (
          oldMaterial.transparent ||
          (oldMaterial.map &&
            oldMaterial.map.image &&
            oldMaterial.map.image.hasAlpha)
        ) {
          // newMaterial.transparent = true;
          newMaterial.alphaTest = 0.2; // Adjust this value as needed (0.0-1.0)
          newMaterial.side = THREE.DoubleSide; // Often needed for transparent objects
        }

        // Copy over any other textures that might exist
        if (oldMaterial.normalMap)
          newMaterial.normalMap = oldMaterial.normalMap;
        if (oldMaterial.aoMap) newMaterial.aoMap = oldMaterial.aoMap;
        if (oldMaterial.roughnessMap)
          newMaterial.roughnessMap = oldMaterial.roughnessMap;
        if (oldMaterial.metalnessMap)
          newMaterial.metalnessMap = oldMaterial.metalnessMap;
        if (oldMaterial.emissiveMap) {
          newMaterial.emissiveMap = oldMaterial.emissiveMap;
          newMaterial.emissive =
            oldMaterial.emissive || new THREE.Color(0xffffff);
          newMaterial.emissiveIntensity = oldMaterial.emissiveIntensity || 1.0;
          newMaterial.envMap = hdrMap;
          newMaterial.envMapIntensity = 1.2;
        }

        // Replace the material
        object.material = newMaterial;
        // console.log(object.name)
        if (object.name === "Material-doors_windows_trans") {
          // Create a glass-like material
          const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.4,
            roughness: 0.05,
            transmission: 0.95, // High transmission for transparency
            transparent: true,
            opacity: 0.5,
            reflectivity: 1.0,
            // envMap: hdrMap,
            // envMapIntensity: .8,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            ior: 1.5, // Similar to real glass
            side: THREE.DoubleSide, // Render both sides
          });

          // Apply the glass material
          object.material = glassMaterial;
        } else if (object.name === "Material-light_pendants_trans") {
          // Create a glass-like material
          const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.6,
            roughness: 0.05,
            transmission: 0.95, // High transmission for transparency
            transparent: true,
            opacity: 0.5,
            reflectivity: 0.5,
            // envMap: hdrMap,
            // envMapIntensity: .6,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            ior: 1.5, // Similar to real glass
            side: THREE.DoubleSide, // Render both sides
          });

          // Apply the glass material
          object.material = glassMaterial;
        } else if (object.name === "bulb") {
          // Create a glass-like material
          const lightBulbMaterial = new THREE.MeshStandardMaterial({
            color: 0xfcfcf0, // Slightly off-white base color
            metalness: 0.8,
            roughness: 0.2, // Slightly glossy

            // Strong emissive properties for the glow
            emissive: 0xffffcc, // Warm white light color
            emissiveIntensity: 8.0, // Very bright emission
          });

          // Apply the light bulb material
          object.material = lightBulbMaterial;
        } else if (object.name.includes("fanBlade")) {
          fans.push(object);
        } else if (object.name.includes("Sofa")) {
          sofa = object;
          direction.lookAt(sofa.position);
        }
      }
    }
  });

  scene.add(model);
});

function spinFan() {
  if (fans.length > 0) {
    fans.forEach((fan) => {
      fan.rotation.y += 0.1;
    });
  }
}

const leatherMat1 = new THREE.MeshPhysicalMaterial();
const leatherMat2 = new THREE.MeshPhysicalMaterial();

function loadTextures() {
  const textureLoader = new THREE.TextureLoader();

  const color = textureLoader.load("/assets/leather1/color.jpg");
  color.wrapS = THREE.RepeatWrapping;
  color.wrapT = THREE.RepeatWrapping;
  color.repeat.set(10, 10);

  const nrml = textureLoader.load("/assets/leather1/nrml.jpg");
  nrml.wrapS = THREE.RepeatWrapping;
  nrml.wrapT = THREE.RepeatWrapping;
  nrml.repeat.set(10, 10);

  const rough = textureLoader.load("/assets/leather1/rough.jpg");
  rough.wrapS = THREE.RepeatWrapping;
  rough.wrapT = THREE.RepeatWrapping;
  rough.repeat.set(10, 10);

  leatherMat1.map = color;
  leatherMat1.normalMap = nrml;
  // leatherMat1.displacementMap = textureLoader.load("/assets/leather1/disp.jpg")
  leatherMat1.roughnessMap = rough;

  const color2 = textureLoader.load("/assets/leather2/color.jpg");
  color2.wrapS = THREE.RepeatWrapping;
  color2.wrapT = THREE.RepeatWrapping;
  color2.repeat.set(10, 10);

  const nrml2 = textureLoader.load("/assets/leather2/nrml.jpg");
  nrml2.wrapS = THREE.RepeatWrapping;
  nrml2.wrapT = THREE.RepeatWrapping;
  nrml2.repeat.set(10, 10);

  const rough2 = textureLoader.load("/assets/leather2/rough.jpg");
  rough2.wrapS = THREE.RepeatWrapping;
  rough2.wrapT = THREE.RepeatWrapping;
  rough2.repeat.set(10, 10);

  leatherMat2.map = color2;
  leatherMat2.normalMap = nrml2;
  // leatherMat2.displacementMap = textureLoader.load("/assets/leather2/disp.jpg");
  // leatherMat2.displacementBias = 0.001
  leatherMat2.roughnessMap = rough2;

  console.log("textures loaded");
}

loadTextures();

leather1.addEventListener("click", () => {
  sofa.material = leatherMat1;
});

leather2.addEventListener("click", () => {
  sofa.material = leatherMat2;
});

leatherWrapper.addEventListener("click", () => {
  leatherWrapper.style.display = "none";
});

document.addEventListener("mousemove", (event) => {
  if (fps.enabled) {
    const movementX =
      event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY =
      event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    fps.rotation.y -= movementX * fps.lookSpeed;
    fps.rotation.x -= movementY * fps.lookSpeed;

    fps.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, fps.rotation.x)
    );

    camera.rotation.copy(fps.rotation);

    fps.mouseMoved = true;
  }
});

document.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "KeyW":
      fps.moveForward = true;
      break;
    case "KeyA":
      fps.moveLeft = true;
      break;
    case "KeyS":
      fps.moveBackward = true;
      break;
    case "KeyD":
      fps.moveRight = true;
      break;
    case "Space":
      fps.moveUp = true;
      break;
    case "ShiftLeft":
      fps.moveDown = true;
      break;
  }
});

document.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyW":
      fps.moveForward = false;
      break;
    case "KeyA":
      fps.moveLeft = false;
      break;
    case "KeyS":
      fps.moveBackward = false;
      break;
    case "KeyD":
      fps.moveRight = false;
      break;
    case "Space":
      fps.moveUp = false;
      break;
    case "ShiftLeft":
      fps.moveDown = false;
      break;
  }
});

const ambient = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambient);

const direction = new THREE.DirectionalLight(0xffffff, 1.2);
// scene.add(direction);

// const pointLight = new THREE.PointLight(0xffffaa, 1, 10);
// pointLight.castShadow = true;
// camera.add(pointLight);
// scene.add(camera);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  composer.setSize(window.innerWidth, window.innerHeight);
});

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.25,
  0.2,
  0.1
);
composer.addPass(bloomPass);

function getMaterialNameOnClick() {
  // Create a raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Add click event listener
  window.addEventListener("click", (event) => {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Get the first intersected object
      const object = intersects[0].object;
      if (object.name.includes("Sofa")) {
        leatherWrapper.style.display = "block";
      }
    }
  });
}

// Call this function after your scene is set up
getMaterialNameOnClick();

const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.2 },
    darkness: { value: 1.0 },
  },
  vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offset;
        uniform float darkness;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            vec2 coord = (uv - 0.5) * 2.0; 
            float vignette = 1.0 - dot(coord, coord) * offset;
            vignette = clamp(vignette, 0.0, 1.0);

            // Apply chromatic aberration only in the dark vignette areas
            float aberrationAmount = (1.0 - vignette) * 0.005; // Increase for more effect
            vec2 rOffset = vec2(aberrationAmount, 0.0);
            vec2 bOffset = vec2(-aberrationAmount, 0.0);

            vec4 color;
            color.r = texture2D(tDiffuse, uv + rOffset).r; // Offset red channel
            color.g = texture2D(tDiffuse, uv).g;           // Green stays the same
            color.b = texture2D(tDiffuse, uv + bOffset).b; // Offset blue channel
            color.a = 1.0;

            // Darken based on vignette effect
            color.rgb *= vignette;
            color.rgb = mix(color.rgb, vec3(0.0), darkness * (1.0 - vignette) * 0.8);

            gl_FragColor = color;
        }
    `,
};

const vignettePass = new ShaderPass(vignetteShader);
// composer.addPass(vignettePass);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const focusSpeed = 0.1;

const bokehPass = new BokehPass(scene, camera, {
  focus: 3.0,
  aperture: 0.01,
  maxblur: 0.001,
  width: window.innerWidth,
  height: window.innerHeight,
});
// composer.addPass(bokehPass);
composer.addPass(smaaPass);

function updateFocus() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const targetDistance = intersects[0].distance;
    bokehPass.uniforms.focus.value +=
      (targetDistance - bokehPass.uniforms.focus.value) * focusSpeed;
  }
}

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

let previousTime = performance.now();

function addingEvents() {
  points.forEach((point) => {
    point.addEventListener("click", function (e) {
      const journeyArr = findShortestPath(
        roomConnections,
        currentPos,
        e.target.innerHTML
      );
      const journeyVectorArr = [];
      journeyArr.forEach((point) => {
        journeyVectorArr.push(positions[point]);
      });
      createCurve(journeyVectorArr);
      currentPos = e.target.innerHTML;
    });
  });
}

addingEvents();

function animate() {
  requestAnimationFrame(animate);
  updateFocus();

  const time = performance.now();
  previousTime = time;

  if (animating) {
    const delta = clock.getDelta();
    controls.update(delta);
  }

  if (fps.enabled) {
    const speed = fps.moveSpeed;

    fps.direction.z = Number(fps.moveForward) - Number(fps.moveBackward);
    fps.direction.x = Number(fps.moveRight) - Number(fps.moveLeft);
    fps.direction.y = Number(fps.moveUp) - Number(fps.moveDown);

    if (fps.direction.length() > 0) {
      fps.direction.normalize();
    }

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    if (fps.moveForward || fps.moveBackward) {
      camera.position.addScaledVector(forward, fps.direction.z * speed);
    }

    if (fps.moveLeft || fps.moveRight) {
      camera.position.addScaledVector(right, fps.direction.x * speed);
    }

    if (fps.moveUp || fps.moveDown) {
      camera.position.y += fps.direction.y * speed;
    }
  }

  spinFan();

  composer.render();
}

animate();