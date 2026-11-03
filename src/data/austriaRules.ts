import { AustrianProfile, BundeslandId, TraceSource } from '../types';

export interface BundeslandInfo {
  id: BundeslandId;
  nameDe: string;
  nameSv: string;
  capital: string;
  gridOperator: string;
  homeElectricityEurKwh: number; // All-in incl. Energiepreis, Netzentgelt, Abgaben & 20% USt
  netzentgeltCentKwh: number;
  insuranceRegionFactor: number; // 1.00 average, higher in Wien/urban, lower in rural alpine
  defaultParkingEur: number;
}

export const BUNDESLAENDER: Record<BundeslandId, BundeslandInfo> = {
  wien: {
    id: 'wien',
    nameDe: 'Wien (Wiener Netze)',
    nameSv: 'Wien (Wiener Netze)',
    capital: 'Wien',
    gridOperator: 'Wiener Netze GmbH',
    homeElectricityEurKwh: 0.278,
    netzentgeltCentKwh: 7.4,
    insuranceRegionFactor: 1.12,
    defaultParkingEur: 10, // Wiener Parkpickerl (€120/Jahr = €10/Monat)
  },
  noe: {
    id: 'noe',
    nameDe: 'Niederösterreich (Netz NÖ)',
    nameSv: 'Niederösterreich (Netz NÖ)',
    capital: 'St. Pölten',
    gridOperator: 'Netz Niederösterreich GmbH',
    homeElectricityEurKwh: 0.304,
    netzentgeltCentKwh: 9.6,
    insuranceRegionFactor: 0.98,
    defaultParkingEur: 0,
  },
  ooe: {
    id: 'ooe',
    nameDe: 'Oberösterreich (Netz OÖ)',
    nameSv: 'Oberösterreich (Netz OÖ)',
    capital: 'Linz',
    gridOperator: 'Netz Oberösterreich GmbH',
    homeElectricityEurKwh: 0.289,
    netzentgeltCentKwh: 8.3,
    insuranceRegionFactor: 0.99,
    defaultParkingEur: 0,
  },
  stmk: {
    id: 'stmk',
    nameDe: 'Steiermark (Energienetze Stmk)',
    nameSv: 'Steiermark (Energienetze Stmk)',
    capital: 'Graz',
    gridOperator: 'Energienetze Steiermark GmbH',
    homeElectricityEurKwh: 0.298,
    netzentgeltCentKwh: 9.1,
    insuranceRegionFactor: 1.0,
    defaultParkingEur: 0,
  },
  tirol: {
    id: 'tirol',
    nameDe: 'Tirol (TIWAG-Netz)',
    nameSv: 'Tyrolen / Tirol (TIWAG-Netz)',
    capital: 'Innsbruck',
    gridOperator: 'TIWAG-Netz AG',
    homeElectricityEurKwh: 0.242,
    netzentgeltCentKwh: 6.8,
    insuranceRegionFactor: 0.96,
    defaultParkingEur: 0,
  },
  kaernten: {
    id: 'kaernten',
    nameDe: 'Kärnten (Kärnten Netz)',
    nameSv: 'Kärnten (Kärnten Netz)',
    capital: 'Klagenfurt',
    gridOperator: 'Kärnten Netz GmbH',
    homeElectricityEurKwh: 0.308,
    netzentgeltCentKwh: 9.9,
    insuranceRegionFactor: 0.95,
    defaultParkingEur: 0,
  },
  salzburg: {
    id: 'salzburg',
    nameDe: 'Salzburg (Salzburg Netz)',
    nameSv: 'Salzburg (Salzburg Netz)',
    capital: 'Salzburg',
    gridOperator: 'Salzburg Netz GmbH',
    homeElectricityEurKwh: 0.282,
    netzentgeltCentKwh: 7.9,
    insuranceRegionFactor: 1.01,
    defaultParkingEur: 0,
  },
  vorarlberg: {
    id: 'vorarlberg',
    nameDe: 'Vorarlberg (Vorarlberger Netz)',
    nameSv: 'Vorarlberg (Vorarlberger Netz)',
    capital: 'Bregenz',
    gridOperator: 'Vorarlberger Energienetze GmbH',
    homeElectricityEurKwh: 0.228,
    netzentgeltCentKwh: 6.1,
    insuranceRegionFactor: 0.94,
    defaultParkingEur: 0,
  },
  burgenland: {
    id: 'burgenland',
    nameDe: 'Burgenland (Netz Burgenland)',
    nameSv: 'Burgenland (Netz Burgenland)',
    capital: 'Eisenstadt',
    gridOperator: 'Netz Burgenland GmbH',
    homeElectricityEurKwh: 0.302,
    netzentgeltCentKwh: 9.4,
    insuranceRegionFactor: 0.92,
    defaultParkingEur: 0,
  },
};

