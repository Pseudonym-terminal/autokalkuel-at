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

export interface CadModelMeta {
  uid: string;
  label: string;
  polygons: number;
}

/**
 * Verified high-polygon 3D CAD models for all 48 vehicles in the Fahrwert catalog.
 */
export const CAD_MODELS_BY_CAR_ID: Record<string, CadModelMeta> = {
  enyaq: { uid: '2212b2f00ae94beb8d07a1d9da663c48', label: 'Škoda Enyaq iV CAD', polygons: 1394759 },
  id7: { uid: 'a1356d1767e94341845367e78260537a', label: 'Volkswagen ID.7 CAD', polygons: 263739 },
  ev3: { uid: '4f5993bbad2a4033bef2045582070f1e', label: 'Kia EV3 2025 CAD', polygons: 128728 },
  my: { uid: '66edf828087744479015edff815e85b3', label: 'Tesla Model Y CAD', polygons: 189463 },
  ioniq5: { uid: '53f1b0e8d2e4473ab543b7f0c67a258a', label: 'Hyundai IONIQ 5 CAD', polygons: 2492581 },
  ix1: { uid: 'f5d9130a636b457cac6969487dbf4e02', label: 'BMW iX1 xDrive CAD', polygons: 1510366 },
  id3: { uid: 'cae9c426df874fa4b7f47ea2611f3824', label: 'Volkswagen ID.3 Pro CAD', polygons: 889858 },
  born: { uid: 'aca73900062e4ffc85fb45f1f90a7ac7', label: 'CUPRA Born e-Boost CAD', polygons: 959973 },
  r5: { uid: '135951658a014f0fb9d05fcbcd2a957d', label: 'Renault 5 E-Tech CAD', polygons: 143021 },
  elroq: { uid: 'be5305189e874b1d9104435712e76de9', label: 'Škoda Elroq 2025 CAD', polygons: 570364 },
  ev6: { uid: 'cf70e549c9cb4095b40edc7d4700ccfa', label: 'Kia EV6 84 kWh CAD', polygons: 779230 },
  ex30: { uid: 'c5be588ea33d44cc8d2690ffdba389a4', label: 'Volvo EX30 Single Motor CAD', polygons: 159554 },
  i5: { uid: '207fd872d28b4cafa7fefe061ae98e26', label: 'BMW i5 eDrive40 CAD', polygons: 1477883 },
  id4: { uid: '898fcce37f0948499d1b4c1effc051d1', label: 'Volkswagen ID.4 Pro CAD', polygons: 256508 },
  m3: { uid: '61ddcbdbd3854c239e0c95bf60b00022', label: 'Tesla Model 3 Highland CAD', polygons: 167747 },
  scenic: { uid: 'aa39950eaa0b4648ae8781ac071ba815', label: 'Renault Scenic E-Tech CAD', polygons: 2693270 },
  explorer: { uid: '04089b4affbf4518a6993b2b8e3256e9', label: 'Ford Explorer EV CAD', polygons: 1500000 },
  ex40: { uid: 'c6c616c37d024d7b8f35720b179e58ef', label: 'Volvo EX40 / XC40 Recharge CAD', polygons: 1451260 },
  ev9: { uid: '1e3c87edd3224342bc4eac5bf15a2d90', label: 'Kia EV9 AWD GT-Line CAD', polygons: 570138 },
  sealu: { uid: 'dda5d96fa79e42c290a279168126f247', label: 'BYD Seal U Comfort CAD', polygons: 178063 },
  'tiguan-phev': { uid: 'c8780d08e8dc4050a1287fa99c31824c', label: 'Volkswagen Tiguan eHybrid CAD', polygons: 812202 },
  'corolla-hev': { uid: '5a10b45f750e47a2a603ddf4d5b7014e', label: 'Toyota Corolla Touring Sports CAD', polygons: 1170788 },
  octavia: { uid: '1781cc6db0da484486bbe5f1175a4445', label: 'Škoda Octavia Combi CAD', polygons: 1335275 },
  'bmwx1-diesel': { uid: '3b22e6d5e0f1497da46bc59a3a8443c1', label: 'BMW X1 sDrive18d CAD', polygons: 1510366 },
  'q4-etron': { uid: '2a6e166ae0c3437ca26b4405b0a596b8', label: 'Audi Q4 45 e-tron CAD', polygons: 1641256 },
  'q6-etron': { uid: 'feed105b37ad4b65b6841604f2428468', label: 'Audi Q6 e-tron Performance CAD', polygons: 598417 },
  'a6-etron': { uid: '0c543362fef5438bbbf7b3d9c1743e73', label: 'Audi A6 Avant e-tron CAD', polygons: 1361798 },
  'bmw-i4': { uid: 'd03ad7b7b658431599379240cce1b310', label: 'BMW i4 eDrive40 Gran Coupé CAD', polygons: 1446113 },
  'bmw-ix2': { uid: '9ff602d3fdf74239bd2d1f54a2c85089', label: 'BMW iX2 eDrive20 CAD', polygons: 420377 },
  'mercedes-eqa': { uid: 'a03bcf4bc8f44d80ba2d8e40a1209e49', label: 'Mercedes-Benz EQA 250+ CAD', polygons: 1566617 },
  'mercedes-eqb': { uid: 'bdda9a96bee74db8bff2eca6514fd575', label: 'Mercedes-Benz EQB 250+ CAD', polygons: 479931 },
  'mercedes-eqe': { uid: '43643cf5bc26471083d66d0d3b85de4f', label: 'Mercedes-Benz EQE 300 CAD', polygons: 1060906 },
  polestar2: { uid: '6cb4a86a06ea46ce88417f7be8703e41', label: 'Polestar 2 Long Range CAD', polygons: 1948969 },
  polestar4: { uid: '3c1378064d134eaabd554ee09fb61180', label: 'Polestar SUV Coupé CAD', polygons: 1581458 },
  ioniq6: { uid: '84b503d8606542ae80c09a859e9fd2f2', label: 'Hyundai IONIQ 6 Streamliner CAD', polygons: 1005938 },
  'kona-ev': { uid: '343a128d7284471b91e7c4575910722e', label: 'Hyundai Kona Electric CAD', polygons: 248120 },
  inster: { uid: 'ef05a2c8885a430dabe82954e1814953', label: 'Hyundai Inster EV CAD', polygons: 107623 },
  tavascan: { uid: 'e85fdf3838e448478ee9bb8e51e166af', label: 'CUPRA Tavascan Endurance CAD', polygons: 665203 },
  'id-buzz': { uid: '9e7a3d129960447bb353a444185c47c3', label: 'Volkswagen ID. Buzz Pro CAD', polygons: 1731700 },
  e3008: { uid: '4f7c7318a29d4e16a6047c2d58bba28d', label: 'Peugeot E-3008 Allure CAD', polygons: 169523 },
  'e308-sw': { uid: 'e538cff86fef432287ec93c7c6f91931', label: 'Peugeot E-308 SW CAD', polygons: 257177 },
  'astra-st-ev': { uid: 'edbde7324cac4ca0b9b87848e688b7ba', label: 'Opel Astra Electric CAD', polygons: 933768 },
  mg4: { uid: 'ee2e3b0e1a7b481cb2c08e6fc6d2ed9e', label: 'MG4 Electric Luxury CAD', polygons: 1065136 },
  'byd-seal': { uid: '2e82d2aaaa3d47debf39b1160d3fe376', label: 'BYD Seal Design CAD', polygons: 136565 },
  'xpeng-g6': { uid: 'e787dac0c6f84be7b39362fca9dc93da', label: 'XPENG Smart EV CAD', polygons: 255703 },
  'macan-ev': { uid: '5d57f6dcabe7473f91b160595a3eb0cc', label: 'Porsche Macan Electric CAD', polygons: 481964 },
  'xc60-phev': { uid: 'd882db0be5f84b7b85b85a334054a55d', label: 'Volvo XC60 T6 AWD CAD', polygons: 1729412 },
  'passat-tdi': { uid: '41af8da6d8054229ba1f462cd25ba0b4', label: 'Volkswagen Passat Variant CAD', polygons: 394122 },
};

