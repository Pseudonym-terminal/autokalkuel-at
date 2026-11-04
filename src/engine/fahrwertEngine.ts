import { Language } from '../types';

export type CountryCode = 'AT' | 'DE' | 'SE';
export type SituationId = 'privat' | 'angestellt' | 'ordination' | 'selbst';
export type FahrwertFormKey = 'kauf' | 'leasing' | 'dienstwagen' | 'firma';
export type ProvenanceStatus = 'gesetz' | 'markt' | 'schaetzung' | 'angebot' | 'user';
export type DesignDirection = 'fintech' | 'premium';
export type FuelType = 'bev' | 'phev' | 'hev' | 'petrol' | 'diesel';
export type BodyCategory = 'suv' | 'hatchback' | 'estate' | 'sedan';

export interface PartnerOffer {
  lessor: string;
  rate: number;
  down: number;
  term: number;
  km: number;
  service: boolean;
  valid: string;
}

export interface FahrwertCar {
  id: string;
  slug: string;
  brand: string;
  model: string;
  body: BodyCategory;
  fuel: FuelType;
  price: number; // Base AT gross list price in EUR
  range: number; // WLTP range in km
  kwh: number; // kWh/100km
  l: number; // l/100km
  co2: number; // g/km
  kw: number; // Peak power kW
  cont: number; // 30-min continuous power kW (Feld P.2)
  mass: number; // Eigengewicht kg (Feld G)
  img: string; // filename in public/cars/
  offer?: PartnerOffer;
}

export interface CarOverrides {
  disc?: number | null;
  res?: number | null;
  elec?: number | null;
  lease?: number | null;
  leaseDown?: number | null;
  ins?: number | null;
}

export interface FahrwertLine {
  l: string;
  v: number;
  st: ProvenanceStatus;
  note: string;
  info: boolean;
}

export interface FahrwertScenarioResult {
  key: FahrwertFormKey;
  label: string;
  lines: FahrwertLine[];
  span: number;
  total: number;
  lo: number;
  hi: number;
  hasOffer: boolean;
}

export interface FahrwertCarCalc {
  kauf: FahrwertScenarioResult;
  leasing: FahrwertScenarioResult;
  dienstwagen: FahrwertScenarioResult;
  firma: FahrwertScenarioResult;
  meta: {
    list: number;
    P: number;
    rEst: number;
    r: number;
    motorTaxMonthly: number;
    novaPct: number;
    vorsteuerBackMonthly: number;
    sachbezugMonthly: number;
  };
}

export interface PaletteTokens {
  id: DesignDirection;
  name: string;
  bg: string;
  headerBg: string;
  selBg: string;
  selFg: string;
  offBg: string;
  offFg: string;
  line: string;
  lineStrong: string;
  ink: string;
  subInk: string;
  muted: string;
  faint: string;
  accent: string;
  accentHover: string;
  accentFg: string;
  card: string;
  inputBg: string;
  sitOn: string;
  sitOnFg: string;
  sitOnSub: string;
  good: string;
  warn: string;
  bad: string;
  rowOn: string;
  stageBg: string;
  radiusCard: string;
  radiusControl: string;
  radiusBadge: string;
  fontFamily: string;
  headingStretch: string;
  brandText: string;
  st: Record<ProvenanceStatus, { bg: string; fg: string }>;
}