export interface AustrianMunicipality {
  plz: string;
  name: string;
  bundesland: BundeslandId;
}

export const AUSTRIAN_MUNICIPALITIES: AustrianMunicipality[] = [
  { plz: '1010', name: 'Wien – Innere Stadt', bundesland: 'wien' },
  { plz: '1020', name: 'Wien – Leopoldstadt', bundesland: 'wien' },
  { plz: '1030', name: 'Wien – Landstraße', bundesland: 'wien' },
  { plz: '1100', name: 'Wien – Favoriten', bundesland: 'wien' },
  { plz: '1190', name: 'Wien – Döbling', bundesland: 'wien' },
  { plz: '1220', name: 'Wien – Donaustadt', bundesland: 'wien' },
  { plz: '3100', name: 'St. Pölten', bundesland: 'noe' },
  { plz: '2700', name: 'Wiener Neustadt', bundesland: 'noe' },
  { plz: '2500', name: 'Baden bei Wien', bundesland: 'noe' },
  { plz: '3400', name: 'Klosterneuburg', bundesland: 'noe' },
  { plz: '3500', name: 'Krems an der Donau', bundesland: 'noe' },
  { plz: '2340', name: 'Mödling', bundesland: 'noe' },
  { plz: '3300', name: 'Amstetten', bundesland: 'noe' },
  { plz: '2320', name: 'Schwechat', bundesland: 'noe' },
  { plz: '4020', name: 'Linz', bundesland: 'ooe' },
  { plz: '4600', name: 'Wels', bundesland: 'ooe' },
  { plz: '4400', name: 'Steyr', bundesland: 'ooe' },
  { plz: '4060', name: 'Leonding', bundesland: 'ooe' },
  { plz: '4840', name: 'Vöcklabruck', bundesland: 'ooe' },
  { plz: '4810', name: 'Gmunden', bundesland: 'ooe' },
  { plz: '4910', name: 'Ried im Innkreis', bundesland: 'ooe' },
  { plz: '8010', name: 'Graz', bundesland: 'stmk' },
  { plz: '8700', name: 'Leoben', bundesland: 'stmk' },
  { plz: '8605', name: 'Kapfenberg', bundesland: 'stmk' },
  { plz: '8600', name: 'Bruck an der Mur', bundesland: 'stmk' },
  { plz: '8430', name: 'Leibnitz', bundesland: 'stmk' },
  { plz: '8970', name: 'Schladming', bundesland: 'stmk' },
  { plz: '6020', name: 'Innsbruck', bundesland: 'tirol' },
  { plz: '6330', name: 'Kufstein', bundesland: 'tirol' },
  { plz: '6410', name: 'Telfs', bundesland: 'tirol' },
  { plz: '6060', name: 'Hall in Tirol', bundesland: 'tirol' },
  { plz: '6130', name: 'Schwaz', bundesland: 'tirol' },
  { plz: '6370', name: 'Kitzbühel', bundesland: 'tirol' },
  { plz: '9900', name: 'Lienz', bundesland: 'tirol' },
  { plz: '9020', name: 'Klagenfurt am Wörthersee', bundesland: 'kaernten' },
  { plz: '9500', name: 'Villach', bundesland: 'kaernten' },
  { plz: '9400', name: 'Wolfsberg', bundesland: 'kaernten' },
  { plz: '9800', name: 'Spittal an der Drau', bundesland: 'kaernten' },
  { plz: '5020', name: 'Salzburg', bundesland: 'salzburg' },
  { plz: '5400', name: 'Hallein', bundesland: 'salzburg' },
  { plz: '5760', name: 'Saalfelden am Steinernen Meer', bundesland: 'salzburg' },
  { plz: '5700', name: 'Zell am See', bundesland: 'salzburg' },
  { plz: '5600', name: 'St. Johann im Pongau', bundesland: 'salzburg' },
  { plz: '6900', name: 'Bregenz', bundesland: 'vorarlberg' },
  { plz: '6850', name: 'Dornbirn', bundesland: 'vorarlberg' },
  { plz: '6800', name: 'Feldkirch', bundesland: 'vorarlberg' },
  { plz: '6890', name: 'Lustenau', bundesland: 'vorarlberg' },
  { plz: '6700', name: 'Bludenz', bundesland: 'vorarlberg' },
  { plz: '7000', name: 'Eisenstadt', bundesland: 'burgenland' },
  { plz: '7400', name: 'Oberwart', bundesland: 'burgenland' },
  { plz: '7100', name: 'Neusiedl am See', bundesland: 'burgenland' },
];

