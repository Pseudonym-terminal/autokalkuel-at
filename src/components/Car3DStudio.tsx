import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FahrwertCar, PaletteTokens } from '../engine/fahrwertEngine';
import { Language } from '../types';

export interface CarDimensions {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  wheelbaseMm: number;
  trunkLiters: number;
  voltage: '400V' | '800V' | '48V mHEV' | 'PHEV HV' | '12V';
  drivetrain: 'RWD' | 'AWD' | 'FWD';
  batteryKwhNet: number;
}

export function getCarDimensions(car: FahrwertCar): CarDimensions {
  const is800V = ['ioniq5', 'ioniq6', 'ev6', 'ev9', 'q6-etron', 'a6-etron', 'macan-ev', 'xpeng-g6'].includes(
    car.id
  );
  const isAwd = ['ev9', 'xc60-phev', 'macan-ev', 'my'].includes(car.id);
  const isFwd = ['r5', 'inster', 'kona-ev', 'e3008', 'e308-sw', 'astra-st-ev', 'ix1', 'bmw-ix2', 'mercedes-eqa', 'mercedes-eqb', 'tiguan-phev', 'corolla-hev', 'octavia'].includes(
    car.id
  );

  // Realistic dimensions by body & segment
  const specsById: Record<string, Partial<CarDimensions>> = {
    id7: { lengthMm: 4961, widthMm: 1862, heightMm: 1536, wheelbaseMm: 2971, trunkLiters: 605, batteryKwhNet: 86 },
    i5: { lengthMm: 5060, widthMm: 1900, heightMm: 1515, wheelbaseMm: 2995, trunkLiters: 570, batteryKwhNet: 81.2 },
    'a6-etron': { lengthMm: 4928, widthMm: 1923, heightMm: 1527, wheelbaseMm: 2950, trunkLiters: 502, batteryKwhNet: 94.9 },
    enyaq: { lengthMm: 4649, widthMm: 1879, heightMm: 1616, wheelbaseMm: 2765, trunkLiters: 585, batteryKwhNet: 77 },
    elroq: { lengthMm: 4488, widthMm: 1884, heightMm: 1625, wheelbaseMm: 2765, trunkLiters: 470, batteryKwhNet: 77 },
    ev3: { lengthMm: 4300, widthMm: 1850, heightMm: 1560, wheelbaseMm: 2680, trunkLiters: 460, batteryKwhNet: 81.4 },
    ev6: { lengthMm: 4695, widthMm: 1890, heightMm: 1550, wheelbaseMm: 2900, trunkLiters: 490, batteryKwhNet: 84 },
    ev9: { lengthMm: 5015, widthMm: 1980, heightMm: 1780, wheelbaseMm: 3100, trunkLiters: 828, batteryKwhNet: 99.8 },
    my: { lengthMm: 4751, widthMm: 1921, heightMm: 1624, wheelbaseMm: 2890, trunkLiters: 854, batteryKwhNet: 78 },
    m3: { lengthMm: 4720, widthMm: 1848, heightMm: 1441, wheelbaseMm: 2875, trunkLiters: 594, batteryKwhNet: 78 },
    ioniq5: { lengthMm: 4655, widthMm: 1890, heightMm: 1605, wheelbaseMm: 3000, trunkLiters: 520, batteryKwhNet: 84 },
    ioniq6: { lengthMm: 4855, widthMm: 1880, heightMm: 1495, wheelbaseMm: 2950, trunkLiters: 401, batteryKwhNet: 77.4 },
    inster: { lengthMm: 3825, widthMm: 1610, heightMm: 1575, wheelbaseMm: 2580, trunkLiters: 280, batteryKwhNet: 49 },
    r5: { lengthMm: 3922, widthMm: 1774, heightMm: 1498, wheelbaseMm: 2540, trunkLiters: 326, batteryKwhNet: 52 },
    ex30: { lengthMm: 4233, widthMm: 1836, heightMm: 1550, wheelbaseMm: 2650, trunkLiters: 318, batteryKwhNet: 64 },
    'id-buzz': { lengthMm: 4712, widthMm: 1985, heightMm: 1927, wheelbaseMm: 2989, trunkLiters: 1121, batteryKwhNet: 79 },
    'macan-ev': { lengthMm: 4784, widthMm: 1938, heightMm: 1622, wheelbaseMm: 2893, trunkLiters: 540, batteryKwhNet: 95 },
    mg4: { lengthMm: 4287, widthMm: 1836, heightMm: 1504, wheelbaseMm: 2705, trunkLiters: 363, batteryKwhNet: 61.7 },
    polestar2: { lengthMm: 4606, widthMm: 1859, heightMm: 1479, wheelbaseMm: 2735, trunkLiters: 405, batteryKwhNet: 82 },
    polestar4: { lengthMm: 4840, widthMm: 2008, heightMm: 1534, wheelbaseMm: 2999, trunkLiters: 526, batteryKwhNet: 94 },
  };

  const base: CarDimensions =
    car.body === 'estate'
      ? {
          lengthMm: 4780,
          widthMm: 1855,
          heightMm: 1505,
          wheelbaseMm: 2840,
          trunkLiters: 610,
          voltage: car.fuel === 'bev' ? (is800V ? '800V' : '400V') : '12V',
          drivetrain: isAwd ? 'AWD' : isFwd ? 'FWD' : 'RWD',
          batteryKwhNet: car.fuel === 'bev' ? 77 : 0,
        }
      : car.body === 'sedan'
        ? {
            lengthMm: 4760,
            widthMm: 1865,
            heightMm: 1465,
            wheelbaseMm: 2880,
            trunkLiters: 470,
            voltage: car.fuel === 'bev' ? (is800V ? '800V' : '400V') : '12V',
            drivetrain: isAwd ? 'AWD' : isFwd ? 'FWD' : 'RWD',
            batteryKwhNet: car.fuel === 'bev' ? 79 : 0,
          }
        : car.body === 'hatchback'
          ? {
              lengthMm: 4260,
              widthMm: 1809,
              heightMm: 1530,
              wheelbaseMm: 2700,
              trunkLiters: 385,
              voltage: car.fuel === 'bev' ? '400V' : '12V',
              drivetrain: isFwd ? 'FWD' : 'RWD',
              batteryKwhNet: car.fuel === 'bev' ? 64 : 0,
            }
          : {
              lengthMm: 4620,
              widthMm: 1890,
              heightMm: 1635,
              wheelbaseMm: 2790,
              trunkLiters: 535,
              voltage:
                car.fuel === 'bev'
                  ? is800V
                    ? '800V'
                    : '400V'
                  : car.fuel === 'phev'
                    ? 'PHEV HV'
                    : '12V',
              drivetrain: isAwd ? 'AWD' : isFwd ? 'FWD' : 'RWD',
              batteryKwhNet: car.fuel === 'bev' ? 77 : car.fuel === 'phev' ? 19.7 : 0,
            };

  return { ...base, ...(specsById[car.id] || {}) };
}

