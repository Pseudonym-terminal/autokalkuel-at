export type Language = 'de' | 'sv';

export type Powertrain = 'bev' | 'phev' | 'hev' | 'petrol' | 'diesel';

export type BodyType =
  | 'suv'
  | 'hatchback'
  | 'estate'
  | 'sedan'
  | 'coupe'
  | 'mpv'
  | 'van';

export type OwnershipForm =
  | 'privateCash'
  | 'privateLoan'
  | 'privateLease'
  | 'companyGmbh'
  | 'benefitCar'
  | 'salaryExchange';

export type OwnershipFormFilter = 'all' | OwnershipForm;

export type BundeslandId =
  | 'wien'
  | 'noe'
  | 'ooe'
  | 'stmk'
  | 'tirol'
  | 'kaernten'
  | 'salzburg'
  | 'vorarlberg'
  | 'burgenland';

export interface AustrianProfile {
  kmPerYear: number; // e.g., 15000 km/yr (= 1500 mil/yr)
  businessKmPerYear: number; // Dienstliche km/yr
  bundesland: BundeslandId;
  municipality: string;
  taxBracket: 0.2 | 0.3 | 0.4 | 0.48 | 0.5 | 0.55;
  grossMonthlySalary: number; // 14x per year in Austria
  access: {
    ownGmbh: boolean;
    soleTrader: boolean; // Ordination / Freiberufler / EPU (Ej GmbH)
    employerBenefitCar: boolean;
    employerSalaryExchange: boolean;
  };
  /** True for healthcare / medical practices (§ 6 Abs 1 Z 19 UStG unecht umsatzsteuerbefreit -> 0 € Vorsteuerabzug) */
  vatExempt?: boolean;
  gmbhPayoutChannel: 'salary' | 'dividend';
  holdingMonths: 24 | 36 | 48 | 60 | 72;
  hasHomeCharger: boolean;
  includeVignette: boolean;
  parkingMonthly: number;
  ageBand: '18-24' | '25-29' | '30-49' | '50-64' | '65+';
}

export interface CalculationOverrides {
  discountPercent?: number; // 0 to 25%
  customPurchasePrice?: number;
  residualShareOverride?: number;
  loanRateOverride?: number;
  downPaymentShare?: number;
  customLeaseMonthly?: number;
  customSalarySacrificeGross?: number;
  selectedEquipmentIds?: string[];
}

export interface LeaseOffer {
  id: string;
  lessor: string;
  monthlyFeeGross: number;
  firstPaymentGross: number;
  setupFeeGross: number;
  termMonths: 36 | 48;
  kmPerYear: number;
  overKmEur: number;
  rateType: 'fixed' | 'variable';
  includesService: boolean;
  includesWinterTyres: boolean;
  includesInsurance: boolean;
  validTo: string;
}

export interface EquipmentOption {
  id: string;
  labelDe: string;
  labelSv: string;
  priceGross: number;
  countsForSachbezug: boolean;
  replacesWinterWheels?: boolean;
}

export interface CarVariant {
  id: string;
  slug: string;
  modelId: string;
  brand: string;
  brandSlug: string;
  model: string;
  version: string;
  name: string;
  powertrain: Powertrain;
  bodyType: BodyType;
  drive: 'fwd' | 'rwd' | 'awd';
  listPriceGross: number; // EUR incl. NoVA and 20% USt
  netPriceBeforeNova: number; // EUR excl. NoVA and USt
  priceStatus: 'current' | 'lastKnown' | 'eurotax';
  priceValidFrom: string;
  priceValidTo?: string;
  checkedAt: string;
  wltpRangeKm: number | null;
  wltpRangeSpanKm?: { low: number; high: number };
  rangeSource: 'pricelist' | 'type-approval';
  energyKwh100Km: number | null;
  fuelL100Km: number | null;
  co2GKm: number;
  peakPowerKw: number;
  continuousPowerKw: number; // Nenndauerleistung (30-min power) for Austrian EV tax
  kerbMassKg: number; // Eigengewicht for Austrian EV tax
  rimInches: number;
  warrantyYears: number;
  residualSegment:
    | 'bevEstablished'
    | 'bevPriceCutHistory'
    | 'bevBudget'
    | 'phev'
    | 'hev'
    | 'iceMainstream'
    | 'icePremium';
  leaseOffer?: LeaseOffer;
  equipmentOptions: EquipmentOption[];
}

export interface TraceSource {
  title: string;
  authority: string;
  url: string;
  retrievedAt: string;
  lawRef: string;
}

export interface TraceNode {
  id: string;
  labelDe: string;
  labelSv: string;
  value: number;
  formattedValue: string;
  unitDe: string;
  unitSv: string;
  status: 'legislated' | 'market' | 'estimated' | 'user';
  formulaDe: string;
  formulaSv: string;
  explanationDe: string;
  explanationSv: string;
  inputs: string[]; // child TraceNode IDs
  source?: TraceSource;
  span?: { low: number; high: number };
}

export interface WaterfallLine {
  id: string;
  traceId: string;
  labelDe: string;
  labelSv: string;
  monthlyEur: number;
  kind: 'base' | 'add' | 'deduct' | 'warn' | 'total';
  shortNoteDe?: string;
  shortNoteSv?: string;
}

export interface TornadoItem {
  id: string;
  labelDe: string;
  labelSv: string;
  deltaMonthlyEur: number;
  newMonthlyEur: number;
  parameterHintDe: string;
  parameterHintSv: string;
}

export interface OwnershipScenarioResult {
  form: OwnershipForm;
  available: boolean;
  unavailableReasonDe?: string;
  unavailableReasonSv?: string;
  months: number;
  wallet: {
    low: number;
    central: number;
    high: number;
  };
  perKmEur: number;
  totalOverHoldingEur: number;
  novaEurTotal: number;
  novaPercent: number;
  motorTaxMonthlyEur: number;
  sachbezugMonthlyGrossEur: number;
  sachbezugTaxMonthlyEur: number;
  vorsteuerDeductionTotalEur: number;
  residualEndEur: {
    low: number;
    central: number;
    high: number;
  };
  residualShare36m: number;
  waterfall: WaterfallLine[];
  traces: Record<string, TraceNode>;
  warningsDe: string[];
  warningsSv: string[];
  assumptionsDe: string[];
  assumptionsSv: string[];
}

export interface FullCarCalculation {
  car: CarVariant;
  profile: AustrianProfile;
  scenarios: Record<OwnershipForm, OwnershipScenarioResult>;
  bestScenario: OwnershipScenarioResult;
  selectedScenario: OwnershipScenarioResult;
  tornado: TornadoItem[];
  breakEvenResidual?: {
    hasLeaseOffer: boolean;
    leaseMonthlyWallet: number;
    buyMonthlyWallet: number;
    breakEvenResidualShare: number;
    breakEvenResidualEur: number;
    estimatedResidualShare: number;
    estimatedResidualLowShare: number;
    estimatedResidualHighShare: number;
  };
}

export interface CompareItem {
  key: string; // `${carId}:${form}`
  carId: string;
  slug: string;
  carName: string;
  brand: string;
  powertrain: Powertrain;
  form: OwnershipForm;
  walletMonthly: number;
  walletSpan: { low: number; high: number };
  perKmEur: number;
  listPriceGross: number;
  wltpRangeKm: number | null;
  motorTaxMonthlyEur: number;
  sachbezugMonthlyGrossEur: number;
  vorsteuerDeductionTotalEur: number;
}