export const OFFICIAL_SOURCES: Record<string, TraceSource> = {
  bmfNova: {
    title: 'Normverbrauchsabgabe (NoVA) – Berechnungsformel PKW (§ 6 NoVAG 1991)',
    authority: 'BMF – Bundesministerium für Finanzen',
    url: 'https://www.bmf.gv.at/themen/steuern/kraftfahrzeuge/normverbrauchsabgabe.html',
    retrievedAt: '2026-10-15',
    lawRef: '§ 6 NoVAG 1991 idF AbgÄG 2024/2025',
  },
  bmfMotorsteuer: {
    title: 'Motorbezogene Versicherungssteuer (inkl. E-Auto-Steuerpflicht ab 04/2025)',
    authority: 'BMF / oesterreich.gv.at',
    url: 'https://www.oesterreich.gv.at/themen/mobilitat/kfz/steuer_und_zoll/motorbezogene_versicherungssteuer.html',
    retrievedAt: '2026-10-15',
    lawRef: '§ 6 Abs. 1 Z 3 VersStG 1953 idF BSMG 2025',
  },
  bmfSachbezug: {
    title: 'Sachbezug PKW & Elektrofahrzeuge (0 % bei 0 g/km CO₂)',
    authority: 'BMF / USP.gv.at',
    url: 'https://www.usp.gv.at/mitarbeiter-und-gesundheit/entgelt/sachbezuege/kraftfahrzeug-sachbezug.html',
    retrievedAt: '2026-10-15',
    lawRef: '§ 4 Sachbezugswerteverordnung',
  },
  bmfVorsteuer: {
    title: 'Vorsteuerabzug & Luxustangente bei Elektro-PKW (40.000 € / 80.000 € Grenze)',
    authority: 'USP.gv.at – Unternehmensserviceportal',
    url: 'https://www.usp.gv.at/steuern-finanzen/umsatzsteuer/vorsteuerabzug/vorsteuerabzug-pkw.html',
    retrievedAt: '2026-10-15',
    lawRef: '§ 12 Abs. 2 Z 2a UStG & PKW-Angemessenheitsverordnung',
  },
  bmfHeilbehandlungUst: {
    title: 'Unechte Umsatzsteuerbefreiung für Heilbehandlungen / Ärzt:innen (Kein Vorsteuerabzug) & Betriebsausgabenabzug inkl. USt',
    authority: 'BMF / USP.gv.at – Gesundheitsberufe & Freiberufler',
    url: 'https://www.usp.gv.at/steuern-finanzen/umsatzsteuer/steuerbefreiungen/unechte-steuerbefreiung.html',
    retrievedAt: '2026-10-15',
    lawRef: '§ 6 Abs. 1 Z 19 UStG, § 12 Abs. 3 UStG & § 22 EStG',
  },
  bmfKilometergeld: {
    title: 'Amtliches Kilometergeld PKW (0,50 €/km ab 2025)',
    authority: 'BMF / oesterreich.gv.at',
    url: 'https://www.bmf.gv.at/themen/steuern/arbeitnehmerinnenveranlagung/pendlerfoerderung-das-pendlerpauschale/kilometergeld.html',
    retrievedAt: '2026-10-15',
    lawRef: 'Reisegebührenvorschrift / § 26 Z 4 EStG',
  },
  econtrolStrom: {
    title: 'E-Control Tarifkalkulator & Systemnutzungsentgelte-Verordnung 2026',
    authority: 'E-Control Austria',
    url: 'https://www.e-control.at/konsumenten/service-und-beratung/toolbox/tarifkalkulator',
    retrievedAt: '2026-10-15',
    lawRef: 'SNE-V 2026 (E-Control)',
  },
  oeamtcAutokosten: {
    title: 'ÖAMTC Autokostenberechnung, Restwert- & Wartungstabellen Österreich',
    authority: 'ÖAMTC / Eurotax Österreich',
    url: 'https://www.oeamtc.at/themen/autokauf/',
    retrievedAt: '2026-10-15',
    lawRef: 'ÖAMTC / Eurotax Methodik 2026',
  },
  asfinagVignette: {
    title: 'ASFINAG Digitale Jahresvignette & §57a-Begutachtung ("Pickerl" 3-2-1 Regel)',
    authority: 'ASFINAG / bmk.gv.at',
    url: 'https://www.asfinag.at/maut-vignette/vignette/',
    retrievedAt: '2026-10-15',
    lawRef: '§ 57a KFG 1967 & Mauttarifverordnung',
  },
};