export const PALETTES: Record<DesignDirection, PaletteTokens> = {
  fintech: {
    id: 'fintech',
    name: 'Fintech (Light)',
    bg: '#F4F5F1',
    headerBg: 'rgba(244,245,241,0.9)',
    selBg: '#0F1A17',
    selFg: '#FFFFFF',
    offBg: '#FFFFFF',
    offFg: '#2C3631',
    line: '#E3E6E0',
    lineStrong: '#D5D9D2',
    ink: '#0F1A17',
    subInk: '#47524C',
    muted: '#5D6862',
    faint: '#9AA39C',
    accent: '#0E7C5A',
    accentHover: '#0B6A4C',
    accentFg: '#F4F5F1',
    card: '#FFFFFF',
    inputBg: '#F4F5F1',
    sitOn: '#0F1A17',
    sitOnFg: '#FFFFFF',
    sitOnSub: '#B9C4BE',
    good: '#0E7C5A',
    warn: '#B7791F',
    bad: '#C2412D',
    rowOn: '#EEF5F0',
    stageBg: 'linear-gradient(180deg, #F4F6F2, #E6EAE3)',
    radiusCard: '20px',
    radiusControl: '12px',
    radiusBadge: '999px',
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif",
    headingStretch: '100%',
    brandText: 'fahrwert',
    st: {
      gesetz: { bg: '#E6ECF5', fg: '#2B4A72' },
      markt: { bg: '#E2F3EA', fg: '#0E6B4D' },
      schaetzung: { bg: '#FBEFD9', fg: '#8A5A12' },
      angebot: { bg: '#0E7C5A', fg: '#FFFFFF' },
      user: { bg: '#0F1A17', fg: '#FFFFFF' },
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium (Dark)',
    bg: '#0C0C0D',
    headerBg: 'rgba(12,12,13,0.92)',
    selBg: '#F2F0EB',
    selFg: '#0C0C0D',
    offBg: 'transparent',
    offFg: '#E4E1DA',
    line: '#222225',
    lineStrong: '#2A2A2E',
    ink: '#F2F0EB',
    subInk: '#CFCCC5',
    muted: '#BDBAB3',
    faint: '#86837D',
    accent: '#C9B18A',
    accentHover: '#D9C4A0',
    accentFg: '#0C0C0D',
    card: '#151517',
    inputBg: '#0C0C0D',
    sitOn: '#F2F0EB',
    sitOnFg: '#0C0C0D',
    sitOnSub: '#4A4842',
    good: '#8FD1A6',
    warn: '#C99B3A',
    bad: '#C4553E',
    rowOn: '#1C1C1F',
    stageBg: 'radial-gradient(ellipse at 50% 70%, #F1EFEA 0%, #DCD9D3 75%)',
    radiusCard: '14px',
    radiusControl: '8px',
    radiusBadge: '6px',
    fontFamily: "'Archivo', system-ui, -apple-system, sans-serif",
    headingStretch: '112%',
    brandText: 'FAHRWERT',
    st: {
      gesetz: { bg: '#232830', fg: '#B9C8DA' },
      markt: { bg: '#1D2A23', fg: '#9ED3B0' },
      schaetzung: { bg: '#2E2820', fg: '#E2C48F' },
      angebot: { bg: '#C9B18A', fg: '#0C0C0D' },
      user: { bg: '#F2F0EB', fg: '#0C0C0D' },
    },
  },
};

/**
 * All 24 real car models with studio-cutout photographs in public/cars/
 */
export const FAHRWERT_CARS: FahrwertCar[] = [
  {
    id: 'enyaq',
    slug: 'skoda-enyaq-85',
    brand: 'Škoda',
    model: 'Enyaq 85',
    body: 'suv',
    fuel: 'bev',
    price: 50990,
    range: 577,
    kwh: 16.7,
    l: 0,
    co2: 0,
    kw: 210,
    cont: 70,
    mass: 2068,
    img: 'skoda-enyaq.jpg',
    offer: {
      lessor: 'Porsche Bank Österreich',
      rate: 439,
      down: 3000,
      term: 48,
      km: 15000,
      service: false,
      valid: '31.12.2026',
    },
  },
  {
    id: 'id7',
    slug: 'vw-id7-tourer-pro-s',
    brand: 'VW',
    model: 'ID.7 Tourer Pro S',
    body: 'estate',
    fuel: 'bev',
    price: 62990,
    range: 685,
    kwh: 15.8,
    l: 0,
    co2: 0,
    kw: 210,
    cont: 79,
    mass: 2193,
    img: 'vw-id-7-tourer.jpg',
    offer: {
      lessor: 'Porsche Bank Österreich',
      rate: 529,
      down: 3500,
      term: 48,
      km: 15000,
      service: false,
      valid: '31.12.2026',
    },
  },
  {
    id: 'ev3',
    slug: 'kia-ev3-long-range',
    brand: 'Kia',
    model: 'EV3 Long Range (81,4 kWh)',
    body: 'suv',
    fuel: 'bev',
    price: 41990,
    range: 605,
    kwh: 15.5,
    l: 0,
    co2: 0,
    kw: 150,
    cont: 75,
    mass: 1885,
    img: 'kia-ev3.jpg',
    offer: {
      lessor: 'Kia Finance Austria',
      rate: 359,
      down: 2500,
      term: 48,
      km: 15000,
      service: false,
      valid: '31.12.2026',
    },
  },
  {
    id: 'my',
    slug: 'tesla-model-y-lr',
    brand: 'Tesla',
    model: 'Model Y Long Range',
    body: 'suv',
    fuel: 'bev',
    price: 49990,
    range: 586,
    kwh: 16.2,
    l: 0,
    co2: 0,
    kw: 378,
    cont: 85,
    mass: 1978,
    img: 'tesla-model-y.jpg',
    offer: {
      lessor: 'Tesla Financial Services',
      rate: 449,
      down: 2990,
      term: 48,
      km: 15000,
      service: false,
      valid: '31.12.2026',
    },
  },
  {
    id: 'ioniq5',
    slug: 'hyundai-ioniq-5-84',
    brand: 'Hyundai',
    model: 'IONIQ 5 84 kWh RWD GO! Plus',
    body: 'suv',
    fuel: 'bev',
    price: 45990,
    range: 570,
    kwh: 17.0,
    l: 0,
    co2: 0,
    kw: 168,
    cont: 56,
    mass: 2060,
    img: 'hyundai-ioniq-5.jpg',
    offer: {
      lessor: ' Denzel Lease / Hyundai Finance AT',
      rate: 399,
      down: 2900,
      term: 48,
      km: 15000,
      service: false,
      valid: '31.12.2026',
    },
  },
  {
    id: 'ix1',
    slug: 'bmw-ix1-edrive20',
    brand: 'BMW',
    model: 'iX1 eDrive20',
    body: 'suv',
    fuel: 'bev',
    price: 49950,
    range: 475,
    kwh: 16.4,
    l: 0,
    co2: 0,
    kw: 150,
    cont: 70,
    mass: 1940,
    img: 'bmw-ix1.jpg',
    offer: {
      lessor: 'BMW Bank Austria',
      rate: 519,
      down: 3500,
      term: 36,
      km: 10000,
      service: true,
      valid: '30.11.2026',
    },
  },
  {
    id: 'id3',
    slug: 'vw-id3-pro-s',
    brand: 'VW',
    model: 'ID.3 Pro S (77 kWh)',
    body: 'hatchback',
    fuel: 'bev',
    price: 41990,
    range: 559,
    kwh: 15.9,
    l: 0,
    co2: 0,
    kw: 170,
    cont: 70,
    mass: 1934,
    img: 'vw-id-3.jpg',
  },
  {
    id: 'born',
    slug: 'cupra-born-vz-79',
    brand: 'CUPRA',
    model: 'Born 79 kWh e-Boost',
    body: 'hatchback',
    fuel: 'bev',
    price: 42990,
    range: 594,
    kwh: 15.8,
    l: 0,
    co2: 0,
    kw: 170,
    cont: 70,
    mass: 1930,
    img: 'cupra-born.jpg',
  },
  {
    id: 'r5',
    slug: 'renault-5-e-tech-52',
    brand: 'Renault',
    model: '5 E-Tech 52 kWh Comfort Range',
    body: 'hatchback',
    fuel: 'bev',
    price: 32990,
    range: 410,
    kwh: 14.9,
    l: 0,
    co2: 0,
    kw: 110,
    cont: 57,
    mass: 1450,
    img: 'renault-5-e-tech.jpg',
    offer: {
      lessor: 'Mobilize Lease&Co',
      rate: 279,
      down: 2000,
      term: 48,
      km: 15000,
      service: false,
      valid: '31.01.2027',
    },
  },
  {
    id: 'elroq',
    slug: 'skoda-elroq-85',
    brand: 'Škoda',
    model: 'Elroq 85',
    body: 'suv',
    fuel: 'bev',
    price: 43990,
    range: 580,
    kwh: 15.7,
    l: 0,
    co2: 0,
    kw: 210,
    cont: 70,
    mass: 2000,
    img: 'skoda-elroq.jpg',
  },
  {
    id: 'ev6',
    slug: 'kia-ev6-84',
    brand: 'Kia',
    model: 'EV6 84 kWh RWD',
    body: 'suv',
    fuel: 'bev',
    price: 53990,
    range: 582,
    kwh: 16.9,
    l: 0,
    co2: 0,
    kw: 168,
    cont: 70,
    mass: 2055,
    img: 'kia-ev6.jpg',
  },
  {
    id: 'ex30',
    slug: 'volvo-ex30-er',
    brand: 'Volvo',
    model: 'EX30 Single Motor Extended Range',
    body: 'suv',
    fuel: 'bev',
    price: 41790,
    range: 476,
    kwh: 16.7,
    l: 0,
    co2: 0,
    kw: 200,
    cont: 65,
    mass: 1850,
    img: 'volvo-ex30.jpg',
    offer: {
      lessor: 'VCFS Austria',
      rate: 379,
      down: 2500,
      term: 48,
      km: 15000,
      service: true,
      valid: '31.12.2026',
    },
  },
  {
    id: 'i5',
    slug: 'bmw-i5-touring-edrive40',
    brand: 'BMW',
    model: 'i5 Touring eDrive40',
    body: 'estate',
    fuel: 'bev',
    price: 74200,
    range: 560,
    kwh: 17.6,
    l: 0,
    co2: 0,
    kw: 250,
    cont: 81,
    mass: 2225,
    img: 'bmw-i5-touring.jpg',
  },
  {
    id: 'id4',
    slug: 'vw-id4-pro',
    brand: 'VW',
    model: 'ID.4 Pro (77 kWh)',
    body: 'suv',
    fuel: 'bev',
    price: 47990,
    range: 550,
    kwh: 16.3,
    l: 0,
    co2: 0,
    kw: 210,
    cont: 70,
    mass: 2117,
    img: 'vw-id-4.jpg',
    offer: {
      lessor: 'Porsche Bank Österreich',
      rate: 419,
      down: 3000,
      term: 48,
      km: 15000,
      service: false,
      valid: '31.12.2026',
    },
  },
  {
    id: 'm3',
    slug: 'tesla-model-3-lr',
    brand: 'Tesla',
    model: 'Model 3 Maximale Reichweite RWD',
    body: 'sedan',
    fuel: 'bev',
    price: 45970,
    range: 702,
    kwh: 13.5,
    l: 0,
    co2: 0,
    kw: 235,
    cont: 88,
    mass: 1822,
    img: 'tesla-model-3.jpg',
  },
  {
    id: 'scenic',
    slug: 'renault-scenic-e-tech-87',
    brand: 'Renault',
    model: 'Scenic E-Tech 87 kWh Long Range',
    body: 'suv',
    fuel: 'bev',
    price: 48490,
    range: 625,
    kwh: 16.8,
    l: 0,
    co2: 0,
    kw: 160,
    cont: 62,
    mass: 1917,
    img: 'renault-scenic-e-tech.jpg',
  },
  {
    id: 'explorer',
    slug: 'ford-explorer-ev-77',
    brand: 'Ford',
    model: 'Explorer Extended Range RWD (77 kWh)',
    body: 'suv',
    fuel: 'bev',
    price: 47900,
    range: 602,
    kwh: 15.6,
    l: 0,
    co2: 0,
    kw: 210,
    cont: 70,
    mass: 2090,
    img: 'ford-explorer.jpg',
  },
  {
    id: 'ex40',
    slug: 'volvo-ex40-er',
    brand: 'Volvo',
    model: 'EX40 Single Motor Extended Range',
    body: 'suv',
    fuel: 'bev',
    price: 53990,
    range: 572,
    kwh: 16.9,
    l: 0,
    co2: 0,
    kw: 185,
    cont: 75,
    mass: 2075,
    img: 'volvo-ex40.jpg',
  },
  {
    id: 'ev9',
    slug: 'kia-ev9-awd',
    brand: 'Kia',
    model: 'EV9 99,8 kWh AWD Earth (7-Sitzer)',
    body: 'suv',
    fuel: 'bev',
    price: 76990,
    range: 512,
    kwh: 22.3,
    l: 0,
    co2: 0,
    kw: 283,
    cont: 112,
    mass: 2648,
    img: 'kia-ev9.jpg',
  },
  {
    id: 'sealu',
    slug: 'byd-seal-u-comfort',
    brand: 'BYD',
    model: 'SEAL U Comfort (87 kWh)',
    body: 'suv',
    fuel: 'bev',
    price: 45480,
    range: 500,
    kwh: 20.5,
    l: 0,
    co2: 0,
    kw: 160,
    cont: 65,
    mass: 2147,
    img: 'byd-seal-u.jpg',
  },
  {
    id: 'tiguan-phev',
    slug: 'vw-tiguan-ehybrid',
    brand: 'VW',
    model: 'Tiguan 1.5 eHybrid (PHEV)',
    body: 'suv',
    fuel: 'phev',
    price: 53890,
    range: 118,
    kwh: 11.5,
    l: 2.2,
    co2: 11,
    kw: 150,
    cont: 110,
    mass: 1890,
    img: 'vw-tiguan.jpg',
  },
  {
    id: 'corolla-hev',
    slug: 'toyota-corolla-ts-hybrid',
    brand: 'Toyota',
    model: 'Corolla Touring Sports 1.8 Hybrid',
    body: 'estate',
    fuel: 'hev',
    price: 35890,
    range: 920,
    kwh: 0,
    l: 4.7,
    co2: 103,
    kw: 103,
    cont: 72,
    mass: 1440,
    img: 'toyota-corolla-touring-sports.jpg',
  },
  {
    id: 'octavia',
    slug: 'skoda-octavia-combi-tsi',
    brand: 'Škoda',
    model: 'Octavia Combi 1.5 TSI mHEV',
    body: 'estate',
    fuel: 'petrol',
    price: 36690,
    range: 900,
    kwh: 0,
    l: 5.9,
    co2: 134,
    kw: 110,
    cont: 0,
    mass: 1400,
    img: 'skoda-octavia-combi.jpg',
  },
  {
    id: 'bmwx1-diesel',
    slug: 'bmw-x1-sdrive18d',
    brand: 'BMW',
    model: 'X1 sDrive18d (Diesel)',
    body: 'suv',
    fuel: 'diesel',
    price: 49100,
    range: 980,
    kwh: 0,
    l: 5.2,
    co2: 133,
    kw: 110,
    cont: 110,
    mass: 1650,
    img: 'bmw-x1.jpg',
  },
];

export interface CountrySpec {
  code: CountryCode;
  nameDe: string;
  nameSv: string;
  locale: string;
  cur: 'EUR' | 'SEK';
  pf: number;
  elec: number;
  petrol: number;
  insBase: number;
  insRate: number;
  maintBev: number;
  maintIce: number;
  tyres: number;
  alt: number;
  lease: number;
  marg: number;
  vat: number;
  dwDe: string;
  dwSv: string;
  firmDe: string;
  firmSv: string;
  ordinationDe: string;
  ordinationSv: string;
  taxNameDe: string;
  taxNameSv: string;
  taxRefDe: string;
  taxRefSv: string;
  benNameDe: string;
  benNameSv: string;
  benRefDe: string;
  benRefSv: string;
  vatShare: (listPrice: number, car: FahrwertCar, vatExempt?: boolean) => number;
  sources: string[];
}

export const COUNTRIES: Record<CountryCode, CountrySpec> = {
  AT: {
    code: 'AT',
    nameDe: 'Österreich',
    nameSv: 'Österrike',
    locale: 'de-AT',
    cur: 'EUR',
    pf: 1,
    elec: 0.29,
    petrol: 1.56,
    insBase: 320,
    insRate: 0.011,
    maintBev: 32,
    maintIce: 62,
    tyres: 16,
    alt: 0.028,
    lease: 0.0089,
    marg: 48,
    vat: 0.2,
    dwDe: 'Dienstwagen',
    dwSv: 'Tjänstebil (Sachbezug)',
    firmDe: 'Firmenwagen / GmbH',
    firmSv: 'Företagsbil / GmbH',
    ordinationDe: 'Ordination / EPU (USt-befreit)',
    ordinationSv: 'Ordination / EPU (Momsbefriad)',
    taxNameDe: 'Motorbez. Versicherungssteuer',
    taxNameSv: 'Motorbez. Versicherungssteuer (AT)',
    taxRefDe: '§ 6 VersStG – E-Autos seit 04/2025 (Dauerleistung −45 kW & Gewicht −900 kg)',
    taxRefSv: '§ 6 VersStG – Elbilar fr.o.m. 04/2025 (30-min effekt −45 kW & vikt −900 kg)',
    benNameDe: 'Sachbezug',
    benNameSv: 'Sachbezug (Förmånsvärde)',
    benRefDe: '§ 4 Sachbezugswerte-VO: 0 % E-Auto · 1,5 % (≤ 126 g) / 2 % Verbrenner',
    benRefSv: '§ 4 Sachbezugswerte-VO: 0 % elbil · 1,5 % (≤ 126 g) / 2 % förbränning',
    vatShare: (l, c, vatExempt) => {
      if (vatExempt) return 0; // § 6 Abs 1 Z 19 UStG Heilbehandlung -> 0 € Vorsteuerabzug
      return c.fuel !== 'bev' ? 0 : l <= 40000 ? 1 : l <= 80000 ? 40000 / l : 0;
    },
    sources: [
      'BMF – NoVA, § 6 NoVAG 1991 (0 % für 0 g/km CO₂)',
      'BMF / oesterreich.gv.at – Motorbezogene Versicherungssteuer (§ 6 VersStG ab 04/2025)',
      'USP.gv.at – Sachbezug Kraftfahrzeug (§ 4 Sachbezugswerteverordnung)',
      'USP.gv.at – Vorsteuerabzug & Luxustangente 40.000 € (§ 12 Abs. 2 Z 2b UStG)',
      'RIS – § 6 Abs. 1 Z 19 UStG & § 22 EStG (USt-befreite Heilbehandlung / Ordination & 20 % Öko-IFB)',
      'E-Control & ÖAMTC / Eurotax Österreich – Strompreise, Restwerte & Wartung',
    ],
  },
  DE: {
    code: 'DE',
    nameDe: 'Deutschland',
    nameSv: 'Tyskland',
    locale: 'de-DE',
    cur: 'EUR',
    pf: 0.97,
    elec: 0.37,
    petrol: 1.74,
    insBase: 280,
    insRate: 0.01,
    maintBev: 34,
    maintIce: 64,
    tyres: 16,
    alt: 0.025,
    lease: 0.0087,
    marg: 42,
    vat: 0.19,
    dwDe: 'Dienstwagen',
    dwSv: 'Tjänstebil (1 %-regeln)',
    firmDe: 'Firmenwagen',
    firmSv: 'Företagsbil',
    ordinationDe: 'Praxis / Freiberufler (USt-befreit)',
    ordinationSv: 'Mottagning / Freiberufler (Momsbefriad)',
    taxNameDe: 'Kfz-Steuer',
    taxNameSv: 'Kfz-Steuer (Fordonsskatt)',
    taxRefDe: 'KraftStG – E-Autos befreit bis 31.12.2030',
    taxRefSv: 'KraftStG – Elbilar skattebefriade t.o.m. 31.12.2030',
    benNameDe: 'Geldwerter Vorteil',
    benNameSv: 'Geldwerter Vorteil (Förmån)',
    benRefDe: '§ 6 Abs. 1 Nr. 4 EStG: 0,25 % E-Auto · 1 % + 0,03 %/km Verbrenner',
    benRefSv: '§ 6 Abs. 1 Nr. 4 EStG: 0,25 % elbil · 1 % + 0,03 %/km förbränning',
    vatShare: (_l, _c, vatExempt) => (vatExempt ? 0 : 1),
    sources: [
      '§ 6 Abs. 1 Nr. 4 EStG – 1 %-Regel & 0,25 %-E-Auto-Privileg',
      '§ 8 Abs. 2 EStG – Arbeitsweg 0,03 %',
      'KraftStG – Steuerbefreiung E-Fahrzeuge',
      '§ 4 Nr. 14 UStG – Umsatzsteuerbefreite Heilbehandlung',
      'ADAC Autokosten & BDEW – Wartung, Restwerte & Haushaltsstrompreis',
    ],
  },
  SE: {
    code: 'SE',
    nameDe: 'Schweden',
    nameSv: 'Sverige',
    locale: 'sv-SE',
    cur: 'SEK',
    pf: 11.4,
    elec: 2.3,
    petrol: 17.9,
    insBase: 3600,
    insRate: 0.012,
    maintBev: 380,
    maintIce: 700,
    tyres: 180,
    alt: 0.025,
    lease: 0.0095,
    marg: 52,
    vat: 0.25,
    dwDe: 'Förmånsbil',
    dwSv: 'Förmånsbil',
    firmDe: 'Firmenbil (Momspliktig)',
    firmSv: 'Företagsbil (50 % lyftbar moms)',
    ordinationDe: 'Vårdmottagning (Momsbefriad)',
    ordinationSv: 'Sjukvård / Mottagning (0 % momsavdrag)',
    taxNameDe: 'Fordonsskatt',
    taxNameSv: 'Fordonsskatt',
    taxRefDe: 'Vägtrafikskattelag – 360 kr/år E-Auto · Malus bei Verbrennern',
    taxRefSv: 'Vägtrafikskattelag – 360 kr/år elbil · Malus för bensin/diesel',
    benNameDe: 'Förmånsvärde',
    benNameSv: 'Förmånsvärde',
    benRefDe: '61 kap. IL – E-Auto-Nybilspris reduziert (schablon עד 350.000 kr)',
    benRefSv: '61 kap. IL – Nedsatt förmånsvärde för elbil (max 350 000 kr)',
    vatShare: (_l, _c, vatExempt) => (vatExempt ? 0 : 0.5),
    sources: [
      'Skatteverket – Förmånsvärde för bil (61 kap. IL)',
      'Transportstyrelsen – Fordonsskatt & Bonus-Malus',
      'Mervärdesskattelagen (ML) – Momsbefriad sjukvård & 50 % lyftbar leasingmoms',
      'Energimarknadsbyrån & Konsumentverket – Elpris & bilkostnader',
    ],
  },
};

export interface SituationDef {
  id: SituationId;
  titleDe: string;
  titleSv: string;
  descDe: string;
  descSv: string;
  forms: FahrwertFormKey[];
  vatExempt: boolean;
  isOrdination: boolean;
}

export const SITUATIONS: Record<SituationId, SituationDef> = {
  privat: {
    id: 'privat',
    titleDe: 'Privat',
    titleSv: 'Privat',
    descDe: 'Ich kaufe oder lease selbst.',
    descSv: 'Jag köper eller leasar bilen privat.',
    forms: ['kauf', 'leasing'],
    vatExempt: false,
    isOrdination: false,
  },
  angestellt: {
    id: 'angestellt',
    titleDe: 'Angestellt',
    titleSv: 'Anställd (Tjänstebil)',
    descDe: 'Mein Arbeitgeber bietet einen Dienstwagen (0 % Sachbezug für E-Autos in AT).',
    descSv: 'Min arbetsgivare erbjuder tjänstebil / Dienstwagen (0 % förmånsskatt för elbil i AT).',
    forms: ['kauf', 'leasing', 'dienstwagen'],
    vatExempt: false,
    isOrdination: false,
  },
  ordination: {
    id: 'ordination',
    titleDe: '🩺 Ordination / Heilbehandlung',
    titleSv: '🩺 Sjukvård / Ordination (Ej GmbH)',
    descDe:
      'USt-befreite Praxis / EPU (§ 6 Abs. 1 Z 19 UStG): 0 € Vorsteuerabzug, Brutto-AfA bis 40.000 € & 20 % Öko-IFB direkt gegen ESt.',
    descSv:
      'Momsbefriad sjukvård / mottagning (§ 6 UStG, ej GmbH): 0 € momsavdrag, kostnader inkl. moms upp till 40 000 € & 20 % Öko-IFB dras av mot ESt.',
    forms: ['kauf', 'leasing', 'firma'],
    vatExempt: true,
    isOrdination: true,
  },
  selbst: {
    id: 'selbst',
    titleDe: 'Selbstständig / GmbH',
    titleSv: 'Eget företag / GmbH (Momspliktigt)',
    descDe:
      'Vorsteuerabzugsfähiges Unternehmen oder GmbH (in AT voller USt-Abzug für E-Autos bis 40.000 €).',
    descSv:
      'Momspliktig verksamhet eller eget GmbH (i Österrike fullt momsavdrag för elbil upp till 40 000 €).',
    forms: ['kauf', 'leasing', 'firma'],
    vatExempt: false,
    isOrdination: false,
  },
};

export function calcMotorTaxMonthly(c: FahrwertCar, k: CountrySpec): number {
  if (k.code === 'AT') {
    if (c.fuel === 'bev') {
      const kw = Math.max(0, c.cont - 45);
      const m = Math.max(0, c.mass - 900);
      return (
        Math.min(kw, 35) * 0.25 +
        Math.max(0, Math.min(kw - 35, 25)) * 0.35 +
        Math.max(0, kw - 60) * 0.45 +
        Math.min(m, 500) * 0.015 +
        Math.max(0, Math.min(m - 500, 700)) * 0.03 +
        Math.max(0, m - 1200) * 0.045
      );
    }
    return Math.max(0, c.kw - 65) * 0.72 + Math.max(0, c.co2 - 115) * 0.72;
  }
  if (k.code === 'DE') {
    return c.fuel === 'bev' ? 0 : (Math.max(0, c.co2 - 95) * 2 + 30) / 12;
  }
  return c.fuel === 'bev' ? 30 : (360 + Math.max(0, c.co2 - 75) * 107) / 12;
}

export function calcNovaPercent(c: FahrwertCar, k: CountrySpec): number {
  if (k.code !== 'AT' || c.fuel === 'bev' || c.co2 === 0) return 0;
  const raw = (c.co2 - 94) / 5;
  return Math.max(0, Math.min(80, Math.round(raw)));
}

export function calcBenefitMonthly(
  c: FahrwertCar,
  k: CountrySpec,
  list: number,
  commuteKm: number
): number {
  if (k.code === 'AT') {
    return c.fuel === 'bev'
      ? 0
      : c.co2 <= 126
        ? Math.min(list * 0.015, 720)
        : Math.min(list * 0.02, 960);
  }
  if (k.code === 'DE') {
    const f = c.fuel === 'bev' ? (list <= 100000 ? 0.25 : 0.5) : c.fuel === 'phev' ? 0.5 : 1;
    return list * f * 0.01 + list * f * 0.0003 * commuteKm;
  }
  const eff = c.fuel === 'bev' ? list - Math.min(350000, list * 0.5) : list;
  return (0.29 * 59200 + eff * (0.7 * 0.0255 + 0.01) + eff * 0.09) / 12;
}

export function fmtCurrency(v: number, k: CountrySpec): string {
  return new Intl.NumberFormat(k.locale, {
    style: 'currency',
    currency: k.cur,
    maximumFractionDigits: 0,
  }).format(v);
}

export function fmtSignedCurrency(v: number, k: CountrySpec): string {
  return (v < 0 ? '− ' : '') + fmtCurrency(Math.abs(v), k);
}

export interface CalcStateInput {
  term: number;
  km: number;
  bizSharePct: number; // e.g. 70% business usage
  marg: number | null;
  commute: number;
  sit: SituationId;
  lang: Language;
}

export function calcFahrwertCar(
  c: FahrwertCar,
  k: CountrySpec,
  s: CalcStateInput,
  ov?: CarOverrides
): FahrwertCarCalc {
  const overrides = ov || {};
  const lang = s.lang;
  const sitDef = SITUATIONS[s.sit] || SITUATIONS.angestellt;
  const vatExempt = sitDef.vatExempt;
  const isOrdination = sitDef.isOrdination;

  const n = s.term;
  const yrs = n / 12;
  const km = s.km;
  const bizShare = Math.max(0.1, Math.min(1, (s.bizSharePct || 70) / 100));
  const marg = (s.marg ?? k.marg) / 100;
  const list = c.price * k.pf;
  const P = list * (1 - (overrides.disc || 0) / 100);
  const elec = overrides.elec != null ? overrides.elec : k.elec;
  const en = (km / 12 / 100) * (c.kwh * elec + (c.l || 0) * k.petrol);
  const ins =
    overrides.ins != null ? overrides.ins : (k.insBase + P * k.insRate) / 12;
  const ist: ProvenanceStatus = overrides.ins != null ? 'user' : 'schaetzung';
  const tax = calcMotorTaxMonthly(c, k);
  const novaPct = calcNovaPercent(c, k);
  const maint =
    (c.fuel === 'bev' ? k.maintBev : k.maintIce) * Math.sqrt(km / 15000) +
    k.tyres;

  let r =
    1 -
    (0.2 + 0.085 * (yrs - 1)) -
    ((km - 15000) / 5000) * 0.012 -
    (c.fuel === 'bev' ? 0.03 : 0);
  r = Math.min(0.85, Math.max(0.18, r));
  const rEst = r;
  if (overrides.res != null) {
    r = overrides.res / 100;
  }

  const dep = (P * (1 - r)) / n;
  const dSpan = (P * 0.06) / n;
  const cap = (((P * (1 + r)) / 2) * k.alt) / 12;

  const enNote =
    c.kwh > 0
      ? `${c.kwh.toLocaleString('de-AT')} kWh/100 km · ${elec.toLocaleString('de-AT')} ${
          k.cur === 'EUR' ? '€' : 'kr'
        }/kWh`
      : `${c.l.toLocaleString('de-AT')} l/100 km`;

  const ln = (
    l: string,
    v: number,
    st: ProvenanceStatus,
    note = '',
    info = false
  ): FahrwertLine => ({
    l,
    v,
    st,
    note,
    info,
  });

  // 1. Barkauf / Kontantköp
  const kauf: FahrwertScenarioResult = {
    key: 'kauf',
    label: lang === 'sv' ? 'Kontantköp' : 'Barkauf',
    lines: [
      ln(
        lang === 'sv' ? 'Värdeminskning' : 'Wertverlust',
        dep,
        overrides.res != null ? 'user' : 'schaetzung',
        lang === 'sv'
          ? `Restvärde ${Math.round(r * 100)} % efter ${n} månader`
          : `Restwert ${Math.round(r * 100)} % nach ${n} Monaten`
      ),
      ln(
        lang === 'sv' ? 'Kapitalkostnad' : 'Kapitalkosten',
        cap,
        'schaetzung',
        lang === 'sv'
          ? `${(k.alt * 100).toFixed(1).replace('.', ',')} % alternativavkastning`
          : `${(k.alt * 100).toFixed(1).replace('.', ',')} % entgangene Rendite`
      ),
      ln(
        lang === 'sv' ? 'Energi (El / Bränsle)' : 'Energie',
        en,
        overrides.elec != null ? 'user' : 'markt',
        enNote
      ),
      ln(
        lang === 'sv' ? 'Försäkring (Helförsäkring)' : 'Versicherung',
        ins,
        ist,
        overrides.ins != null
          ? lang === 'sv'
            ? 'Från din offert'
            : 'Aus deiner Offerte'
          : lang === 'sv'
            ? 'Helförsäkring (Vollkasko), riktvärde'
            : 'Vollkasko, Richtwert'
      ),
      ln(
        lang === 'sv' ? k.taxNameSv : k.taxNameDe,
        tax,
        'gesetz',
        lang === 'sv' ? k.taxRefSv : k.taxRefDe
      ),
      ln(
        lang === 'sv' ? 'Service & vinterdäck' : 'Service & Reifen',
        maint,
        'schaetzung',
        lang === 'sv'
          ? 'Serviceintervall & vinterhjul'
          : 'Herstellerintervall, Winterreifen'
      ),
    ],
    span: dSpan,
    total: 0,
    lo: 0,
    hi: 0,
    hasOffer: false,
  };

  // 2. Privatleasing
  const off = c.offer;
  let rate: number;
  let down: number;
  let lst: ProvenanceStatus;
  let svc = false;

  if (overrides.lease) {
    rate = overrides.lease;
    down = overrides.leaseDown || 0;
    lst = 'user';
  } else if (off) {
    rate = off.rate * k.pf;
    down = off.down * k.pf;
    lst = 'angebot';
    svc = off.service;
  } else {
    rate =
      P *
      k.lease *
      Math.pow(48 / n, 0.3) *
      Math.pow(km / 15000, 0.35);
    down = P * 0.06;
    lst = 'schaetzung';
  }

  const leasing: FahrwertScenarioResult = {
    key: 'leasing',
    label: 'Privatleasing',
    lines: [
      ln(
        lang === 'sv' ? 'Leasingavgift / mån' : 'Leasingrate',
        rate,
        lst,
        lst === 'angebot' && off
          ? `${off.lessor} · ${lang === 'sv' ? 'giltig t.o.m.' : 'gültig bis'} ${off.valid}`
          : lst === 'user'
            ? lang === 'sv'
              ? 'Från din offert'
              : 'Aus deinem Angebot'
            : lang === 'sv'
              ? 'Modellerad från listpris'
              : 'Modelliert aus Listenpreis'
      ),
      ln(
        lang === 'sv' ? 'Första förhöjd avgift (utslagen)' : 'Anzahlung anteilig',
        down / n,
        lst,
        lang === 'sv'
          ? `engångsbelopp ${fmtCurrency(down, k)} ÷ ${n} mån`
          : `einmalig ${fmtCurrency(down, k)} ÷ ${n}`
      ),
      ln(
        lang === 'sv' ? 'Energi (El / Bränsle)' : 'Energie',
        en,
        overrides.elec != null ? 'user' : 'markt',
        enNote
      ),
      ln(
        lang === 'sv' ? 'Försäkring' : 'Versicherung',
        ins,
        ist,
        overrides.ins != null
          ? lang === 'sv'
            ? 'Från din offert'
            : 'Aus deiner Offerte'
          : lang === 'sv'
            ? 'Vollkasko krävs vid leasing'
            : 'Vollkasko meist Pflicht'
      ),
      ln(
        lang === 'sv' ? k.taxNameSv : k.taxNameDe,
        tax,
        'gesetz',
        lang === 'sv' ? k.taxRefSv : k.taxRefDe
      ),
      ln(
        lang === 'sv' ? 'Service & vinterdäck' : 'Service & Reifen',
        svc ? 0 : maint * 0.8,
        svc ? 'angebot' : 'schaetzung',
        svc
          ? lang === 'sv'
            ? 'ingår i leasingerbjudandet'
            : 'im Angebot enthalten'
          : lang === 'sv'
            ? 'service under leasingtiden'
            : 'Wartung beim Leasing selbst'
      ),
    ],
    span: lst === 'schaetzung' ? rate * 0.1 : 0,
    total: 0,
    lo: 0,
    hi: 0,
    hasOffer: false,
  };

  // 3. Dienstwagen / Tjänstebil
  const ben = calcBenefitMonthly(c, k, list, s.commute);
  const dienstwagen: FahrwertScenarioResult = {
    key: 'dienstwagen',
    label: lang === 'sv' ? k.dwSv : k.dwDe,
    lines: [
      ln(
        `${lang === 'sv' ? k.benNameSv : k.benNameDe} (${
          lang === 'sv' ? 'beskattningsbart' : 'steuerpflichtig'
        })`,
        ben,
        'gesetz',
        lang === 'sv' ? k.benRefSv : k.benRefDe,
        true
      ),
      ln(
        lang === 'sv' ? 'Förmånsskatt på lönen' : 'Lohnsteuer darauf',
        ben * marg,
        'gesetz',
        `${Math.round(marg * 100)} % ${
          lang === 'sv' ? 'marginalskatt' : 'Grenzsteuersatz'
        }`
      ),
      ln(
        lang === 'sv' ? 'Egenavgift / nettolöneavdrag' : 'Eigenanteil',
        0,
        'user',
        lang === 'sv' ? 'enligt tjänstebilspolicy' : 'laut Dienstwagenregelung'
      ),
    ],
    span: 0,
    total: 0,
    lo: 0,
    hi: 0,
    hasOffer: false,
  };

  // 4. Firma / Ordination (supports both USt-befreite Heilbehandlung & Vorsteuer-berechtigte Firma/GmbH)
  const gross = dep + cap + en + ins + tax + maint;
  const vShare = k.vatShare(P, c, vatExempt);
  const vatBack = (dep + maint + en) * (k.vat / (1 + k.vat)) * vShare;
  const capLimit = 40000 * k.pf;
  const luxFactor = k.code === 'AT' ? Math.min(1, capLimit / P) : 1;

  // In Austria, 0 g/km BEVs also receive the 20 % Öko-Investitionsfreibetrag (Öko-IFB, § 10 EStG) on the capped acquisition base
  const oekoIfbMonthlyBase =
    k.code === 'AT' && c.fuel === 'bev'
      ? (Math.min(P * (1 - (k.vat / (1 + k.vat)) * vShare), capLimit) * 0.2 * bizShare) / n
      : 0;
  const oekoIfbTaxShield = oekoIfbMonthlyBase * marg;

  // Deductible business expense tax shield (capped at 40.000 € Luxustangente on depreciation/finance)
  const deductibleBase =
    ((dep + cap + ins) * luxFactor + (en + tax + maint) - vatBack) * bizShare;
  const incomeTaxSave = deductibleBase * marg;

  const privTax =
    k.code === 'AT' ? 0 : isOrdination ? 0 : ben * marg;

  const firmaLabel = isOrdination
    ? lang === 'sv'
      ? k.ordinationSv
      : k.ordinationDe
    : lang === 'sv'
      ? k.firmSv
      : k.firmDe;

  const firmaLines: FahrwertLine[] = [
    ln(
      lang === 'sv' ? 'Fordonets bruttokostnad totalt' : 'Fahrzeugkosten gesamt (Brutto)',
      gross,
      'schaetzung',
      lang === 'sv'
        ? 'som vid köp i verksamheten (inkl. 20 % moms)'
        : 'wie Barkauf im Betrieb (inkl. USt.)'
    ),
    ln(
      lang === 'sv'
        ? vatExempt
          ? 'Momsavdrag (§ 6 Abs. 1 Z 19 UStG Sjukvård)'
          : 'Momsavdrag (Vorsteuerabzug)'
        : vatExempt
          ? 'Vorsteuerabzug (§ 6 Abs. 1 Z 19 UStG Heilbehandlung)'
          : 'Vorsteuerabzug',
      -vatBack,
      'gesetz',
      vatExempt
        ? lang === 'sv'
          ? '0 € momsavdrag vid momsbefriad sjukvård – hela bruttokostnaden dras av i rörelsen'
          : '0 € Vorsteuerabzug bei USt-befreiter Ordination – Bruttobetrag zählt als Betriebsausgabe'
        : k.code === 'AT'
          ? c.fuel === 'bev'
            ? lang === 'sv'
              ? 'fullt upp till 40 000 €, delvis 40–80 000 €'
              : 'voll bis 40.000 €, anteilig bis 80.000 €'
            : lang === 'sv'
              ? '0 € momsavdrag för personbil med CO₂ > 0 g/km'
              : 'kein Vorsteuerabzug für PKW > 0 g/km'
          : k.code === 'DE'
            ? '19 % voll abziehbar'
            : '50 % lyftbar moms'
    ),
    ln(
      lang === 'sv'
        ? `Skattereduktion driftskostnad & AfA (${Math.round(marg * 100)} % ESt)`
        : `Steuerersparnis Betriebsausgabe (${Math.round(marg * 100)} % ESt)`,
      -incomeTaxSave,
      'gesetz',
      k.code === 'AT'
        ? lang === 'sv'
          ? `${Math.round(bizShare * 100)} % tjänsteandel · Luxustangente-tak 40 000 € (${
              vatExempt ? 'brutto inkl. moms' : 'netto'
            })`
          : `${Math.round(bizShare * 100)} % betrieblich · Luxustangente 40.000 € (${
              vatExempt ? 'Brutto-AfA inkl. USt.' : 'Netto-AfA'
            })`
        : `${Math.round(marg * 100)} % Grenzsteuersatz`
    ),
  ];

  if (oekoIfbTaxShield > 0) {
    firmaLines.push(
      ln(
        lang === 'sv'
          ? '20 % Öko-Investitionsfreibetrag (§ 10 EStG)'
          : '20 % Öko-Investitionsfreibetrag (§ 10 EStG)',
        -oekoIfbTaxShield,
        'gesetz',
        lang === 'sv'
          ? 'Extra 20 % skatteavdrag för 0 g/km elbil i Österrike (upp till 40 000 €)'
          : 'Zusätzlicher 20 % Freibetrag für 0 g/km E-Autos in Österreich (bis 40.000 €)'
      )
    );
  }

  firmaLines.push(
    ln(
      lang === 'sv' ? 'Privat nyttjande (Privatanteil)' : 'Privatnutzung versteuern',
      privTax,
      'gesetz',
      k.code === 'AT'
        ? lang === 'sv'
          ? `0 € Sachbezug i Ordination/EPU – privatandelen (${Math.round(
              (1 - bizShare) * 100
            )} %) är redan borträknad`
          : `0 € Sachbezug in Ordination/EPU – Privatanteil (${Math.round(
              (1 - bizShare) * 100
            )} %) bereits ausgeschieden`
        : lang === 'sv'
          ? k.benRefSv
          : k.benRefDe
    )
  );

  const firma: FahrwertScenarioResult = {
    key: 'firma',
    label: firmaLabel,
    lines: firmaLines,
    span: dSpan * (1 - marg * bizShare),
    total: 0,
    lo: 0,
    hi: 0,
    hasOffer: false,
  };

  const scenarios = { kauf, leasing, dienstwagen, firma };
  (Object.values(scenarios) as FahrwertScenarioResult[]).forEach((f) => {
    f.total = Math.max(
      0,
      f.lines.filter((x) => !x.info).reduce((acc, x) => acc + x.v, 0)
    );
    f.lo = Math.max(0, f.total - f.span);
    f.hi = f.total + f.span;
    f.hasOffer = f.lines.some((x) => x.st === 'angebot' || x.st === 'user');
  });

  return {
    ...scenarios,
    meta: {
      list,
      P,
      rEst,
      r,
      motorTaxMonthly: tax,
      novaPct,
      vorsteuerBackMonthly: vatBack,
      sachbezugMonthly: ben,
    },
  };
}