export function getCarDimensions(car: FahrwertCar): CarDimensions {
  const is800V = ['ioniq5', 'ioniq6', 'ev6', 'ev9', 'q6-etron', 'a6-etron', 'macan-ev', 'xpeng-g6'].includes(
    car.id
  );
  const isAwd = ['ev9', 'xc60-phev', 'macan-ev', 'my'].includes(car.id);
  const isFwd = [
    'r5',
    'inster',
    'kona-ev',
    'e3008',
    'e308-sw',
    'astra-st-ev',
    'ix1',
    'bmw-ix2',
    'mercedes-eqa',
    'mercedes-eqb',
    'tiguan-phev',
    'corolla-hev',
    'octavia',
  ].includes(car.id);

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

  const [xray, setXray] = useState<boolean>(initialXray);
  const [showDims, setShowDims] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [camPreset, setCamPreset] = useState<CameraPreset>('front34');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cadLoaded, setCadLoaded] = useState<boolean>(false);

  // Sync mode when parent toggles initialXray
  useEffect(() => {
    setXray(initialXray);
  }, [initialXray]);

  // Reset CAD iframe loaded state when car changes
  useEffect(() => {
    setCadLoaded(false);
  }, [car.id]);

  const dims = useMemo(() => getCarDimensions(car), [car]);
  const cadModel = useMemo(
    () =>
      CAD_MODELS_BY_CAR_ID[car.id] || {
        uid: '2212b2f00ae94beb8d07a1d9da663c48',
        label: `${car.brand} ${car.model} CAD`,
        polygons: 850000,
      },
    [car.id, car.brand, car.model]
  );

  // Store refs to Three.js X-Ray objects
  const sceneRefs = useRef<{
    dimsGroup?: THREE.Group;
    controls?: OrbitControls;
    camera?: THREE.PerspectiveCamera;
    wheels?: THREE.Object3D[];
    energyParticles?: THREE.Points;
  }>({});

  // Build the Three.js Holographic X-Ray Drivetrain & Skateboard Chassis stage when in `xray` mode
  useEffect(() => {
    if (!xray) return;
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    const isDark = pal.id === 'premium';
    scene.background = new THREE.Color('#0B1017');
    scene.fog = new THREE.Fog('#0B1017', 9.5, 22);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(4.0, 1.85, 4.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.55, 0);
    controls.minDistance = 2.4;
    controls.maxDistance = 9.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.15;

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 7, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    // Engineering Blueprint Floor & Grid
    const floorGeo = new THREE.CircleGeometry(12, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d14,
      roughness: 0.8,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(8, 20, 0x1e3a5f, 0x112236);
    gridHelper.position.y = 0.003;
    scene.add(gridHelper);

    const ringGeo = new THREE.RingGeometry(2.65, 2.69, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    scene.add(ring);

    const carRoot = new THREE.Group();
    scene.add(carRoot);

    const L = dims.lengthMm / 1000;
    const W = dims.widthMm / 1000;
    const H = dims.heightMm / 1000;
    const WB = dims.wheelbaseMm / 1000;
    const halfL = L / 2;

    const isVan = car.id === 'id-buzz';
    const isCoupeSuv = ['tavascan', 'polestar4', 'xpeng-g6', 'e3008', 'bmw-ix2', 'macan-ev', 'ev6'].includes(
      car.id
    );
    const isStreamliner = ['ioniq6', 'm3', 'byd-seal', 'bmw-i4', 'mercedes-eqe', 'polestar2'].includes(
      car.id
    );

    const wheelRadius = car.body === 'suv' ? 0.37 : car.body === 'hatchback' ? 0.33 : 0.35;
    const groundClearance = car.body === 'suv' ? 0.21 : 0.15;
    const beltH = groundClearance + (H - groundClearance) * 0.55;

    // ========================================================================
    // HOLOGRAPHIC MULTI-RIB LASER SILHOUETTE (NO SOLID EXTRUDED BLOCK)
    // ========================================================================
    const buildProfileCurve = (zOffset: number, heightScale: number): THREE.CatmullRomCurve3 => {
      const hRoof = H * heightScale;
      const pts: THREE.Vector3[] = [];
      pts.push(new THREE.Vector3(halfL * 0.96, groundClearance + 0.05, zOffset));
      pts.push(new THREE.Vector3(halfL * 0.99, beltH * 0.72, zOffset));
      pts.push(new THREE.Vector3(halfL * 0.88, beltH * 0.96, zOffset * 0.96));
      if (isVan) {
        pts.push(new THREE.Vector3(halfL * 0.65, beltH + 0.14, zOffset * 0.92));
        pts.push(new THREE.Vector3(halfL * 0.34, hRoof - 0.02, zOffset * 0.86));
      } else {
        pts.push(new THREE.Vector3(halfL * 0.44, beltH + 0.06, zOffset * 0.92));
        pts.push(new THREE.Vector3(halfL * 0.1, hRoof, zOffset * 0.82));
      }

      if (car.body === 'estate' || isVan) {
        pts.push(new THREE.Vector3(-halfL * 0.68, hRoof - 0.02, zOffset * 0.82));
        pts.push(new THREE.Vector3(-halfL * 0.95, beltH + 0.05, zOffset * 0.9));
      } else if (isCoupeSuv || isStreamliner) {
        pts.push(new THREE.Vector3(-halfL * 0.32, hRoof - 0.04, zOffset * 0.82));
        pts.push(new THREE.Vector3(-halfL * 0.92, beltH + 0.06, zOffset * 0.88));
      } else if (car.body === 'sedan') {
        pts.push(new THREE.Vector3(-halfL * 0.28, hRoof - 0.02, zOffset * 0.82));
        pts.push(new THREE.Vector3(-halfL * 0.64, beltH + 0.07, zOffset * 0.88));
        pts.push(new THREE.Vector3(-halfL * 0.96, beltH + 0.02, zOffset * 0.9));
      } else {
        pts.push(new THREE.Vector3(-halfL * 0.58, hRoof - 0.02, zOffset * 0.84));
        pts.push(new THREE.Vector3(-halfL * 0.95, beltH + 0.04, zOffset * 0.9));
      }
      pts.push(new THREE.Vector3(-halfL * 0.96, groundClearance + 0.06, zOffset));
      return new THREE.CatmullRomCurve3(pts, false);
    };

    const holoRibbonMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
    });
    const holoSpineMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.65,
    });

    // 5 Longitudinal Laser Body Contours (Left Outer, Left Roof Rail, Center Spine, Right Roof Rail, Right Outer)
    [
      [-W * 0.44, 0.92, false],
      [-W * 0.28, 0.98, false],
      [0, 1.0, true],
      [W * 0.28, 0.98, false],
      [W * 0.44, 0.92, false],
    ].forEach(([zOff, hScale, isCenter]) => {
      const curve = buildProfileCurve(zOff as number, hScale as number);
      const tubeGeo = new THREE.TubeGeometry(curve, 72, isCenter ? 0.014 : 0.01, 8, false);
      carRoot.add(new THREE.Mesh(tubeGeo, isCenter ? holoSpineMat : holoRibbonMat));
    });

    // Transverse Structural Cross-Bows (Front Fascia, A-Pillar, B-Pillar, C-Pillar, Rear Fascia)
    [
      [halfL * 0.88, beltH * 0.92, W * 0.82],
      [halfL * 0.42, beltH + 0.06, W * 0.8],
      [0, H * 0.98, W * 0.72],
      [-halfL * 0.45, H * 0.95, W * 0.72],
      [-halfL * 0.92, beltH * 0.96, W * 0.8],
    ].forEach(([xPos, yTop, spanW]) => {
      const bowCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xPos, groundClearance + 0.06, -spanW / 2),
        new THREE.Vector3(xPos, beltH, -spanW * 0.48),
        new THREE.Vector3(xPos, yTop, -spanW * 0.36),
        new THREE.Vector3(xPos, yTop + 0.02, 0),
        new THREE.Vector3(xPos, yTop, spanW * 0.36),
        new THREE.Vector3(xPos, beltH, spanW * 0.48),
        new THREE.Vector3(xPos, groundClearance + 0.06, spanW / 2),
      ]);
      const bowGeo = new THREE.TubeGeometry(bowCurve, 36, 0.009, 8, false);
      carRoot.add(new THREE.Mesh(bowGeo, holoRibbonMat));
    });

    // Lower Chassis Sill Rails
    [-W * 0.42, W * 0.42].forEach((zSill) => {
      const sillGeo = new THREE.BoxGeometry(WB * 0.86, 0.035, 0.04);
      const sill = new THREE.Mesh(sillGeo, holoRibbonMat);
      sill.position.set(0, groundClearance + 0.04, zSill);
      carRoot.add(sill);
    });

    // ========================================================================
    // 4 WHEELS WITH ALLOY RIMS, VENTILATED BRAKE DISCS & CALIPERS
    // ========================================================================
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.65,
      metalness: 0.25,
      transparent: true,
      opacity: 0.72,
    });
    const alloyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.88,
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: car.fuel === 'bev' ? 0x10b981 : 0xef4444,
      emissive: new THREE.Color(car.fuel === 'bev' ? 0x059669 : 0xdc2626),
      emissiveIntensity: 0.6,
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

      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.23, 36);
      tireGeo.rotateX(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(tireGeo, tireMat));

      const discGeo = new THREE.CylinderGeometry(wheelRadius * 0.66, wheelRadius * 0.66, 0.06, 28);
      discGeo.rotateX(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(discGeo, alloyMat));

      for (let s = 0; s < 5; s++) {
        const spokeGeo = new THREE.BoxGeometry(wheelRadius * 1.32, 0.042, 0.24);
        const spoke = new THREE.Mesh(spokeGeo, alloyMat);
        spoke.rotation.z = (s * Math.PI) / 5;
        wheelGroup.add(spoke);
      }

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.17, 0.25), caliperMat);
      caliper.position.set(wx - 0.14, wy + 0.04, wz);
      carRoot.add(caliper);

      carRoot.add(wheelGroup);
      wheelsList.push(wheelGroup);
    });

    // Axle shafts connecting left & right wheels
    [WB / 2, -WB / 2].forEach((axX) => {
      const axleGeo = new THREE.CylinderGeometry(0.028, 0.028, W * 0.88, 16);
      axleGeo.rotateX(Math.PI / 2);
      const axle = new THREE.Mesh(
        axleGeo,
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.25 })
      );
      axle.position.set(axX, wheelRadius, 0);
      carRoot.add(axle);
    });

    // ========================================================================
    // HIGH-VOLTAGE SKATEBOARD BATTERY PACK, CELL MODULES & ELECTRIC MOTORS
    // ========================================================================
    if (car.fuel === 'bev' || car.fuel === 'phev') {
      const packLen = car.fuel === 'bev' ? WB * 0.78 : WB * 0.42;
      const packW = W * 0.68;
      const packMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 0.85,
        metalness: 0.5,
        roughness: 0.2,
      });
      const packMesh = new THREE.Mesh(new THREE.BoxGeometry(packLen, 0.12, packW), packMat);
      packMesh.position.set(car.fuel === 'phev' ? -WB * 0.15 : 0, groundClearance + 0.07, 0);
      carRoot.add(packMesh);

      const cellMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x10b981),
        emissiveIntensity: 1.15,
      });
      const numModules = car.fuel === 'bev' ? 10 : 4;
      for (let m = 0; m < numModules; m++) {
        const modX =
          (car.fuel === 'phev' ? -WB * 0.15 : 0) -
          packLen * 0.43 +
          (m / Math.max(1, numModules - 1)) * (packLen * 0.86);
        const modMesh = new THREE.Mesh(
          new THREE.BoxGeometry(packLen / (numModules * 1.35), 0.145, packW * 0.88),
          cellMat
        );
        modMesh.position.set(modX, groundClearance + 0.08, 0);
        carRoot.add(modMesh);
      }

      const motorMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: new THREE.Color(0xd97706),
        emissiveIntensity: 1.3,
        metalness: 0.75,
        roughness: 0.2,
      });
      const motorGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.48, 28);
      motorGeo.rotateX(Math.PI / 2);

      if (dims.drivetrain === 'RWD' || dims.drivetrain === 'AWD') {
        const rearMotor = new THREE.Mesh(motorGeo, motorMat);
        rearMotor.position.set(-WB / 2, wheelRadius, 0);
        carRoot.add(rearMotor);
      }
      if (dims.drivetrain === 'FWD' || dims.drivetrain === 'AWD') {
        const frontMotor = new THREE.Mesh(motorGeo, motorMat);
        frontMotor.position.set(WB / 2, wheelRadius, 0);
        carRoot.add(frontMotor);
      }

      const hvCableMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: new THREE.Color(0xea580c),
        emissiveIntensity: 1.25,
      });
      const cableMesh = new THREE.Mesh(new THREE.BoxGeometry(WB, 0.04, 0.07), hvCableMat);
      cableMesh.position.set(0, groundClearance + 0.15, 0.12);
      carRoot.add(cableMesh);
    }

    if (car.fuel !== 'bev') {
      const engineMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: new THREE.Color(0xb91c1c),
        emissiveIntensity: 0.95,
        metalness: 0.65,
      });
      const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.48), engineMat);
      engineBlock.position.set(WB / 2 - 0.05, wheelRadius + 0.15, 0);
      carRoot.add(engineBlock);

      const exhaustPipe = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.78, 0.045, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
      );
      exhaustPipe.position.set(-0.15, groundClearance + 0.04, -0.18);
      carRoot.add(exhaustPipe);
    }

    // Energy Flow Particles inside X-Ray
    const pCount = 75;
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
      opacity: 0.95,
    });
    const energyParticles = new THREE.Points(pGeo, pMat);
    carRoot.add(energyParticles);

    // 3D Floor Dimension Lines
    const dimsGroup = new THREE.Group();
    dimsGroup.visible = showDims;
    const lineMat = new THREE.LineBasicMaterial({
      color: isDark ? 0xc9b18a : 0x38bdf8,
    });
    const lenPts = [
      new THREE.Vector3(-halfL, 0.015, W * 0.68),
      new THREE.Vector3(halfL, 0.015, W * 0.68),
    ];
    dimsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lenPts), lineMat));
    [-halfL, halfL].forEach((tx) => {
      const tickPts = [
        new THREE.Vector3(tx, 0.015, W * 0.6),
        new THREE.Vector3(tx, 0.015, W * 0.76),
      ];
      dimsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tickPts), lineMat));
    });
    const widPts = [
      new THREE.Vector3(halfL + 0.35, 0.015, -W / 2),
      new THREE.Vector3(halfL + 0.35, 0.015, W / 2),
    ];
    dimsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(widPts), lineMat));
    carRoot.add(dimsGroup);

    sceneRefs.current = {
      dimsGroup,
      controls,
      camera,
      wheels: wheelsList,
      energyParticles,
    };

    let reqId = 0;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();

      if (sceneRefs.current.wheels) {
        sceneRefs.current.wheels.forEach((w) => {
          w.rotation.z -= 0.032;
        });
      }

      if (sceneRefs.current.energyParticles) {
        const posAttr = sceneRefs.current.energyParticles.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          let x = posAttr.getX(i) - 0.024;
          if (x < -WB / 2) x = WB / 2;
          posAttr.setX(i, x);
        }
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

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
  }, [car.id, pal.id, dims, xray]);

  useEffect(() => {
    const r = sceneRefs.current;
    if (r.dimsGroup) {
      r.dimsGroup.visible = showDims;
    }
    if (r.controls) {
      r.controls.autoRotate = autoRotate;
    }
  }, [showDims, autoRotate]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setCamPreset(preset);
    const cam = sceneRefs.current.camera;
    const ctrl = sceneRefs.current.controls;
    if (!cam || !ctrl) return;
    ctrl.autoRotate = false;
    setAutoRotate(false);
    if (preset === 'front34') {
      cam.position.set(4.0, 1.85, 4.1);
    } else if (preset === 'side') {
      cam.position.set(0.05, 1.45, 5.2);
    } else if (preset === 'rear34') {
      cam.position.set(-4.1, 1.85, 4.0);
    } else if (preset === 'top') {
      cam.position.set(0.1, 6.0, 0.8);
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

  const sketchfabEmbedUrl = `https://sketchfab.com/models/${cadModel.uid}/embed?autostart=1&preload=1&ui_theme=dark&dnt=1&autospin=0.12&ui_infos=0&ui_watermark=0&ui_stop=0`;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isFullscreen ? undefined : '16/10',
        height: isFullscreen ? '100vh' : undefined,
        minHeight: 350,
        borderRadius: isFullscreen ? 0 : pal.id === 'fintech' ? 14 : 10,
        overflow: 'hidden',
        background: '#0B1017',
        border: `1px solid ${pal.line}`,
        userSelect: 'none',
      }}
    >
      {/* MODE 1: REAL HIGH-POLYGON 3D CAD MODEL VIEWER (DEFAULT) */}
      {!xray && (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 350 }}>
          {!cadLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'radial-gradient(circle at 50% 50%, #172130 0%, #0B1017 100%)',
                color: '#F2F0EB',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#38BDF8',
                  textTransform: 'uppercase',
                }}
              >
                {lang === 'sv'
                  ? `Laddar högupplöst 3D-CAD (${cadModel.polygons.toLocaleString('de-AT')} polygoner)…`
                  : `Lade hochauflösendes 3D-CAD (${cadModel.polygons.toLocaleString('de-AT')} Polygone)…`}
              </div>
              <div style={{ fontSize: 11, opacity: 0.72 }}>
                {car.brand} {car.model} · 360° WebGL Studio
              </div>
            </div>
          )}
          <iframe
            key={cadModel.uid}
            title={`${car.brand} ${car.model} 3D CAD`}
            src={sketchfabEmbedUrl}
            onLoad={() => setCadLoaded(true)}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            style={{
              width: '100%',
              height: '100%',
              minHeight: 350,
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* MODE 2: INTERACTIVE THREE.JS HOLOGRAPHIC X-RAY DRIVETRAIN & SKATEBOARD BATTERY STAGE */}
      {xray && (
        <div
          ref={mountRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: 350,
            cursor: 'grab',
          }}
        />
      )}

      {/* TOP-LEFT HUD: 3D Mode Badge + Polygon Count + Physical Dimensions */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          pointerEvents: 'none',
          zIndex: 5,
          maxWidth: '72%',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: pal.radiusBadge,
            background: 'rgba(11, 16, 23, 0.84)',
            backdropFilter: 'blur(8px)',
            color: '#FFFFFF',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.03em',
            border: '1px solid rgba(255,255,255,0.14)',
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
                ? '3D RÖNTGEN · HOLOGRAFISKT CHASSI, BATTERI & DRIVLINA'
                : '3D-RÖNTGEN · HOLOGRAMM-CHASSIS, BATTERIE & ANTRIEB'
              : lang === 'sv'
                ? `RIKTIG 3D-CAD · ${cadModel.polygons.toLocaleString('de-AT')} POLYGONER (DRA FÖR ATT ROTERA)`
                : `ECHTES 3D-CAD · ${cadModel.polygons.toLocaleString('de-AT')} POLYGONE (ZIEHEN ZUM DREHEN)`}
          </span>
        </div>

        {showDims && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[
              `${lang === 'sv' ? 'Längd' : 'Länge'}: ${dims.lengthMm.toLocaleString('de-AT')} mm`,
              `${lang === 'sv' ? 'Bredd' : 'Breite'}: ${dims.widthMm.toLocaleString('de-AT')} mm`,
              `${lang === 'sv' ? 'Hjulbas' : 'Radstand'}: ${dims.wheelbaseMm.toLocaleString('de-AT')} mm`,
              `${lang === 'sv' ? 'Bagage' : 'Kofferraum'}: ${dims.trunkLiters} L`,
            ].map((dChip) => (
              <span
                key={dChip}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2.5px 7px',
                  borderRadius: 5,
                  background: 'rgba(11, 16, 23, 0.78)',
                  color: '#F2F0EB',
                  fontVariantNumeric: 'tabular-nums',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {dChip}
              </span>
            ))}
          </div>
        )}

        {xray && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2.5px 7px',
                  borderRadius: 5,
                  background: 'rgba(2, 132, 199, 0.88)',
                  color: '#FFFFFF',
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TOP-RIGHT HUD: Mode Switcher + Camera Presets (in X-Ray) + Fullscreen */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: 5,
          flexWrap: 'wrap',
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={() => setXray(false)}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: !xray ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            background: !xray ? '#0E7C5A' : 'rgba(11, 16, 23, 0.82)',
            color: '#FFFFFF',
            backdropFilter: 'blur(6px)',
          }}
        >
          🧊 {lang === 'sv' ? '3D-Modell (CAD)' : '3D-Modell (CAD)'}
        </button>

        <button
          type="button"
          onClick={() => setXray(true)}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: xray ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            background: xray ? '#0284C7' : 'rgba(11, 16, 23, 0.82)',
            color: '#FFFFFF',
            backdropFilter: 'blur(6px)',
          }}
        >
          ⚡ {lang === 'sv' ? '3D Röntgen' : '3D-Röntgen'}
        </button>

        <button
          type="button"
          onClick={() => setShowDims((v) => !v)}
          title={lang === 'sv' ? 'Visa/dölj mått' : 'Maße ein-/ausblenden'}
          style={{
            padding: '5px 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            background: showDims ? 'rgba(15, 26, 23, 0.9)' : 'rgba(11, 16, 23, 0.65)',
            color: '#FFFFFF',
          }}
        >
          📏 {lang === 'sv' ? 'Mått' : 'Maße'}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          title={lang === 'sv' ? 'Helskärm' : 'Vollbild'}
          style={{
            padding: '5px 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            background: 'rgba(11, 16, 23, 0.82)',
            color: '#FFFFFF',
          }}
        >
          ⛶
        </button>
      </div>

      {/* BOTTOM HUD (Only shown in X-Ray mode for camera angles & auto-rotate) */}
      {xray && (
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
            padding: '7px 12px',
            borderRadius: 9,
            background: 'rgba(11, 16, 23, 0.84)',
            backdropFilter: 'blur(10px)',
            color: '#FFFFFF',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {(
              [
                ['front34', lang === 'sv' ? '3/4 Fram' : '3/4 Front'],
                ['side', lang === 'sv' ? 'Sida' : 'Seite'],
                ['rear34', lang === 'sv' ? '3/4 Bak' : '3/4 Heck'],
                ['top', lang === 'sv' ? 'Uppifrån' : 'Draufsicht'],
              ] as Array<[CameraPreset, string]>
            ).map(([pKey, pLabel]) => (
              <button
                key={pKey}
                type="button"
                onClick={() => applyCameraPreset(pKey)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 5,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10.5,
                  fontWeight: 700,
                  background:
                    camPreset === pKey && !autoRotate
                      ? '#0284C7'
                      : 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                }}
              >
                {pLabel}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            style={{
              padding: '4px 9px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10.5,
              fontWeight: 700,
              background: autoRotate ? '#10B981' : 'rgba(255,255,255,0.12)',
              color: '#FFFFFF',
            }}
          >
            ↻ {lang === 'sv' ? '360° Rotation' : '360° Drehung'}
          </button>
        </div>
      )}
    </div>
  );
};