interface PaintPreset {
  id: string;
  nameDe: string;
  nameSv: string;
  hex: string;
}

const PAINT_PRESETS: PaintPreset[] = [
  { id: 'glacier', nameDe: 'Gletscherblau Metallic', nameSv: 'Glaciärblå Metallic', hex: '#1E82A8' },
  { id: 'pearl', nameDe: 'Alpinweiß Perleffekt', nameSv: 'Alpinvit Pärlemor', hex: '#F0F2F5' },
  { id: 'obsidian', nameDe: 'Obsidianschwarz Metallic', nameSv: 'Obsidiansvart Metallic', hex: '#1B1E23' },
  { id: 'dolomite', nameDe: 'Dolomitgrau Metallic', nameSv: 'Dolomitgrå Metallic', hex: '#6E767E' },
  { id: 'emerald', nameDe: 'Alpinsmaragd Metallic', nameSv: 'Alpinsmaragd Metallic', hex: '#0F6B4E' },
  { id: 'crimson', nameDe: 'Karmesinrot Metallic', nameSv: 'Karmosinröd Metallic', hex: '#A91D2A' },
  { id: 'champagne', nameDe: 'Champagner-Sand Metallic', nameSv: 'Champagne-Sand Metallic', hex: '#C2AD88' },
];

function getDefaultPaintId(carId: string): string {
  if (['mg4', 'e3008', 'id7', 'enyaq', 'elroq', 'explorer'].includes(carId)) return 'glacier';
  if (['q4-etron', 'a6-etron', 'ev9', 'm3'].includes(carId)) return 'obsidian';
  if (['ioniq5', 'ioniq6', 'bmw-i4', 'polestar4', 'e308-sw', 'astra-st-ev', 'passat-tdi', 'xpeng-g6', 'mercedes-eqb'].includes(carId))
    return 'dolomite';
  if (['r5', 'id-buzz', 'inster'].includes(carId)) return 'emerald';
  if (['born', 'ev6'].includes(carId)) return 'crimson';
  return 'pearl';
}

type CameraPreset = 'front34' | 'side' | 'rear34' | 'top';

interface Car3DStudioProps {
  car: FahrwertCar;
  pal: PaletteTokens;
  lang: Language;
  initialXray?: boolean;
}