export const AUSTRIAN_MARKET_CONSTANTS = {
  vatRate: 0.2, // 20% Mehrwertsteuer (USt) in Österreich
  koestRate: 0.23, // 23% Körperschaftsteuer (KöSt) für GmbH
  kestRate: 0.275, // 27.5% Kapitalertragsteuer (KESt) auf Ausschüttungen
  lohnnebenkostenRate: 0.0706, // DB (3.7%) + DZ (~0.36%) + KommSt (3.0%) = ~7.06%
  kilometergeldPerKm: 0.5, // €0.50/km amtliches Kilometergeld in AT
  luxustangenteGross: 40000, // €40.000 Angemessenheitsgrenze (PKW-AngemessenheitsVO)
  vorsteuerZeroThresholdGross: 80000, // >€80.000 kein Vorsteuerabzug bei E-PKW
  maxVorsteuerDeductionEur: 40000 - 40000 / 1.2, // €6.666,67 max real VAT shield
  publicChargingEurKwh: 0.54, // AC/DC-Mix (Wien Energie / SMATRICS / IONITY / ÖAMTC ePower)
  petrolSuper95EurL: 1.56, // E-Control Spritpreisrechner Schnitt Österreich
  dieselEurL: 1.58, // E-Control Spritpreisrechner Schnitt Österreich
  referenceLoanRate: 0.0545, // 5.45% Porsche Bank / Santander AT Referenzkredit
  alternativeReturnRate: 0.028, // 2.8% Netto-Alternativrendite (Bundesschatz / Tagesgeld nach KESt)
  vignetteAnnualEur: 103.8, // ASFINAG Jahresvignette PKW
  pickerlInspectionEur: 84, // §57a Pickerl-Überprüfung (3-2-1 Intervall)
  zulassungsgebuehrEur: 218.5, // Einmalige KFZ-Zulassungsgebühr & Kennzeichen in Österreich
};

export const DEFAULT_AUSTRIAN_PROFILE: AustrianProfile = {
  kmPerYear: 15000,
  businessKmPerYear: 0,
  bundesland: 'wien',
  municipality: 'Wien – Innere Stadt',
  taxBracket: 0.4,
  grossMonthlySalary: 4500,
  access: {
    ownGmbh: false,
    soleTrader: false,
    employerBenefitCar: false,
    employerSalaryExchange: false,
  },
  vatExempt: false,
  gmbhPayoutChannel: 'salary',
  holdingMonths: 36,
  hasHomeCharger: true,
  includeVignette: true,
  parkingMonthly: 0,
  ageBand: '30-49',
};

export interface ProfilePreset {
  id: string;
  labelDe: string;
  labelSv: string;
  descDe: string;
  descSv: string;
  patch: Partial<AustrianProfile>;
}

export const AUSTRIAN_PROFILE_PRESETS: ProfilePreset[] = [
  {
    id: 'sjukvard-ordination',
    labelDe: '🩺 Ärzt:in / Heilbehandlung (Ordination · USt-befreit)',
    labelSv: '🩺 Sjukvård / Ordination (Ej GmbH · Momsbefriad)',
    descDe: 'Kein GmbH, 0 € Vorsteuerabzug (§ 6 Abs 1 Z 19 UStG), Brutto-AfA & Betriebskosten gegen 48 % ESt',
    descSv: 'Ingen moms på sjukvård (0 € momsavdrag), ej GmbH – avdrag inkl. moms mot 48 % inkomstskatt (ESt)',
    patch: {
      kmPerYear: 18000,
      businessKmPerYear: 11000,
      bundesland: 'wien',
      taxBracket: 0.48,
      vatExempt: true,
      access: {
        ownGmbh: false,
        soleTrader: true,
        employerBenefitCar: false,
        employerSalaryExchange: false,
      },
      hasHomeCharger: true,
      holdingMonths: 36,
    },
  },
  {
    id: 'standard-at',
    labelDe: 'Standard Österreich (Privat)',
    labelSv: 'Standard Österrike (Privat)',
    descDe: '15.000 km/Jahr · Wien · 40 % Grenzsteuer · Heimladen',
    descSv: '15 000 km/år · Wien · 40 % marginalskatt · Hemmaladdning',
    patch: {
      kmPerYear: 15000,
      businessKmPerYear: 0,
      bundesland: 'wien',
      taxBracket: 0.4,
      vatExempt: false,
      access: {
        ownGmbh: false,
        soleTrader: false,
        employerBenefitCar: false,
        employerSalaryExchange: false,
      },
      hasHomeCharger: true,
      holdingMonths: 36,
    },
  },
  {
    id: 'dienstwagen-48',
    labelDe: 'Dienstwagen (48 % Grenzsteuer)',
    labelSv: 'Tjänstebil / Dienstwagen (48 % skatt)',
    descDe: '0 % Sachbezug für E-Autos vs. 1,5 %/2,0 % für Verbrenner',
    descSv: '0 % förmånsvärde (Sachbezug) för elbil mot 1,5 %/2,0 % för bensin/diesel',
    patch: {
      kmPerYear: 20000,
      businessKmPerYear: 8000,
      bundesland: 'wien',
      taxBracket: 0.48,
      grossMonthlySalary: 6200,
      vatExempt: false,
      access: {
        ownGmbh: false,
        soleTrader: false,
        employerBenefitCar: true,
        employerSalaryExchange: true,
      },
      hasHomeCharger: true,
      holdingMonths: 36,
    },
  },
  {
    id: 'eigene-gmbh',
    labelDe: 'Eigene GmbH (USt-pflichtig)',
    labelSv: 'Eget GmbH (Momspliktigt AB)',
    descDe: 'Vorsteuerabzug bis 40.000 €, 23 % KöSt & 0 € Sachbezug bei 0 g CO₂',
    descSv: 'Momsavdrag (Vorsteuer) upp till 40 000 €, 23 % bolagsskatt & 0 € förmånsskatt',
    patch: {
      kmPerYear: 20000,
      businessKmPerYear: 12000,
      bundesland: 'ooe',
      municipality: 'Linz',
      taxBracket: 0.48,
      grossMonthlySalary: 6800,
      vatExempt: false,
      access: {
        ownGmbh: true,
        soleTrader: false,
        employerBenefitCar: false,
        employerSalaryExchange: false,
      },
      gmbhPayoutChannel: 'salary',
      hasHomeCharger: true,
      holdingMonths: 36,
    },
  },
  {
    id: 'alpen-pendler',
    labelDe: 'Tirol / Vorarlberg (Günstiger Strom)',
    labelSv: 'Tyrolen / Vorarlberg (Billig alpel)',
    descDe: '22.500 km/Jahr · TIWAG-Tarif (24,2 ct/kWh) · Allrad-Fokus',
    descSv: '22 500 km/år · TIWAG-elpris (24,2 ct/kWh) · Låg nätavgift',
    patch: {
      kmPerYear: 22500,
      businessKmPerYear: 3000,
      bundesland: 'tirol',
      municipality: 'Innsbruck',
      taxBracket: 0.4,
      vatExempt: false,
      access: {
        ownGmbh: false,
        soleTrader: false,
        employerBenefitCar: false,
        employerSalaryExchange: false,
      },
      hasHomeCharger: true,
      holdingMonths: 48,
    },
  },
];