export const Car3DStudio: React.FC<Car3DStudioProps> = ({
  car,
  pal,
  lang,
  initialXray = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [paintId, setPaintId] = useState<string>(() => getDefaultPaintId(car.id));
  const [xray, setXray] = useState<boolean>(initialXray);
  const [showDims, setShowDims] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [driveSpin, setDriveSpin] = useState<boolean>(true);
  const [headlightsOn, setHeadlightsOn] = useState<boolean>(true);
  const [camPreset, setCamPreset] = useState<CameraPreset>('front34');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync default paint when switching car
  useEffect(() => {
    setPaintId(getDefaultPaintId(car.id));
  }, [car.id]);

  const dims = useMemo(() => getCarDimensions(car), [car]);
  const activePaint = PAINT_PRESETS.find((p) => p.id === paintId) || PAINT_PRESETS[0];

  // Store refs to mutable Three.js objects so UI toggles update materials/camera without recreating the WebGL context
  const sceneRefs = useRef<{
    bodyMat?: THREE.MeshPhysicalMaterial;
    glassMat?: THREE.MeshPhysicalMaterial;
    xrayGroup?: THREE.Group;
    dimsGroup?: THREE.Group;
    headlightMat?: THREE.MeshStandardMaterial;
    taillightMat?: THREE.MeshStandardMaterial;
    headlightSpotL?: THREE.SpotLight;
    headlightSpotR?: THREE.SpotLight;
    controls?: OrbitControls;
    camera?: THREE.PerspectiveCamera;
    wheels?: THREE.Object3D[];
    energyParticles?: THREE.Points;
    gridHelper?: THREE.GridHelper;
  }>({});

  // Build the 3D scene when `car` changes
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    const isDark = pal.id === 'premium';
    scene.background = new THREE.Color(isDark ? '#111215' : '#ECEFE9');
    scene.fog = new THREE.Fog(isDark ? '#111215' : '#ECEFE9', 9.5, 22);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(4.1, 1.85, 4.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.25 : 1.12;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.58, 0);
    controls.minDistance = 2.6;
    controls.maxDistance = 9.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Never dip below studio floor
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.1;

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.85 : 1.15);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      isDark ? 0xdde6ff : 0xffffff,
      isDark ? 0x1a1c20 : 0xcbd2c8,
      isDark ? 0.9 : 1.1
    );
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffcf5, isDark ? 2.4 : 2.1);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(isDark ? 0xc9b18a : 0xd8ebe2, 1.35);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    // Overhead Softbox Strip Reflection bar
    const softboxGeo = new THREE.PlaneGeometry(5.5, 1.4);
    const softboxMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isDark ? 0.14 : 0.35,
    });
    const softbox = new THREE.Mesh(softboxGeo, softboxMat);
    softbox.rotation.x = Math.PI / 2;
    softbox.position.set(0, 3.6, 0);
    scene.add(softbox);

    // Turntable Podium & Studio Floor
    const floorGeo = new THREE.CircleGeometry(14, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x141518 : 0xe4e8e1,
      roughness: 0.75,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle Turntable Ring
    const ringGeo = new THREE.RingGeometry(2.65, 2.7, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0xc9b18a : 0x0e7c5a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.003;
    scene.add(ring);

    const gridHelper = new THREE.GridHelper(
      8,
      16,
      isDark ? 0x34363c : 0xc5ccc2,
      isDark ? 0x222428 : 0xd5dbd2
    );
    gridHelper.position.y = 0.002;
    scene.add(gridHelper);

    // ========================================================================
    // PROCEDURAL MODEL-ACCURATE 3D VEHICLE BUILDER
    // ========================================================================
    const carRoot = new THREE.Group();
    scene.add(carRoot);

    // Scale physical millimeters to scene units (1 unit = 1 meter)
    const L = dims.lengthMm / 1000;
    const W = dims.widthMm / 1000;
    const H = dims.heightMm / 1000;
    const WB = dims.wheelbaseMm / 1000;

    const isVan = car.id === 'id-buzz';
    const isCoupeSuv = ['tavascan', 'polestar4', 'xpeng-g6', 'e3008', 'bmw-ix2', 'macan-ev', 'ev6'].includes(
      car.id
    );
    const isStreamliner = ['ioniq6', 'm3', 'byd-seal', 'bmw-i4', 'mercedes-eqe', 'polestar2'].includes(
      car.id
    );
    const isBoxySuv = ['ev9', 'ev3', 'inster', 'ex30'].includes(car.id);

    const wheelRadius = car.body === 'suv' ? 0.37 : car.body === 'hatchback' ? 0.33 : 0.35;
    const groundClearance = car.body === 'suv' ? 0.21 : 0.15;

    // Materials
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(activePaint.hex),
      metalness: 0.62,
      roughness: 0.24,
      clearcoat: 1.0,
      clearcoatRoughness: 0.07,
      transparent: xray,
      opacity: xray ? 0.2 : 1.0,
      depthWrite: !xray,
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.45,
      metalness: 0.3,
      transparent: xray,
      opacity: xray ? 0.22 : 1.0,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x101820,
      metalness: 0.1,
      roughness: 0.08,
      transmission: 0.65,
      transparent: true,
      opacity: xray ? 0.12 : 0.76,
    });

    // Side profile 2D shape extruded across car width
    const halfL = L / 2;
    const bodyW = W * 0.88;
    const beltH = groundClearance + (H - groundClearance) * 0.56;
    const roofH = H;

    const shape = new THREE.Shape();
    // Start at front lower bumper
    shape.moveTo(halfL, groundClearance + 0.04);
    // Front nose & fascia
    if (isVan) {
      shape.quadraticCurveTo(halfL + 0.03, beltH * 0.85, halfL * 0.72, beltH + 0.12);
      shape.lineTo(halfL * 0.38, roofH - 0.02);
    } else {
      shape.quadraticCurveTo(halfL + 0.02, beltH * 0.75, halfL * 0.9, beltH * 0.96);
      // Hood line to base of windshield
      shape.quadraticCurveTo(halfL * 0.68, beltH + 0.04, halfL * 0.42, beltH + 0.07);
      // Windshield up to front roof header
      shape.quadraticCurveTo(halfL * 0.22, roofH - 0.02, halfL * 0.08, roofH);
    }

    // Roofline & Rear profile by body type
    if (car.body === 'estate' || isVan) {
      shape.lineTo(-halfL * 0.72, roofH - 0.02);
      shape.quadraticCurveTo(-halfL * 0.92, roofH - 0.08, -halfL * 0.98, beltH + 0.04);
    } else if (isCoupeSuv || isStreamliner) {
      shape.quadraticCurveTo(-halfL * 0.35, roofH, -halfL * 0.88, beltH + 0.06);
      shape.lineTo(-halfL * 0.98, beltH + 0.02);
    } else if (car.body === 'sedan') {
      shape.lineTo(-halfL * 0.32, roofH - 0.02);
      shape.quadraticCurveTo(-halfL * 0.62, beltH + 0.08, -halfL * 0.75, beltH + 0.05);
      shape.lineTo(-halfL * 0.97, beltH + 0.02);
    } else if (isBoxySuv || car.body === 'suv') {
      shape.lineTo(-halfL * 0.64, roofH - 0.02);
      shape.quadraticCurveTo(-halfL * 0.86, roofH - 0.08, -halfL * 0.97, beltH + 0.04);
    } else {
      // Hatchback
      shape.lineTo(-halfL * 0.56, roofH - 0.03);
      shape.quadraticCurveTo(-halfL * 0.85, beltH + 0.12, -halfL * 0.97, beltH + 0.02);
    }

    // Rear bumper down to rear diffuser
    shape.quadraticCurveTo(-halfL - 0.02, (groundClearance + beltH) * 0.5, -halfL * 0.94, groundClearance + 0.05);
    shape.lineTo(halfL, groundClearance + 0.04);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: bodyW,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.07,
      bevelOffset: 0,
      bevelSegments: 5,
    };

    const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bodyGeo.center();
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    // Align body height above studio floor
    bodyMesh.position.y = (H + groundClearance) * 0.5;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carRoot.add(bodyMesh);

    // Lower black rocker skirt / diffuser cladding
    const skirtGeo = new THREE.BoxGeometry(L * 0.92, 0.09, W * 0.94);
    const skirtMesh = new THREE.Mesh(skirtGeo, darkTrimMat);
    skirtMesh.position.set(0, groundClearance + 0.05, 0);
    skirtMesh.castShadow = true;
    carRoot.add(skirtMesh);

    // Cabin Greenhouse / Panoramic Glass Roof & Windows
    const cabinL =
      car.body === 'estate' || isVan ? L * 0.62 : car.body === 'sedan' ? L * 0.52 : L * 0.55;
    const cabinH = (H - beltH) * 0.86;
    const cabinGeo = new THREE.BoxGeometry(cabinL, cabinH, W * 0.79);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(isVan ? 0.05 : -L * 0.06, beltH + cabinH * 0.45, 0);
    carRoot.add(cabinMesh);

    // Roof Rails for Kombis & SUVs
    if (car.body === 'estate' || (car.body === 'suv' && !isCoupeSuv)) {
      const railGeo = new THREE.BoxGeometry(cabinL * 0.82, 0.025, 0.03);
      [-W * 0.34, W * 0.34].forEach((zPos) => {
        const rail = new THREE.Mesh(railGeo, darkTrimMat);
        rail.position.set(-L * 0.08, H + 0.01, zPos);
        carRoot.add(rail);
      });
    }

    // Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.16, 0.09, 0.13);
    [-W * 0.49, W * 0.49].forEach((zPos) => {
      const mirror = new THREE.Mesh(mirrorGeo, bodyMat);
      mirror.position.set(L * 0.16, beltH + 0.04, zPos);
      carRoot.add(mirror);
    });

    // Interior Seats & Dashboard (visible through glass & in X-ray)
    const interiorGroup = new THREE.Group();
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.7 });
    const dashGeo = new THREE.BoxGeometry(0.28, 0.26, W * 0.72);
    const dashMesh = new THREE.Mesh(dashGeo, seatMat);
    dashMesh.position.set(L * 0.18, beltH - 0.05, 0);
    interiorGroup.add(dashMesh);

    // Infotainment Screen glow
    const screenGeo = new THREE.BoxGeometry(0.03, 0.14, 0.26);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(L * 0.14, beltH + 0.06, 0);
    interiorGroup.add(screenMesh);

    // 4 Seats
    [
      [L * 0.02, -W * 0.2],
      [L * 0.02, W * 0.2],
      [-L * 0.18, -W * 0.2],
      [-L * 0.18, W * 0.2],
    ].forEach(([sx, sz]) => {
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.32), seatMat);
      back.position.set(sx, beltH - 0.02, sz);
      back.rotation.z = 0.18;
      interiorGroup.add(back);
    });
    carRoot.add(interiorGroup);

    // LED Headlights & Taillights
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xdbeafe),
      emissiveIntensity: headlightsOn ? 2.4 : 0.1,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xff1e27,
      emissive: new THREE.Color(0xef4444),
      emissiveIntensity: headlightsOn ? 2.2 : 0.2,
    });

    // Full-width LED lightbar front & rear
    const frontLedBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.045, W * 0.78),
      headlightMat
    );
    frontLedBar.position.set(halfL - 0.02, beltH * 0.82, 0);
    carRoot.add(frontLedBar);

    const rearLedBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.045, W * 0.8),
      taillightMat
    );
    rearLedBar.position.set(-halfL + 0.02, beltH * 0.88, 0);
    carRoot.add(rearLedBar);

    // Subtle Headlight beams on floor
    const spotL = new THREE.SpotLight(0xdbeafe, headlightsOn ? 1.8 : 0, 5.5, Math.PI / 7, 0.6, 1.5);
    spotL.position.set(halfL, beltH * 0.8, -W * 0.28);
    spotL.target.position.set(halfL + 2.8, 0, -W * 0.28);
    carRoot.add(spotL);
    carRoot.add(spotL.target);

    const spotR = new THREE.SpotLight(0xdbeafe, headlightsOn ? 1.8 : 0, 5.5, Math.PI / 7, 0.6, 1.5);
    spotR.position.set(halfL, beltH * 0.8, W * 0.28);
    spotR.target.position.set(halfL + 2.8, 0, W * 0.28);
    carRoot.add(spotR);
    carRoot.add(spotR.target);

    // ========================================================================
    // 4 WHEELS WITH ALLOY RIMS, BRAKE DISCS & CALIPERS
    // ========================================================================
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x16181b,
      roughness: 0.82,
      metalness: 0.1,
    });
    const alloyMat = new THREE.MeshStandardMaterial({
      color: 0xd4d8de,
      roughness: 0.22,
      metalness: 0.85,
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: car.fuel === 'bev' ? 0x0e7c5a : 0xc8232c,
      roughness: 0.3,
      metalness: 0.5,
    });

    const wheelPositions: Array<[number, number, number]> = [
      [WB / 2, wheelRadius, W * 0.45],
      [WB / 2, wheelRadius, -W * 0.45],
      [-WB / 2, wheelRadius, W * 0.45],
      [-WB / 2, wheelRadius, -W * 0.45],
    ];

    const wheelsList: THREE.Object3D[] = [];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wy, wz);

      // Tire cylinder
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 36);
      tireGeo.rotateX(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Rim disc
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, 0.25, 24);
      rimGeo.rotateX(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, darkTrimMat);
      wheelGroup.add(rim);

      // 5 Aero Alloy Spokes
      for (let s = 0; s < 5; s++) {
        const spokeGeo = new THREE.BoxGeometry(wheelRadius * 1.32, 0.048, 0.26);
        const spoke = new THREE.Mesh(spokeGeo, alloyMat);
        spoke.rotation.z = (s * Math.PI) / 5;
        wheelGroup.add(spoke);
      }

      // Brake Caliper (non-rotating mount)
      const caliperGeo = new THREE.BoxGeometry(0.12, 0.18, 0.265);
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(wx - 0.14, wy + 0.04, wz);
      carRoot.add(caliper);

      carRoot.add(wheelGroup);
      wheelsList.push(wheelGroup);
    });

    // ========================================================================
    // RÖNTGEN / X-RAY DRIVETRAIN & BATTERY ARCHITECTURE GROUP
    // ========================================================================
    const xrayGroup = new THREE.Group();
    xrayGroup.visible = xray;

    if (car.fuel === 'bev' || car.fuel === 'phev') {
      // High-Voltage Skateboard Battery Pack in Chassis Floor
      const packLen = car.fuel === 'bev' ? WB * 0.78 : WB * 0.42;
      const packW = W * 0.68;
      const packMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 0.85,
        metalness: 0.5,
        roughness: 0.2,
      });
      const packMesh = new THREE.Mesh(new THREE.BoxGeometry(packLen, 0.13, packW), packMat);
      packMesh.position.set(car.fuel === 'phev' ? -WB * 0.15 : 0, groundClearance + 0.08, 0);
      xrayGroup.add(packMesh);

      // Individual Battery Cell Modules Grid on top of pack
      const cellMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x10b981),
        emissiveIntensity: 1.1,
      });
      const numModules = car.fuel === 'bev' ? 8 : 4;
      for (let m = 0; m < numModules; m++) {
        const modX =
          (car.fuel === 'phev' ? -WB * 0.15 : 0) -
          packLen * 0.42 +
          (m / Math.max(1, numModules - 1)) * (packLen * 0.84);
        const modMesh = new THREE.Mesh(
          new THREE.BoxGeometry(packLen / (numModules * 1.35), 0.15, packW * 0.88),
          cellMat
        );
        modMesh.position.set(modX, groundClearance + 0.09, 0);
        xrayGroup.add(modMesh);
      }

      // Electric Drive Unit(s) (Rear or Front/AWD)
      const motorMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: new THREE.Color(0xd97706),
        emissiveIntensity: 1.2,
        metalness: 0.7,
        roughness: 0.2,
      });
      const motorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.46, 24);
      motorGeo.rotateX(Math.PI / 2);

      if (dims.drivetrain === 'RWD' || dims.drivetrain === 'AWD') {
        const rearMotor = new THREE.Mesh(motorGeo, motorMat);
        rearMotor.position.set(-WB / 2, wheelRadius, 0);
        xrayGroup.add(rearMotor);
      }
      if (dims.drivetrain === 'FWD' || dims.drivetrain === 'AWD') {
        const frontMotor = new THREE.Mesh(motorGeo, motorMat);
        frontMotor.position.set(WB / 2, wheelRadius, 0);
        xrayGroup.add(frontMotor);
      }

      // High-Voltage Orange Busbar Cabling
      const hvCableMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: new THREE.Color(0xea580c),
        emissiveIntensity: 1.1,
      });
      const cableMesh = new THREE.Mesh(new THREE.BoxGeometry(WB, 0.04, 0.07), hvCableMat);
      cableMesh.position.set(0, groundClearance + 0.16, 0.12);
      xrayGroup.add(cableMesh);
    }

    if (car.fuel !== 'bev') {
      // Front Internal Combustion Engine Block & Exhaust
      const engineMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: new THREE.Color(0xb91c1c),
        emissiveIntensity: 0.9,
        metalness: 0.6,
      });
      const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.48), engineMat);
      engineBlock.position.set(WB / 2 - 0.05, wheelRadius + 0.15, 0);
      xrayGroup.add(engineBlock);

      const exhaustPipe = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.78, 0.045, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
      );
      exhaustPipe.position.set(-0.15, groundClearance + 0.04, -0.18);
      xrayGroup.add(exhaustPipe);
    }

    // Energy Flow Particles inside X-Ray
    const pCount = 60;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * WB;
      pPositions[i * 3 + 1] = groundClearance + 0.12 + Math.random() * 0.08;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * (W * 0.55);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: car.fuel === 'bev' ? 0x34d399 : 0xfbbf24,
      size: 0.06,
      transparent: true,
      opacity: 0.9,
    });
    const energyParticles = new THREE.Points(pGeo, pMat);
    xrayGroup.add(energyParticles);

    carRoot.add(xrayGroup);

    // ========================================================================
    // 3D FLOOR DIMENSION LINES GROUP
    // ========================================================================
    const dimsGroup = new THREE.Group();
    dimsGroup.visible = showDims;
    const lineMat = new THREE.LineBasicMaterial({
      color: isDark ? 0xc9b18a : 0x0e7c5a,
    });

    // Length line along side of car
    const lenPts = [
      new THREE.Vector3(-halfL, 0.015, W * 0.68),
      new THREE.Vector3(halfL, 0.015, W * 0.68),
    ];
    dimsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lenPts), lineMat));

    // End ticks for length
    [-halfL, halfL].forEach((tx) => {
      const tickPts = [
        new THREE.Vector3(tx, 0.015, W * 0.6),
        new THREE.Vector3(tx, 0.015, W * 0.76),
      ];
      dimsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tickPts), lineMat));
    });

    // Width line in front of car
    const widPts = [
      new THREE.Vector3(halfL + 0.35, 0.015, -W / 2),
      new THREE.Vector3(halfL + 0.35, 0.015, W / 2),
    ];
    dimsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(widPts), lineMat));

    carRoot.add(dimsGroup);

    sceneRefs.current = {
      bodyMat,
      glassMat,
      xrayGroup,
      dimsGroup,
      headlightMat,
      taillightMat,
      headlightSpotL: spotL,
      headlightSpotR: spotR,
      controls,
      camera,
      wheels: wheelsList,
      energyParticles,
      gridHelper,
    };

    // Animation loop
    let reqId = 0;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();

      if (sceneRefs.current.wheels && driveSpin) {
        sceneRefs.current.wheels.forEach((w) => {
          w.rotation.z -= 0.035;
        });
      }

      if (sceneRefs.current.energyParticles && sceneRefs.current.xrayGroup?.visible) {
        const posAttr = sceneRefs.current.energyParticles.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          let x = posAttr.getX(i) - 0.022;
          if (x < -WB / 2) x = WB / 2;
          posAttr.setX(i, x);
        }
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Responsive ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nw = entry.contentRect.width;
      const nh = entry.contentRect.height;
      if (nw > 0 && nh > 0) {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(reqId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id, pal.id, dims]);

  // Live reactive updates for Paint, X-Ray, Dimensions, AutoRotate & Headlights
  useEffect(() => {
    const r = sceneRefs.current;
    if (r.bodyMat) {
      r.bodyMat.color.set(activePaint.hex);
      r.bodyMat.transparent = xray;
      r.bodyMat.opacity = xray ? 0.22 : 1.0;
      r.bodyMat.depthWrite = !xray;
      r.bodyMat.needsUpdate = true;
    }
    if (r.glassMat) {
      r.glassMat.opacity = xray ? 0.12 : 0.76;
      r.glassMat.needsUpdate = true;
    }
    if (r.xrayGroup) {
      r.xrayGroup.visible = xray;
    }
    if (r.dimsGroup) {
      r.dimsGroup.visible = showDims;
    }
    if (r.controls) {
      r.controls.autoRotate = autoRotate;
    }
    if (r.headlightMat && r.taillightMat) {
      r.headlightMat.emissiveIntensity = headlightsOn ? 2.4 : 0.1;
      r.taillightMat.emissiveIntensity = headlightsOn ? 2.2 : 0.2;
    }
    if (r.headlightSpotL && r.headlightSpotR) {
      r.headlightSpotL.intensity = headlightsOn ? 1.8 : 0;
      r.headlightSpotR.intensity = headlightsOn ? 1.8 : 0;
    }
  }, [activePaint.hex, xray, showDims, autoRotate, headlightsOn, driveSpin]);

  // Camera angle preset handler
  const applyCameraPreset = (preset: CameraPreset) => {
    setCamPreset(preset);
    const cam = sceneRefs.current.camera;
    const ctrl = sceneRefs.current.controls;
    if (!cam || !ctrl) return;
    ctrl.autoRotate = false;
    setAutoRotate(false);
    if (preset === 'front34') {
      cam.position.set(4.1, 1.85, 4.3);
    } else if (preset === 'side') {
      cam.position.set(0.05, 1.45, 5.4);
    } else if (preset === 'rear34') {
      cam.position.set(-4.2, 1.85, 4.1);
    } else if (preset === 'top') {
      cam.position.set(0.1, 6.2, 0.8);
    }
    ctrl.update();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isFullscreen ? undefined : '16/10',
        height: isFullscreen ? '100vh' : undefined,
        minHeight: 330,
        borderRadius: isFullscreen ? 0 : pal.id === 'fintech' ? 14 : 10,
        overflow: 'hidden',
        background: pal.id === 'premium' ? '#111215' : '#ECEFE9',
        border: `1px solid ${pal.line}`,
        userSelect: 'none',
      }}
    >
      {/* WebGL Canvas Mount */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />

      {/* TOP-LEFT HUD: 3D Badge & Active Technical Specs */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: pal.radiusBadge,
            background: 'rgba(15, 26, 23, 0.82)',
            backdropFilter: 'blur(8px)',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 99,
              background: xray ? '#38BDF8' : '#10B981',
            }}
          />
          <span>
            {xray
              ? lang === 'sv'
                ? '3D RÖNTGEN · DRIVLINA & BATTERI'
                : '3D-RÖNTGEN · ANTRIEB & BATTERIE'
              : lang === 'sv'
                ? 'INTERAKTIV 360° 3D-STUDIO (DRA FÖR ATT ROTERA)'
                : 'INTERAKTIVES 360° 3D-STUDIO (ZIEHEN ZUM DREHEN)'}
          </span>
        </div>

        {/* X-Ray or Dimension Callout Pills */}
        {xray && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {[
              dims.voltage,
              dims.drivetrain,
              dims.batteryKwhNet > 0
                ? `${dims.batteryKwhNet} kWh netto`
                : `${car.l.toLocaleString('de-AT')} l/100km`,
              `Peak ${car.kw} kW / P.2 ${car.cont} kW`,
              `G: ${car.mass} kg`,
            ].map((chip) => (
              <span
                key={chip}
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(2, 132, 199, 0.88)',
                  color: '#FFFFFF',
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {showDims && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {[
              `${lang === 'sv' ? 'Längd' : 'Länge'}: ${dims.lengthMm.toLocaleString('de-AT')} mm`,
              `${lang === 'sv' ? 'Bredd' : 'Breite'}: ${dims.widthMm.toLocaleString('de-AT')} mm`,
              `${lang === 'sv' ? 'Hjulbas' : 'Radstand'}: ${dims.wheelbaseMm.toLocaleString('de-AT')} mm`,
              `${lang === 'sv' ? 'Bagage' : 'Kofferraum'}: ${dims.trunkLiters} L`,
            ].map((dChip) => (
              <span
                key={dChip}
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(15, 26, 23, 0.72)',
                  color: '#F2F0EB',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {dChip}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TOP-RIGHT HUD: Camera Angle Presets & Fullscreen */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
        }}
      >
        {(
          [
            ['front34', lang === 'sv' ? '3/4 Fram' : '3/4 Front'],
            ['side', lang === 'sv' ? 'Sida' : 'Seite'],
            ['rear34', lang === 'sv' ? '3/4 Bak' : '3/4 Heck'],
            ['top', lang === 'sv' ? 'Tak' : 'Dach'],
          ] as Array<[CameraPreset, string]>
        ).map(([pKey, pLabel]) => (
          <button
            key={pKey}
            type="button"
            onClick={() => applyCameraPreset(pKey)}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              background:
                camPreset === pKey && !autoRotate
                  ? pal.accent
                  : 'rgba(15, 26, 23, 0.72)',
              color:
                camPreset === pKey && !autoRotate
                  ? pal.accentFg
                  : '#FFFFFF',
              backdropFilter: 'blur(6px)',
            }}
          >
            {pLabel}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={lang === 'sv' ? 'Helskärm' : 'Vollbild'}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            background: 'rgba(15, 26, 23, 0.72)',
            color: '#FFFFFF',
          }}
        >
          ⛶
        </button>
      </div>

      {/* BOTTOM CONTROL BAR: Paint Swatches + X-Ray + Dimensions + AutoRotate */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(15, 26, 23, 0.82)',
          backdropFilter: 'blur(10px)',
          color: '#FFFFFF',
        }}
      >
        {/* Paint Swatches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.8, marginRight: 2 }}>
            {lang === 'sv' ? 'Lack:' : 'Lack:'}
          </span>
          {PAINT_PRESETS.map((p) => {
            const on = p.id === paintId;
            return (
              <button
                key={p.id}
                type="button"
                title={lang === 'sv' ? p.nameSv : p.nameDe}
                onClick={() => setPaintId(p.id)}
                style={{
                  width: 19,
                  height: 19,
                  borderRadius: 99,
                  background: p.hex,
                  border: on ? '2.5px solid #FFFFFF' : '1.5px solid rgba(255,255,255,0.35)',
                  boxShadow: on ? '0 0 0 2px #0E7C5A' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            );
          })}
        </div>

        {/* Interactive Feature Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setXray((v) => !v)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              background: xray ? '#0284C7' : 'rgba(255,255,255,0.14)',
              color: '#FFFFFF',
            }}
          >
            ⚡ {lang === 'sv' ? 'Röntgen' : 'Röntgen'}
          </button>

          <button
            type="button"
            onClick={() => setShowDims((v) => !v)}
            style={{
              padding: '5px 9px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              background: showDims ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
            }}
          >
            📏 {lang === 'sv' ? 'Mått' : 'Maße'}
          </button>

          <button
            type="button"
            onClick={() => setHeadlightsOn((v) => !v)}
            style={{
              padding: '5px 9px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              background: headlightsOn ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
            }}
          >
            💡 {lang === 'sv' ? 'Ljus' : 'Licht'}
          </button>

          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            style={{
              padding: '5px 9px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              background: autoRotate ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
            }}
          >
            ↻ 360°
          </button>
        </div>
      </div>
    </div>
  );
};
