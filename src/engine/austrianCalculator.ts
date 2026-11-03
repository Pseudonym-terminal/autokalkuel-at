import {
  AUSTRIAN_MARKET_CONSTANTS,
  BUNDESLAENDER,
  OFFICIAL_SOURCES,
} from '../data/austriaRules';
import {
  AustrianProfile,
  CarVariant,
  FullCarCalculation,
  OwnershipForm,
  OwnershipScenarioResult,
  TornadoItem,
  TraceNode,
  WaterfallLine,
  CalculationOverrides,
} from '../types';

const RESIDUAL_CURVE_36M: Record<
  CarVariant['residualSegment'],
  { low: number; central: number; high: number }
> = {
  bevEstablished: { low: 0.44, central: 0.51, high: 0.58 },
  bevPriceCutHistory: { low: 0.39, central: 0.47, high: 0.54 },
  bevBudget: { low: 0.35, central: 0.43, high: 0.5 },
  phev: { low: 0.45, central: 0.52, high: 0.58 },
  hev: { low: 0.54, central: 0.61, high: 0.67 },
  iceMainstream: { low: 0.48, central: 0.55, high: 0.61 },
  icePremium: { low: 0.51, central: 0.58, high: 0.65 },
};

const YEAR_DECAY_FACTORS: Record<number, number> = {
  24: 1.15, // Higher residual at 24m relative to 36m
  36: 1.0,
  48: 0.86,
  60: 0.74,
  72: 0.63,
};

export function formatEur(
  val: number,
  decimalsOrLang: number | string = 0
): string {
  const decimals = typeof decimalsOrLang === 'number' ? decimalsOrLang : 0;
  const rounded =
    decimals === 0 ? Math.round(val) : Number(val.toFixed(decimals));
  const isNeg = rounded < 0;
  const abs = Math.abs(rounded);
  const parts = abs.toFixed(decimals).split('.');
  const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = decimals > 0 ? `,${parts[1]}` : '';
  return `${isNeg ? '−' : ''}${intFormatted}${decPart} €`;
}

export function formatNum(val: number, decimals = 0): string {
  const rounded =
    decimals === 0 ? Math.round(val) : Number(val.toFixed(decimals));
  const isNeg = rounded < 0;
  const abs = Math.abs(rounded);
  const parts = abs.toFixed(decimals).split('.');
  const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = decimals > 0 ? `,${parts[1]}` : '';
  return `${isNeg ? '−' : ''}${intFormatted}${decPart}`;
}

/**
 * Calculates Austrian Normverbrauchsabgabe (NoVA) according to § 6 NoVAG 1991 (2025/2026 rules)
 */
export function calculateNova(car: CarVariant, netPrice: number) {
  if (car.powertrain === 'bev' || car.co2GKm === 0) {
    return {
      novaPercent: 0,
      malusEur: 0,
      abzugEur: 0,
      novaEur: 0,
    };
  }
  const rawRate = (car.co2GKm - 85) / 5;
  const novaPercent = Math.min(80, Math.max(0, Math.round(rawRate)));
  const malusEur = Math.max(0, car.co2GKm - 155) * 80;
  const abzugEur = 350;
  const novaEur = Math.max(
    0,
    netPrice * (novaPercent / 100) - abzugEur + malusEur
  );
  return {
    novaPercent,
    malusEur,
    abzugEur,
    novaEur,
  };
}

/**
 * Calculates Austrian Motorbezogene Versicherungssteuer (§ 6 VersStG idF BSMG 2025)
 * Includes the April 2025 BEV tax based on Nenndauerleistung (kW) & Eigengewicht (kg)
 */
export function calculateMotorbezogeneSteuer(car: CarVariant) {
  if (car.powertrain === 'bev') {
    const taxableKw = Math.max(0, car.continuousPowerKw - 45);
    const kwTier1 = Math.min(35, taxableKw) * 0.25;
    const kwTier2 = Math.min(25, Math.max(0, taxableKw - 35)) * 0.35;
    const kwTier3 = Math.max(0, taxableKw - 60) * 0.45;
    const kwMonthly = kwTier1 + kwTier2 + kwTier3;

    const taxableKg = Math.max(0, car.kerbMassKg - 900);
    const kgTier1 = Math.min(500, taxableKg) * 0.015;
    const kgTier2 = Math.min(700, Math.max(0, taxableKg - 500)) * 0.03;
    const kgTier3 = Math.max(0, taxableKg - 1200) * 0.045;
    const kgMonthly = kgTier1 + kgTier2 + kgTier3;

    const monthlyEur = Math.max(6, kwMonthly + kgMonthly);
    return {
      monthlyEur,
      kwPartMonthly: kwMonthly,
      secondPartMonthly: kgMonthly,
      isBevRule: true,
      taxableKw,
      taxableKg,
    };
  }

  // ICE / HEV / PHEV rule (§ 6 Abs 1 Z 3 VersStG)
  const taxableKw = Math.max(0, car.peakPowerKw - 61);
  const kwMonthly = taxableKw * 0.75;
  const taxableCo2 = Math.max(0, car.co2GKm - 103);
  const co2Monthly = taxableCo2 * 0.75;
  const monthlyEur = Math.max(15, kwMonthly + co2Monthly);

  return {
    monthlyEur,
    kwPartMonthly: kwMonthly,
    secondPartMonthly: co2Monthly,
    isBevRule: false,
    taxableKw,
    taxableKg: 0,
  };
}

/**
 * Calculates Austrian Sachbezug PKW (Benefit-in-Kind)
 */
export function calculateSachbezug(
  car: CarVariant,
  grossReferencePrice: number,
  profile: AustrianProfile
) {
  const privateKm = Math.max(0, profile.kmPerYear - profile.businessKmPerYear);
  const isHalfSachbezug = privateKm <= 6000;

  if (car.powertrain === 'bev' || car.co2GKm === 0) {
    return {
      ratePercent: 0,
      monthlyGrossBenefitEur: 0,
      monthlyEmployeeTaxEur: 0,
      monthlyEmployerLnkEur: 0,
      isHalfSachbezug,
    };
  }

  const fullRate = car.co2GKm <= 126 ? 0.015 : 0.02;
  const fullCap = car.co2GKm <= 126 ? 720 : 960;
  const effectiveRate = isHalfSachbezug ? fullRate / 2 : fullRate;
  const effectiveCap = isHalfSachbezug ? fullCap / 2 : fullCap;

  const monthlyGrossBenefitEur = Math.min(
    effectiveCap,
    grossReferencePrice * effectiveRate
  );
  const monthlyEmployeeTaxEur = monthlyGrossBenefitEur * profile.taxBracket;
  const monthlyEmployerLnkEur =
    monthlyGrossBenefitEur * AUSTRIAN_MARKET_CONSTANTS.lohnnebenkostenRate;

  return {
    ratePercent: effectiveRate * 100,
    monthlyGrossBenefitEur,
    monthlyEmployeeTaxEur,
    monthlyEmployerLnkEur,
    isHalfSachbezug,
  };
}

/**
 * Calculates Austrian Vorsteuerabzug & Luxustangente for company cars
 */
export function calculateVorsteuerAndLuxus(
  car: CarVariant,
  purchasePriceGross: number,
  vatExempt = false
) {
  if (vatExempt || car.powertrain !== 'bev' || car.co2GKm > 0) {
    return {
      vorsteuerEur: 0,
      recognizedGrossBaseForAfa: Math.min(
        AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross,
        purchasePriceGross
      ),
      isCapped:
        purchasePriceGross > AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross,
      isAbove80k:
        purchasePriceGross >
        AUSTRIAN_MARKET_CONSTANTS.vorsteuerZeroThresholdGross,
    };
  }

  // BEV (0g CO2)
  if (
    purchasePriceGross > AUSTRIAN_MARKET_CONSTANTS.vorsteuerZeroThresholdGross
  ) {
    return {
      vorsteuerEur: 0,
      recognizedGrossBaseForAfa: AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross,
      isCapped: true,
      isAbove80k: true,
    };
  }

  const eligibleGross = Math.min(
    AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross,
    purchasePriceGross
  );
  const vorsteuerEur = eligibleGross - eligibleGross / 1.2;
  const recognizedNetBaseForAfa = eligibleGross / 1.2;

  return {
    vorsteuerEur,
    recognizedGrossBaseForAfa: recognizedNetBaseForAfa,
    isCapped:
      purchasePriceGross > AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross,
    isAbove80k: false,
  };
}

function calculateScenario(
  car: CarVariant,
  profile: AustrianProfile,
  form: OwnershipForm,
  overrides: CalculationOverrides = {}
): OwnershipScenarioResult {
  const months = profile.holdingMonths;
  const years = months / 12;
  const bundeslandInfo = BUNDESLAENDER[profile.bundesland];

  // Equipment extras
  const selectedEquipment = (car.equipmentOptions ?? []).filter((eq) =>
    overrides.selectedEquipmentIds?.includes(eq.id)
  );
  const equipmentTotalGross = selectedEquipment.reduce(
    (s, e) => s + e.priceGross,
    0
  );
  const replacesWinterWheels = selectedEquipment.some(
    (e) => e.replacesWinterWheels
  );

  // Reference & Purchase Price
  const referencePriceGross = car.listPriceGross + equipmentTotalGross;
  const discountShare = (overrides.discountPercent ?? 0) / 100;
  const purchasePriceGross =
    overrides.customPurchasePrice !== undefined
      ? overrides.customPurchasePrice + equipmentTotalGross
      : Math.round(car.listPriceGross * (1 - discountShare)) +
        equipmentTotalGross;

  // NoVA
  const nova = calculateNova(car, car.netPriceBeforeNova);

  // Residual Value at end of holding period
  const segCurve = RESIDUAL_CURVE_36M[car.residualSegment];
  const timeFactor = YEAR_DECAY_FACTORS[months] ?? 1.0;
  // Mileage adjustment: 2.2% per 10,000 km deviation from 15,000 km/yr over 3 yrs
  const totalKmDiff = ((profile.kmPerYear - 15000) * years) / 10000;
  const kmAdjustment = -totalKmDiff * 0.022;

  const baseShareCentral =
    overrides.residualShareOverride !== undefined
      ? overrides.residualShareOverride
      : Math.min(
          0.78,
          Math.max(0.18, segCurve.central * timeFactor + kmAdjustment)
        );
  const spread = (segCurve.high - segCurve.low) / 2;
  const shareLow = Math.max(0.12, baseShareCentral - spread);
  const shareHigh = Math.min(0.85, baseShareCentral + spread);

  // Equipment retains 50% of base car residual share
  const baseCarRef = car.listPriceGross;
  const residualCentral = Math.round(
    baseCarRef * baseShareCentral +
      equipmentTotalGross * (baseShareCentral * 0.5)
  );
  const residualLow = Math.round(
    baseCarRef * shareLow + equipmentTotalGross * (shareLow * 0.5)
  );
  const residualHigh = Math.round(
    baseCarRef * shareHigh + equipmentTotalGross * (shareHigh * 0.5)
  );

  // Monthly Depreciation (Wertverlust)
  const depreciationMonthlyCentral =
    (purchasePriceGross - residualCentral) / months;
  const depreciationMonthlyLow = (purchasePriceGross - residualHigh) / months; // high residual = low cost
  const depreciationMonthlyHigh = (purchasePriceGross - residualLow) / months; // low residual = high cost

  // Motorbezogene Versicherungssteuer
  const motorTax = calculateMotorbezogeneSteuer(car);

  // Insurance (Haftpflicht + Vollkasko in Austria, excl. motorbezogene Steuer)
  const brandFactor =
    car.brand === 'BMW'
      ? 1.24
      : car.brand === 'Tesla'
        ? 1.22
        : car.brand === 'Volvo'
          ? 1.05
          : car.brand === 'Volkswagen'
            ? 0.98
            : car.brand === 'Škoda' || car.brand === 'Kia'
              ? 0.91
              : 0.96;
  const ageFactor =
    profile.ageBand === '18-24'
      ? 1.55
      : profile.ageBand === '25-29'
        ? 1.2
        : profile.ageBand === '65+'
          ? 1.08
          : 1.0;
  const kmInsFactor =
    profile.kmPerYear <= 10000
      ? 0.9
      : profile.kmPerYear <= 15000
        ? 1.0
        : profile.kmPerYear <= 25000
          ? 1.14
          : 1.28;
  const priceInsFactor = 0.65 + (referencePriceGross / 45000) * 0.35;
  const insuranceMonthlyCentral = Math.round(
    86 *
      brandFactor *
      bundeslandInfo.insuranceRegionFactor *
      ageFactor *
      kmInsFactor *
      priceInsFactor
  );
  const insuranceMonthlyLow = Math.round(insuranceMonthlyCentral * 0.82);
  const insuranceMonthlyHigh = Math.round(insuranceMonthlyCentral * 1.22);

  // Energy / Electricity / Fuel per month
  const realWorldFactor = car.powertrain === 'bev' ? 1.14 : 1.1; // Winter/Autobahn factor in Austria
  let energyMonthlyEur = 0;
  let energyPricePerUnit = 0;

  if (car.powertrain === 'bev') {
    const kwhPer100 = (car.energyKwh100Km ?? 16.0) * realWorldFactor;
    const homeShare = profile.hasHomeCharger ? 0.82 : 0.0;
    const publicShare = 1 - homeShare;
    energyPricePerUnit =
      homeShare * bundeslandInfo.homeElectricityEurKwh +
      publicShare * AUSTRIAN_MARKET_CONSTANTS.publicChargingEurKwh;
    energyMonthlyEur =
      ((profile.kmPerYear / 12) * (kwhPer100 / 100)) * energyPricePerUnit;
  } else if (car.powertrain === 'phev') {
    const elecShare = profile.hasHomeCharger ? 0.6 : 0.25;
    const kwhPer100 = (car.energyKwh100Km ?? 16.0) * 1.12;
    const lPer100 = (car.fuelL100Km ?? 5.5) * 1.08;
    const elecRate = profile.hasHomeCharger
      ? bundeslandInfo.homeElectricityEurKwh
      : AUSTRIAN_MARKET_CONSTANTS.publicChargingEurKwh;
    const monthlyKm = profile.kmPerYear / 12;
    energyMonthlyEur =
      monthlyKm * elecShare * (kwhPer100 / 100) * elecRate +
      monthlyKm *
        (1 - elecShare) *
        (lPer100 / 100) *
        AUSTRIAN_MARKET_CONSTANTS.petrolSuper95EurL;
    energyPricePerUnit = elecRate;
  } else {
    const lPer100 = (car.fuelL100Km ?? 5.5) * realWorldFactor;
    energyPricePerUnit =
      car.powertrain === 'diesel'
        ? AUSTRIAN_MARKET_CONSTANTS.dieselEurL
        : AUSTRIAN_MARKET_CONSTANTS.petrolSuper95EurL;
    energyMonthlyEur =
      ((profile.kmPerYear / 12) * (lPer100 / 100)) * energyPricePerUnit;
  }

  // Service, §57a Pickerl, Winter tyres & Vignette
  const serviceBaseAnnual =
    car.powertrain === 'bev'
      ? 290
      : car.powertrain === 'phev'
        ? 540
        : 490;
  const kmServiceFactor = Math.max(1, profile.kmPerYear / 15000);
  const postWarrantyYears = Math.max(0, years - car.warrantyYears);
  const repairReserveMonthly =
    postWarrantyYears > 0
      ? ((referencePriceGross * 0.006 * postWarrantyYears) / months)
      : 0;
  const serviceMonthlyEur =
    (serviceBaseAnnual * kmServiceFactor) / 12 + repairReserveMonthly;

  // Winter wheels amortized over holding period + seasonal tyre swap/storage (€130/yr in AT)
  const winterWheelSetEur = replacesWinterWheels
    ? 0
    : 950 + Math.max(0, car.rimInches - 17) * 240;
  const tyreStorageAnnualEur = 130;
  const tyresMonthlyEur =
    winterWheelSetEur / months + tyreStorageAnnualEur / 12;

  // §57a Pickerl (3-2-1 rule in Austria: month 36, month 60, month 72) + ASFINAG Vignette + Zulassung
  const pickerlCount =
    (months >= 36 ? 1 : 0) + (months >= 60 ? 1 : 0) + (months >= 72 ? 1 : 0);
  const pickerlAndZulassungMonthly =
    (pickerlCount * AUSTRIAN_MARKET_CONSTANTS.pickerlInspectionEur +
      AUSTRIAN_MARKET_CONSTANTS.zulassungsgebuehrEur) /
    months;
  const vignetteMonthlyEur = profile.includeVignette
    ? AUSTRIAN_MARKET_CONSTANTS.vignetteAnnualEur / 12
    : 0;
  const feesAndVignetteMonthlyEur =
    pickerlAndZulassungMonthly + vignetteMonthlyEur + profile.parkingMonthly;

  // Official Austrian Kilometergeld (€0.50/km tax-free for private cars used on business trips)
  const eligibleBusinessKm = Math.min(30000, profile.businessKmPerYear);
  const kilometergeldMonthlyEur =
    form === 'privateCash' || form === 'privateLoan' || form === 'privateLease'
      ? (eligibleBusinessKm * AUSTRIAN_MARKET_CONSTANTS.kilometergeldPerKm) / 12
      : 0;

  // Sachbezug & Vorsteuer
  const isVatExempt = Boolean(profile.vatExempt);
  const sachbezug = calculateSachbezug(car, referencePriceGross, profile);
  const vorsteuer = calculateVorsteuerAndLuxus(
    car,
    purchasePriceGross,
    isVatExempt
  );

  const traces: Record<string, TraceNode> = {};
  const registerTrace = (node: TraceNode) => {
    traces[node.id] = node;
    return node.id;
  };

  // Register shared traces
  registerTrace({
    id: 'price.purchase',
    labelDe: 'Kaufpreis inkl. NoVA & 20 % USt',
    labelSv: 'Köpesumma inkl. NoVA & 20 % moms',
    value: purchasePriceGross,
    formattedValue: formatEur(purchasePriceGross),
    unitDe: '€',
    unitSv: '€',
    status:
      overrides.discountPercent || overrides.customPurchasePrice
        ? 'user'
        : 'market',
    formulaDe: `Listenpreis ${formatEur(car.listPriceGross)}${discountShare > 0 ? ` − ${Math.round(discountShare * 100)} % Nachlass` : ''}${equipmentTotalGross > 0 ? ` + ${formatEur(equipmentTotalGross)} Sonderausstattung` : ''}`,
    formulaSv: `Listpris ${formatEur(car.listPriceGross)}${discountShare > 0 ? ` − ${Math.round(discountShare * 100)} % rabatt` : ''}${equipmentTotalGross > 0 ? ` + ${formatEur(equipmentTotalGross)} tillval` : ''}`,
    explanationDe:
      car.powertrain === 'bev'
        ? `Österreichischer Brutto-Transaktionspreis inklusive 20 % USt. Als reines Elektrofahrzeug (0 g/km CO₂) fällt 0 % NoVA an.`
        : `Österreichischer Brutto-Transaktionspreis inklusive ${nova.novaPercent} % NoVA (${formatEur(nova.novaEur)}) und 20 % USt.`,
    explanationSv:
      car.powertrain === 'bev'
        ? `Österrikiskt bruttopris inklusive 20 % moms (USt). Som ren elbil (0 g/km CO₂) utgår 0 % NoVA.`
        : `Österrikiskt bruttopris inklusive ${nova.novaPercent} % NoVA-skatt (${formatEur(nova.novaEur)}) och 20 % moms.`,
    inputs: ['tax.nova'],
    source: OFFICIAL_SOURCES.bmfNova,
  });

  registerTrace({
    id: 'tax.nova',
    labelDe: `Normverbrauchsabgabe (NoVA: ${nova.novaPercent} %)`,
    labelSv: `Normverbrauchsabgabe (NoVA-skatt: ${nova.novaPercent} %)`,
    value: nova.novaEur,
    formattedValue: formatEur(nova.novaEur),
    unitDe: '€ einmalig',
    unitSv: '€ engångsbelopp',
    status: 'legislated',
    formulaDe:
      car.powertrain === 'bev'
        ? '0 g/km CO₂ → 0 % NoVA (§ 3 Z 3 NoVAG)'
        : `(${car.co2GKm} g/km − 85) / 5 = ${nova.novaPercent} % × Netto ${formatEur(car.netPriceBeforeNova)} − 350 € Abzugsposten${nova.malusEur > 0 ? ` + ${formatEur(nova.malusEur)} CO₂-Malus` : ''}`,
    formulaSv:
      car.powertrain === 'bev'
        ? '0 g/km CO₂ → 0 % NoVA (§ 3 Z 3 NoVAG)'
        : `(${car.co2GKm} g/km − 85) / 5 = ${nova.novaPercent} % × Netto ${formatEur(car.netPriceBeforeNova)} − 350 € avdrag${nova.malusEur > 0 ? ` + ${formatEur(nova.malusEur)} CO₂-malus` : ''}`,
    explanationDe:
      'Die NoVA wird in Österreich beim Ersterwerb eines PKW auf den Nettopreis aufgeschlagen. Reine Elektroautos sind befreit.',
    explanationSv:
      'NoVA är Österrikes engångsskatt vid nybilsköp baserad på CO₂-utsläpp. Rena elbilar är helt befriade (0 €).',
    inputs: [],
    source: OFFICIAL_SOURCES.bmfNova,
  });

  registerTrace({
    id: 'residual.end',
    labelDe: `Restwert nach ${months} Monaten (${Math.round(baseShareCentral * 100)} %)`,
    labelSv: `Restvärde efter ${months} månader (${Math.round(baseShareCentral * 100)} %)`,
    value: residualCentral,
    formattedValue: formatEur(residualCentral),
    unitDe: '€',
    unitSv: '€',
    status: overrides.residualShareOverride !== undefined ? 'user' : 'estimated',
    formulaDe: `${formatEur(baseCarRef)} × ${Math.round(baseShareCentral * 100)} % (bei ${formatNum(profile.kmPerYear)} km/Jahr)`,
    formulaSv: `${formatEur(baseCarRef)} × ${Math.round(baseShareCentral * 100)} % (vid ${formatNum(profile.kmPerYear)} km/år)`,
    explanationDe: `Geschätzter Wiederverkaufswert in Österreich nach ${months} Monaten (${formatNum((profile.kmPerYear * months) / 12)} km Gesamtfahrleistung). Unsicherheitsband: ${formatEur(residualLow)} bis ${formatEur(residualHigh)}.`,
    explanationSv: `Uppskattat andrahandsvärde i Österrike efter ${months} månader (${formatNum((profile.kmPerYear * months) / 12)} km total körsträcka). Osäkerhetsspann: ${formatEur(residualLow)} till ${formatEur(residualHigh)}.`,
    inputs: ['price.purchase'],
    span: { low: residualLow, high: residualHigh },
    source: OFFICIAL_SOURCES.oeamtcAutokosten,
  });

  registerTrace({
    id: 'wf.depreciation',
    labelDe: 'Wertverlust pro Monat',
    labelSv: 'Värdeminskning per månad',
    value: Math.round(depreciationMonthlyCentral),
    formattedValue: `${formatEur(depreciationMonthlyCentral)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'estimated',
    formulaDe: `(Kaufpreis ${formatEur(purchasePriceGross)} − Restwert ${formatEur(residualCentral)}) ÷ ${months} Monate`,
    formulaSv: `(Köpesumma ${formatEur(purchasePriceGross)} − Restvärde ${formatEur(residualCentral)}) ÷ ${months} månader`,
    explanationDe:
      'Der Wertverlust ist meist der größte Kostenblock beim Autokauf. Er ergibt sich aus der Differenz zwischen Kaufpreis und Wiederverkaufswert verteilt auf die Haltedauer.',
    explanationSv:
      'Värdeminskningen är oftast den största kostnadsposten vid bilköp och beräknas som skillnaden mellan inköpspris och restvärde utslaget per månad.',
    inputs: ['price.purchase', 'residual.end'],
    span: {
      low: Math.round(depreciationMonthlyLow),
      high: Math.round(depreciationMonthlyHigh),
    },
    source: OFFICIAL_SOURCES.oeamtcAutokosten,
  });

  registerTrace({
    id: 'wf.motorTax',
    labelDe: 'Motorbezogene Versicherungssteuer (AT)',
    labelSv: 'Motorbezogene Versicherungssteuer (Fordonsskatt AT)',
    value: Math.round(motorTax.monthlyEur),
    formattedValue: `${formatEur(motorTax.monthlyEur, 1)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'legislated',
    formulaDe: motorTax.isBevRule
      ? `E-Auto-Formel ab 04/2025: Leistung (${car.continuousPowerKw} − 45 = ${motorTax.taxableKw} kW Nenndauerleistung → ${formatEur(motorTax.kwPartMonthly, 2)}) + Eigengewicht (${car.kerbMassKg} − 900 = ${motorTax.taxableKg} kg → ${formatEur(motorTax.secondPartMonthly, 2)})`
      : `Verbrenner/Hybrid: (${car.peakPowerKw} − 61 kW) × 0,75 € + (${car.co2GKm} − 103 g CO₂) × 0,75 € = ${formatEur(motorTax.monthlyEur, 2)}/Monat`,
    formulaSv: motorTax.isBevRule
      ? `Österrikisk elbilsskatt (fr.o.m. april 2025): Kontinuerlig effekt (${car.continuousPowerKw} − 45 = ${motorTax.taxableKw} kW → ${formatEur(motorTax.kwPartMonthly, 2)}) + Tjänstevikt (${car.kerbMassKg} − 900 = ${motorTax.taxableKg} kg → ${formatEur(motorTax.secondPartMonthly, 2)})`
      : `Förbränning/Hybrid: (${car.peakPowerKw} − 61 kW) × 0,75 € + (${car.co2GKm} − 103 g CO₂) × 0,75 € = ${formatEur(motorTax.monthlyEur, 2)}/mån`,
    explanationDe: motorTax.isBevRule
      ? 'Seit 1. April 2025 unterliegen auch reine Elektroautos in Österreich der motorbezogenen Versicherungssteuer (Budgetsanierungsmaßnahmengesetz 2025). Bemessungsgrundlage sind die 30-Minuten-Nenndauerleistung (abzüglich 45 kW) und das Eigengewicht (abzüglich 900 kg).'
      : 'Die motorbezogene Versicherungssteuer wird in Österreich gemeinsam mit der KFZ-Haftpflichtprämie eingehoben und bemisst sich nach Motorleistung (kW) und WLTP-CO₂-Ausstoß.',
    explanationSv: motorTax.isBevRule
      ? 'Sedan 1 april 2025 betalar även elbilar fordonsskatt (motorbezogene Versicherungssteuer) i Österrike. Skatten baseras på kontinuerlig 30-minuterseffekt (över 45 kW) samt tjänstevikt (över 900 kg).'
      : 'Betalas tillsammans med trafikförsäkringen i Österrike och styrs av motoreffekt (kW) och CO₂-utsläpp (g/km).',
    inputs: [],
    source: OFFICIAL_SOURCES.bmfMotorsteuer,
  });

  registerTrace({
    id: 'wf.insurance',
    labelDe: 'KFZ-Haftpflicht & Vollkasko (Österreich)',
    labelSv: 'Trafik- & helförsäkring (Haftpflicht & Vollkasko)',
    value: insuranceMonthlyCentral,
    formattedValue: `${formatEur(insuranceMonthlyCentral)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'estimated',
    formulaDe: `Basis 86 € × Marken-Faktor (${brandFactor.toFixed(2)}) × Region ${bundeslandInfo.capital} (${bundeslandInfo.insuranceRegionFactor.toFixed(2)}) × km-Faktor (${kmInsFactor.toFixed(2)})`,
    formulaSv: `Bas 86 € × Märkesfaktor (${brandFactor.toFixed(2)}) × Region ${bundeslandInfo.capital} (${bundeslandInfo.insuranceRegionFactor.toFixed(2)}) × Körsträckefaktor (${kmInsFactor.toFixed(2)})`,
    explanationDe:
      'Geschätzte monatliche Versicherungsprämie (Haftpflicht + Vollkasko mit Bonusstufe 0, exkl. motorbezogene Versicherungssteuer).',
    explanationSv:
      'Uppskattad månadspremie för österrikisk Haftpflicht + Vollkasko (Bonusstufe 0, exklusive fordonsskatt som redovisas separat).',
    inputs: [],
    span: { low: insuranceMonthlyLow, high: insuranceMonthlyHigh },
    source: OFFICIAL_SOURCES.oeamtcAutokosten,
  });

  registerTrace({
    id: 'wf.energy',
    labelDe:
      car.powertrain === 'bev'
        ? `Ladestrom (${bundeslandInfo.capital})`
        : car.powertrain === 'phev'
          ? 'Strom & Benzin (Mix)'
          : 'Treibstoff (E-Control Schnitt)',
    labelSv:
      car.powertrain === 'bev'
        ? `Laddström (${bundeslandInfo.capital})`
        : car.powertrain === 'phev'
          ? 'El & bensin (Mix)'
          : 'Drivmedel (E-Control snitt)',
    value: Math.round(energyMonthlyEur),
    formattedValue: `${formatEur(energyMonthlyEur)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'market',
    formulaDe:
      car.powertrain === 'bev'
        ? `${formatNum(profile.kmPerYear / 12)} km/Monat × ${((car.energyKwh100Km ?? 16) * realWorldFactor).toFixed(1)} kWh/100 km (inkl. +14 % Realverbrauch) × ${(energyPricePerUnit * 100).toFixed(1)} ct/kWh`
        : `${formatNum(profile.kmPerYear / 12)} km/Monat × Praxisverbrauch × ${formatEur(energyPricePerUnit, 2)}/Einheit`,
    formulaSv:
      car.powertrain === 'bev'
        ? `${formatNum(profile.kmPerYear / 12)} km/mån × ${((car.energyKwh100Km ?? 16) * realWorldFactor).toFixed(1)} kWh/100 km (inkl. +14 % verklig förbrukning) × ${(energyPricePerUnit * 100).toFixed(1)} ct/kWh`
        : `${formatNum(profile.kmPerYear / 12)} km/mån × verklig förbrukning × ${formatEur(energyPricePerUnit, 2)}`,
    explanationDe: `Strompreis im Netzgebiet ${bundeslandInfo.gridOperator}: ${(bundeslandInfo.homeElectricityEurKwh * 100).toFixed(1)} ct/kWh zuhause (inkl. ${bundeslandInfo.netzentgeltCentKwh.toFixed(1)} ct/kWh Netzentgelt & 20 % USt) bzw. 54,0 ct/kWh öffentlich.`,
    explanationSv: `Elpris i nätområdet ${bundeslandInfo.gridOperator}: ${(bundeslandInfo.homeElectricityEurKwh * 100).toFixed(1)} ct/kWh hemma (inkl. ${bundeslandInfo.netzentgeltCentKwh.toFixed(1)} ct/kWh nätavgift & 20 % moms) resp. 54,0 ct/kWh publikt.`,
    inputs: [],
    source: OFFICIAL_SOURCES.econtrolStrom,
  });

  const maintenanceTotalMonthly =
    serviceMonthlyEur + tyresMonthlyEur + feesAndVignetteMonthlyEur;

  registerTrace({
    id: 'wf.maintenance',
    labelDe: 'Service, §57a Pickerl, Reifen & Vignette',
    labelSv: 'Service, §57a Pickerl, däck & vignett',
    value: Math.round(maintenanceTotalMonthly),
    formattedValue: `${formatEur(maintenanceTotalMonthly)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'estimated',
    formulaDe: `Service ${formatEur(serviceMonthlyEur)} + Winterräder/Depot ${formatEur(tyresMonthlyEur)} + Pickerl/Zulassung/Vignette ${formatEur(feesAndVignetteMonthlyEur)}`,
    formulaSv: `Service ${formatEur(serviceMonthlyEur)} + Vinterhjul/förvaring ${formatEur(tyresMonthlyEur)} + Pickerl/registrering/vignett ${formatEur(feesAndVignetteMonthlyEur)}`,
    explanationDe: `Beinhaltet planmäßiges Service (${car.warrantyYears} Jahre Herstellergarantie), Winterkompletträder (${car.rimInches} Zoll) inkl. Umstecken/Einlagerung, §57a-Begutachtung ("Pickerl" nach 3-2-1 Regel), KFZ-Zulassung (218,50 €)${profile.includeVignette ? ' sowie die ASFINAG-Jahresvignette (103,80 €/Jahr)' : ''}.`,
    explanationSv: `Inkluderar schemalagd service (${car.warrantyYears} års nybilsgaranti), vinterhjul (${car.rimInches} tum) inkl. däckhotell, §57a-besiktning ("Pickerl" enligt 3-2-1-regeln), registreringsavgift (218,50 €)${profile.includeVignette ? ' samt ASFINAG motorvägsvignett (103,80 €/år)' : ''}.`,
    inputs: [],
    source: OFFICIAL_SOURCES.asfinagVignette,
  });

  if (kilometergeldMonthlyEur > 0) {
    registerTrace({
      id: 'wf.kilometergeld',
      labelDe: 'Steuerfreies Kilometergeld (0,50 €/km)',
      labelSv: 'Skattefri milersättning (Kilometergeld 0,50 €/km)',
      value: -Math.round(kilometergeldMonthlyEur),
      formattedValue: `−${formatEur(kilometergeldMonthlyEur)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'legislated',
      formulaDe: `${formatNum(eligibleBusinessKm)} dienstliche km/Jahr × 0,50 €/km ÷ 12 Monate`,
      formulaSv: `${formatNum(eligibleBusinessKm)} tjänste-km/år × 0,50 €/km ÷ 12 månader`,
      explanationDe:
        'Für berufliche Fahrten mit dem privaten PKW steht in Österreich seit 2025 das amtliche Kilometergeld von 0,50 €/km (bis 30.000 km/Jahr = 15.000 €/Jahr) steuer- und sozialversicherungsfrei zu.',
      explanationSv:
        'För tjänsteresor med privat bil gäller i Österrike sedan 2025 amtliches Kilometergeld på 0,50 €/km (upp till 30 000 km/år) helt skatte- och avgiftsfritt.',
      inputs: [],
      source: OFFICIAL_SOURCES.bmfKilometergeld,
    });
  }

  const warningsDe: string[] = [];
  const warningsSv: string[] = [];
  const assumptionsDe: string[] = [];
  const assumptionsSv: string[] = [];

  if (car.priceStatus === 'lastKnown') {
    warningsDe.push(
      `Zuletzt bekannter Listenpreis (Stand ${car.checkedAt}). Aktuelles Händlerangebot prüfen.`
    );
    warningsSv.push(
      `Senast känt listpris (från ${car.checkedAt}). Kontrollera aktuellt pris med handlare.`
    );
  }

  // Branch by OwnershipForm
  if (form === 'privateCash') {
    // Opportunity cost of tied-up capital: average tied capital * 2.8% net p.a.
    const avgCapital = (purchasePriceGross + residualCentral) / 2;
    const capitalCostMonthly =
      (avgCapital * AUSTRIAN_MARKET_CONSTANTS.alternativeReturnRate) / 12;

    registerTrace({
      id: 'wf.capital',
      labelDe: 'Alternativrendite (gebundenes Kapital)',
      labelSv: 'Alternativavkastning (bundet kapital)',
      value: Math.round(capitalCostMonthly),
      formattedValue: `${formatEur(capitalCostMonthly)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'estimated',
      formulaDe: `Ø gebundenes Kapital ${formatEur(avgCapital)} × 2,8 % p.a. (nach KESt) ÷ 12`,
      formulaSv: `Ø bundet kapital ${formatEur(avgCapital)} × 2,8 % per år (efter KESt) ÷ 12`,
      explanationDe:
        'Entgangene Nettoverzinsung (z. B. Bundesschatz nach 27,5 % KESt) auf das im Fahrzeug gebundene Eigenkapital.',
      explanationSv:
        'Utebliven nettoavkastning (t.ex. österrikiska Bundesschatz efter 27,5 % KESt) på det kapital som binds i bilen.',
      inputs: ['price.purchase', 'residual.end'],
      source: OFFICIAL_SOURCES.oeamtcAutokosten,
    });

    const central =
      depreciationMonthlyCentral +
      motorTax.monthlyEur +
      insuranceMonthlyCentral +
      energyMonthlyEur +
      maintenanceTotalMonthly +
      capitalCostMonthly -
      kilometergeldMonthlyEur;

    const low =
      depreciationMonthlyLow +
      motorTax.monthlyEur +
      insuranceMonthlyLow +
      energyMonthlyEur +
      maintenanceTotalMonthly +
      capitalCostMonthly -
      kilometergeldMonthlyEur;

    const high =
      depreciationMonthlyHigh +
      motorTax.monthlyEur +
      insuranceMonthlyHigh +
      energyMonthlyEur +
      maintenanceTotalMonthly +
      capitalCostMonthly -
      kilometergeldMonthlyEur;

    const waterfall: WaterfallLine[] = [
      {
        id: 'depreciation',
        traceId: 'wf.depreciation',
        labelDe: 'Wertverlust',
        labelSv: 'Värdeminskning',
        monthlyEur: Math.round(depreciationMonthlyCentral),
        kind: 'base',
      },
      {
        id: 'motorTax',
        traceId: 'wf.motorTax',
        labelDe: 'Motorsteuer',
        labelSv: 'Fordonsskatt',
        monthlyEur: Math.round(motorTax.monthlyEur),
        kind: 'add',
      },
      {
        id: 'insurance',
        traceId: 'wf.insurance',
        labelDe: 'Versicherung',
        labelSv: 'Försäkring',
        monthlyEur: Math.round(insuranceMonthlyCentral),
        kind: 'add',
      },
      {
        id: 'energy',
        traceId: 'wf.energy',
        labelDe: car.powertrain === 'bev' ? 'Ladestrom' : 'Energie',
        labelSv: car.powertrain === 'bev' ? 'Laddström' : 'Energi',
        monthlyEur: Math.round(energyMonthlyEur),
        kind: 'add',
      },
      {
        id: 'maintenance',
        traceId: 'wf.maintenance',
        labelDe: 'Service & Reifen',
        labelSv: 'Service & däck',
        monthlyEur: Math.round(maintenanceTotalMonthly),
        kind: 'add',
      },
      {
        id: 'capital',
        traceId: 'wf.capital',
        labelDe: 'Kapitalkosten',
        labelSv: 'Kapitalkostnad',
        monthlyEur: Math.round(capitalCostMonthly),
        kind: 'add',
      },
      ...(kilometergeldMonthlyEur > 0
        ? [
            {
              id: 'kilometergeld',
              traceId: 'wf.kilometergeld',
              labelDe: 'Kilometergeld',
              labelSv: 'Milersättning',
              monthlyEur: -Math.round(kilometergeldMonthlyEur),
              kind: 'deduct' as const,
            },
          ]
        : []),
      {
        id: 'total',
        traceId: 'wf.total',
        labelDe: 'Kostet dich',
        labelSv: 'Kostar dig',
        monthlyEur: Math.round(central),
        kind: 'total',
      },
    ];

    registerTrace({
      id: 'wf.total',
      labelDe: 'Kostet dich pro Monat (Barkauf)',
      labelSv: 'Kostar dig per månad (Köpa kontant)',
      value: Math.round(central),
      formattedValue: `${formatEur(central)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'estimated',
      formulaDe:
        'Wertverlust + Motorbez. Steuer + Versicherung + Energie + Service/Reifen/Vignette + Kapitalkosten − Kilometergeld',
      formulaSv:
        'Värdeminskning + Fordonsskatt + Försäkring + Energi + Service/däck/vignett + Kapitalkostnad − Milersättning',
      explanationDe: `Vollkosten (Total Cost of Ownership) bei Barkauf über ${months} Monate in Österreich.`,
      explanationSv: `Total månadskostnad (TCO) vid kontantköp över ${months} månader i Österrike.`,
      inputs: waterfall.filter((w) => w.id !== 'total').map((w) => w.traceId),
      span: { low: Math.round(low), high: Math.round(high) },
    });

    assumptionsDe.push(
      `Barkauf inkl. 20 % USt und ${nova.novaPercent} % NoVA. Alternativrendite 2,8 % p.a. nach KESt.`
    );
    assumptionsSv.push(
      `Kontantköp inkl. 20 % moms och ${nova.novaPercent} % NoVA. Alternativränta 2,8 %/år efter KESt.`
    );

    return {
      form,
      available: true,
      months,
      wallet: {
        low: Math.round(low),
        central: Math.round(central),
        high: Math.round(high),
      },
      perKmEur: (central * 12) / profile.kmPerYear,
      totalOverHoldingEur: Math.round(central * months),
      novaEurTotal: nova.novaEur,
      novaPercent: nova.novaPercent,
      motorTaxMonthlyEur: motorTax.monthlyEur,
      sachbezugMonthlyGrossEur: 0,
      sachbezugTaxMonthlyEur: 0,
      vorsteuerDeductionTotalEur: 0,
      residualEndEur: {
        low: residualLow,
        central: residualCentral,
        high: residualHigh,
      },
      residualShare36m: baseShareCentral,
      waterfall,
      traces,
      warningsDe,
      warningsSv,
      assumptionsDe,
      assumptionsSv,
    };
  }

  if (form === 'privateLoan') {
    const downPaymentShare = overrides.downPaymentShare ?? 0.2;
    const loanRate =
      overrides.loanRateOverride ?? AUSTRIAN_MARKET_CONSTANTS.referenceLoanRate;
    const downPaymentEur = purchasePriceGross * downPaymentShare;
    const financedPrincipal = purchasePriceGross - downPaymentEur;
    const avgBalance = (financedPrincipal + residualCentral * 0.85) / 2;
    const monthlyInterestEur = (avgBalance * loanRate) / 12;
    const downPaymentOpportunityMonthly =
      (downPaymentEur * AUSTRIAN_MARKET_CONSTANTS.alternativeReturnRate) / 12;
    const totalFinancingMonthly =
      monthlyInterestEur + downPaymentOpportunityMonthly + 12; // +12 € Bearbeitungs-/Kontoführungsgebühr

    registerTrace({
      id: 'wf.loanInterest',
      labelDe: `Kreditzinsen & Gebühren (${(loanRate * 100).toFixed(2).replace('.', ',')} % p.a.)`,
      labelSv: `Billåneränta & avgifter (${(loanRate * 100).toFixed(2).replace('.', ',')} %/år)`,
      value: Math.round(totalFinancingMonthly),
      formattedValue: `${formatEur(totalFinancingMonthly)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: overrides.loanRateOverride !== undefined ? 'user' : 'market',
      formulaDe: `Kreditbetrag ${formatEur(financedPrincipal)} (20 % Anzahlung) × ${(loanRate * 100).toFixed(2).replace('.', ',')} % Sollzins (kein Steuerabzug für Privatkredite in AT)`,
      formulaSv: `Lånebelopp ${formatEur(financedPrincipal)} (20 % kontantinsats) × ${(loanRate * 100).toFixed(2).replace('.', ',')} % ränta (inget ränteavdrag för privatpersoner i Österrike)`,
      explanationDe:
        'Hinweis: Anders als in Schweden gibt es in Österreich keinen steuerlichen Schuldzinsenabzug (Ränteavdrag) für private Konsum- oder Autokredite.',
      explanationSv:
        'Viktig skillnad mot Sverige: I Österrike finns inget ränteavdrag (Ränteavdrag) i inkomstdeklarationen för privata billån.',
      inputs: ['price.purchase'],
      source: OFFICIAL_SOURCES.oeamtcAutokosten,
    });

    const central =
      depreciationMonthlyCentral +
      totalFinancingMonthly +
      motorTax.monthlyEur +
      insuranceMonthlyCentral +
      energyMonthlyEur +
      maintenanceTotalMonthly -
      kilometergeldMonthlyEur;

    const low =
      depreciationMonthlyLow +
      totalFinancingMonthly +
      motorTax.monthlyEur +
      insuranceMonthlyLow +
      energyMonthlyEur +
      maintenanceTotalMonthly -
      kilometergeldMonthlyEur;

    const high =
      depreciationMonthlyHigh +
      totalFinancingMonthly +
      motorTax.monthlyEur +
      insuranceMonthlyHigh +
      energyMonthlyEur +
      maintenanceTotalMonthly -
      kilometergeldMonthlyEur;

    const waterfall: WaterfallLine[] = [
      {
        id: 'depreciation',
        traceId: 'wf.depreciation',
        labelDe: 'Wertverlust',
        labelSv: 'Värdeminskning',
        monthlyEur: Math.round(depreciationMonthlyCentral),
        kind: 'base',
      },
      {
        id: 'loanInterest',
        traceId: 'wf.loanInterest',
        labelDe: 'Kreditzinsen',
        labelSv: 'Låneränta',
        monthlyEur: Math.round(totalFinancingMonthly),
        kind: 'add',
      },
      {
        id: 'motorTax',
        traceId: 'wf.motorTax',
        labelDe: 'Motorsteuer',
        labelSv: 'Fordonsskatt',
        monthlyEur: Math.round(motorTax.monthlyEur),
        kind: 'add',
      },
      {
        id: 'insurance',
        traceId: 'wf.insurance',
        labelDe: 'Versicherung',
        labelSv: 'Försäkring',
        monthlyEur: Math.round(insuranceMonthlyCentral),
        kind: 'add',
      },
      {
        id: 'energy',
        traceId: 'wf.energy',
        labelDe: car.powertrain === 'bev' ? 'Ladestrom' : 'Energie',
        labelSv: car.powertrain === 'bev' ? 'Laddström' : 'Energi',
        monthlyEur: Math.round(energyMonthlyEur),
        kind: 'add',
      },
      {
        id: 'maintenance',
        traceId: 'wf.maintenance',
        labelDe: 'Service & Reifen',
        labelSv: 'Service & däck',
        monthlyEur: Math.round(maintenanceTotalMonthly),
        kind: 'add',
      },
      ...(kilometergeldMonthlyEur > 0
        ? [
            {
              id: 'kilometergeld',
              traceId: 'wf.kilometergeld',
              labelDe: 'Kilometergeld',
              labelSv: 'Milersättning',
              monthlyEur: -Math.round(kilometergeldMonthlyEur),
              kind: 'deduct' as const,
            },
          ]
        : []),
      {
        id: 'total',
        traceId: 'wf.total',
        labelDe: 'Kostet dich',
        labelSv: 'Kostar dig',
        monthlyEur: Math.round(central),
        kind: 'total',
      },
    ];

    registerTrace({
      id: 'wf.total',
      labelDe: 'Kostet dich pro Monat (Autokredit)',
      labelSv: 'Kostar dig per månad (Billån)',
      value: Math.round(central),
      formattedValue: `${formatEur(central)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'estimated',
      formulaDe:
        'Wertverlust + Kreditzinsen + Motorsteuer + Versicherung + Energie + Service/Reifen − Kilometergeld',
      formulaSv:
        'Värdeminskning + Låneränta + Fordonsskatt + Försäkring + Energi + Service/däck − Milersättning',
      explanationDe: `Monatliche Vollkosten bei Kreditfinanzierung (${Math.round(downPaymentShare * 100)} % Anzahlung, ${(loanRate * 100).toFixed(2)} % Sollzinssatz).`,
      explanationSv: `Total månadskostnad med billån (${Math.round(downPaymentShare * 100)} % kontantinsats, ${(loanRate * 100).toFixed(2)} % ränta, inget skatteavdrag för ränta i AT).`,
      inputs: waterfall.filter((w) => w.id !== 'total').map((w) => w.traceId),
      span: { low: Math.round(low), high: Math.round(high) },
    });

    return {
      form,
      available: true,
      months,
      wallet: {
        low: Math.round(low),
        central: Math.round(central),
        high: Math.round(high),
      },
      perKmEur: (central * 12) / profile.kmPerYear,
      totalOverHoldingEur: Math.round(central * months),
      novaEurTotal: nova.novaEur,
      novaPercent: nova.novaPercent,
      motorTaxMonthlyEur: motorTax.monthlyEur,
      sachbezugMonthlyGrossEur: 0,
      sachbezugTaxMonthlyEur: 0,
      vorsteuerDeductionTotalEur: 0,
      residualEndEur: {
        low: residualLow,
        central: residualCentral,
        high: residualHigh,
      },
      residualShare36m: baseShareCentral,
      waterfall,
      traces,
      warningsDe,
      warningsSv,
      assumptionsDe,
      assumptionsSv,
    };
  }

  if (form === 'privateLease') {
    const offer = car.leaseOffer;
    if (!offer && overrides.customLeaseMonthly === undefined) {
      return {
        form,
        available: false,
        unavailableReasonDe:
          'Kein aktuelles Privatleasing-Aktionsangebot hinterlegt (Eigenes Angebot im Rechner eingeben).',
        unavailableReasonSv:
          'Inget aktuellt privatleasingerbjudande i katalogen (du kan mata in egen offert på kalkylsidan).',
        months,
        wallet: { low: 0, central: 0, high: 0 },
        perKmEur: 0,
        totalOverHoldingEur: 0,
        novaEurTotal: nova.novaEur,
        novaPercent: nova.novaPercent,
        motorTaxMonthlyEur: motorTax.monthlyEur,
        sachbezugMonthlyGrossEur: 0,
        sachbezugTaxMonthlyEur: 0,
        vorsteuerDeductionTotalEur: 0,
        residualEndEur: { low: 0, central: 0, high: 0 },
        residualShare36m: baseShareCentral,
        waterfall: [],
        traces,
        warningsDe: [],
        warningsSv: [],
        assumptionsDe: [],
        assumptionsSv: [],
      };
    }

    const baseMonthlyFee =
      overrides.customLeaseMonthly ?? offer?.monthlyFeeGross ?? 399;
    const firstPayment = offer?.firstPaymentGross ?? 4200;
    const setupFee = offer?.setupFeeGross ?? 160;
    const contractKm = offer?.kmPerYear ?? 15000;
    const overKmRate = offer?.overKmEur ?? 0.15;
    const excessKmPerYear = Math.max(0, profile.kmPerYear - contractKm);
    const overKmMonthly = (excessKmPerYear * overKmRate) / 12;
    const upfrontAmortizedMonthly =
      (firstPayment + setupFee) / (offer?.termMonths ?? 36);
    const effectiveLeaseMonthly =
      baseMonthlyFee + upfrontAmortizedMonthly + overKmMonthly;

    const leaseServiceMonthly = offer?.includesService ? 0 : serviceMonthlyEur;
    const leaseMaintMonthly =
      leaseServiceMonthly + tyresMonthlyEur + feesAndVignetteMonthlyEur;

    registerTrace({
      id: 'wf.leaseRate',
      labelDe: `Effektive Leasingrate (${offer?.lessor ?? 'Individuelles Angebot'})`,
      labelSv: `Effektiv leasingavgift (${offer?.lessor ?? 'Egen offert'})`,
      value: Math.round(effectiveLeaseMonthly),
      formattedValue: `${formatEur(effectiveLeaseMonthly)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: overrides.customLeaseMonthly !== undefined ? 'user' : 'market',
      formulaDe: `Monatsrate ${formatEur(baseMonthlyFee)} + Mietvorauszahlung/Gebühr (${formatEur(firstPayment + setupFee)} ÷ ${offer?.termMonths ?? 36} Mon. = ${formatEur(upfrontAmortizedMonthly)})${overKmMonthly > 0 ? ` + Mehrkilometer ${formatEur(overKmMonthly)}/Monat` : ''}`,
      formulaSv: `Månadsavgift ${formatEur(baseMonthlyFee)} + Första förhöjd avgift/uppläggning (${formatEur(firstPayment + setupFee)} ÷ ${offer?.termMonths ?? 36} mån = ${formatEur(upfrontAmortizedMonthly)})${overKmMonthly > 0 ? ` + Övermil ${formatEur(overKmMonthly)}/mån` : ''}`,
      explanationDe: `In Österreich beinhalten Privatleasing-Angebote fast immer eine Mietvorauszahlung (Anzahlung). Wir legen diese exakt auf die Laufzeit um, damit Äpfel mit Äpfeln verglichen werden.`,
      explanationSv: `I Österrike har privatleasingerbjudanden nästan alltid en första förhöjd leasingavgift (Mietvorauszahlung). Vi slår ut den per månad så att totalkostnaden blir rättvisande.`,
      inputs: [],
      source: OFFICIAL_SOURCES.oeamtcAutokosten,
    });

    const central =
      effectiveLeaseMonthly +
      motorTax.monthlyEur +
      insuranceMonthlyCentral +
      energyMonthlyEur +
      leaseMaintMonthly -
      kilometergeldMonthlyEur;

    const low =
      effectiveLeaseMonthly +
      motorTax.monthlyEur +
      insuranceMonthlyLow +
      energyMonthlyEur +
      leaseMaintMonthly -
      kilometergeldMonthlyEur;

    const high =
      effectiveLeaseMonthly +
      motorTax.monthlyEur +
      insuranceMonthlyHigh +
      energyMonthlyEur +
      leaseMaintMonthly -
      kilometergeldMonthlyEur;

    const waterfall: WaterfallLine[] = [
      {
        id: 'leaseRate',
        traceId: 'wf.leaseRate',
        labelDe: 'Leasing (eff.)',
        labelSv: 'Leasing (eff.)',
        monthlyEur: Math.round(effectiveLeaseMonthly),
        kind: 'base',
      },
      {
        id: 'motorTax',
        traceId: 'wf.motorTax',
        labelDe: 'Motorsteuer',
        labelSv: 'Fordonsskatt',
        monthlyEur: Math.round(motorTax.monthlyEur),
        kind: 'add',
      },
      {
        id: 'insurance',
        traceId: 'wf.insurance',
        labelDe: 'Versicherung',
        labelSv: 'Försäkring',
        monthlyEur: Math.round(insuranceMonthlyCentral),
        kind: 'add',
      },
      {
        id: 'energy',
        traceId: 'wf.energy',
        labelDe: car.powertrain === 'bev' ? 'Ladestrom' : 'Energie',
        labelSv: car.powertrain === 'bev' ? 'Laddström' : 'Energi',
        monthlyEur: Math.round(energyMonthlyEur),
        kind: 'add',
      },
      {
        id: 'maintenance',
        traceId: 'wf.maintenance',
        labelDe: offer?.includesService ? 'Reifen & Pickerl' : 'Service & Reifen',
        labelSv: offer?.includesService ? 'Däck & Pickerl' : 'Service & däck',
        monthlyEur: Math.round(leaseMaintMonthly),
        kind: 'add',
      },
      ...(kilometergeldMonthlyEur > 0
        ? [
            {
              id: 'kilometergeld',
              traceId: 'wf.kilometergeld',
              labelDe: 'Kilometergeld',
              labelSv: 'Milersättning',
              monthlyEur: -Math.round(kilometergeldMonthlyEur),
              kind: 'deduct' as const,
            },
          ]
        : []),
      {
        id: 'total',
        traceId: 'wf.total',
        labelDe: 'Kostet dich',
        labelSv: 'Kostar dig',
        monthlyEur: Math.round(central),
        kind: 'total',
      },
    ];

    registerTrace({
      id: 'wf.total',
      labelDe: 'Kostet dich pro Monat (Privatleasing)',
      labelSv: 'Kostar dig per månad (Privatleasing)',
      value: Math.round(central),
      formattedValue: `${formatEur(central)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'estimated',
      formulaDe:
        'Effektive Leasingrate (inkl. Mietvorauszahlung) + Motorsteuer + Versicherung + Energie + Reifen/Service − Kilometergeld',
      formulaSv:
        'Effektiv leasingavgift (inkl. första förhöjd avgift) + Fordonsskatt + Försäkring + Energi + Däck/service − Milersättning',
      explanationDe: `Monatliche Gesamtbelastung beim österreichischen Privatleasing über ${months} Monate.`,
      explanationSv: `Total månadskostnad vid österrikisk privatleasing över ${months} månader.`,
      inputs: waterfall.filter((w) => w.id !== 'total').map((w) => w.traceId),
      span: { low: Math.round(low), high: Math.round(high) },
    });

    return {
      form,
      available: true,
      months,
      wallet: {
        low: Math.round(low),
        central: Math.round(central),
        high: Math.round(high),
      },
      perKmEur: (central * 12) / profile.kmPerYear,
      totalOverHoldingEur: Math.round(central * months),
      novaEurTotal: nova.novaEur,
      novaPercent: nova.novaPercent,
      motorTaxMonthlyEur: motorTax.monthlyEur,
      sachbezugMonthlyGrossEur: 0,
      sachbezugTaxMonthlyEur: 0,
      vorsteuerDeductionTotalEur: 0,
      residualEndEur: {
        low: residualLow,
        central: residualCentral,
        high: residualHigh,
      },
      residualShare36m: baseShareCentral,
      waterfall,
      traces,
      warningsDe,
      warningsSv,
      assumptionsDe,
      assumptionsSv,
    };
  }

  if (form === 'companyGmbh') {
    const isSoleTraderMode =
      profile.access.soleTrader && !profile.access.ownGmbh;
    const isBusinessAvailable =
      profile.access.ownGmbh || profile.access.soleTrader;

    // 1. Gross cost before tax shields
    const grossMonthlyBeforeTax =
      depreciationMonthlyCentral +
      motorTax.monthlyEur +
      insuranceMonthlyCentral +
      energyMonthlyEur +
      maintenanceTotalMonthly;

    // 2. Vorsteuerabzug on purchase & running costs
    //    0 € if vatExempt (e.g., Sjukvård / Heilbehandlung § 6 Abs 1 Z 19 UStG) or non-BEV!
    const netSaleVatRefund =
      !isVatExempt && car.powertrain === 'bev' && !vorsteuer.isAbove80k
        ? Math.min(residualCentral, AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross) *
          (0.2 / 1.2)
        : 0;
    const netPurchaseVorsteuerTotal = isVatExempt
      ? 0
      : Math.max(0, vorsteuer.vorsteuerEur - netSaleVatRefund);
    const runningVorsteuerMonthly =
      !isVatExempt && car.powertrain === 'bev'
        ? (energyMonthlyEur + serviceMonthlyEur + tyresMonthlyEur) * (0.2 / 1.2)
        : 0;
    const totalVorsteuerMonthly =
      netPurchaseVorsteuerTotal / months + runningVorsteuerMonthly;

    // 3. Luxustangente (€40,000 gross cap) & Business usage share
    const deductibleShareOfDepreciation = Math.min(
      1,
      AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross / purchasePriceGross
    );

    // For Ordination / Freiberufler / EPU (soleTrader): only the business share (betrieblicher Anteil)
    // is deductible against ESt (and there is no employee Sachbezug payroll tax).
    const rawBizShare =
      profile.kmPerYear > 0 ? profile.businessKmPerYear / profile.kmPerYear : 0;
    const effectiveBizShare = isSoleTraderMode
      ? rawBizShare > 0
        ? Math.min(1, Math.max(0.5, rawBizShare))
        : 0.65 // Default 65% betriebliche Nutzung in Ordination/EPU if businessKm not yet slid
      : 1.0;

    // 20 % Öko-Investitionsfreibetrag (§ 10 EStG) for 0 g/km BEVs in Betriebsvermögen (up to €40,000 base)
    const oekoIfbBaseEur =
      car.powertrain === 'bev'
        ? Math.min(
            AUSTRIAN_MARKET_CONSTANTS.luxustangenteGross,
            purchasePriceGross - netPurchaseVorsteuerTotal
          ) *
          effectiveBizShare *
          0.2
        : 0;
    const oekoIfbMonthlyExpenseEquivalent = oekoIfbBaseEur / months;

    const deductibleMonthlyExpense =
      ((depreciationMonthlyCentral - netPurchaseVorsteuerTotal / months) *
        deductibleShareOfDepreciation +
        (motorTax.monthlyEur + insuranceMonthlyCentral) *
          deductibleShareOfDepreciation +
        (energyMonthlyEur + maintenanceTotalMonthly - runningVorsteuerMonthly)) *
        effectiveBizShare +
      oekoIfbMonthlyExpenseEquivalent;

    // Tax rate: ESt marginal bracket for Ordination/EPU or GmbH GF-Bezug; combined KöSt+KESt for GmbH dividend
    const effectiveOwnerTaxRate = isSoleTraderMode
      ? profile.taxBracket
      : profile.gmbhPayoutChannel === 'dividend'
        ? 1 -
          (1 - AUSTRIAN_MARKET_CONSTANTS.koestRate) *
            (1 - AUSTRIAN_MARKET_CONSTANTS.kestRate) // ~44.18% combined KöSt + KESt
        : profile.taxBracket;

    const taxShieldMonthly = deductibleMonthlyExpense * effectiveOwnerTaxRate;

    // In Ordination / EPU (soleTrader), private use is already accounted for via (1 - effectiveBizShare) Privatanteil,
    // so there is NO employee Sachbezug payroll tax!
    const sachbezugTotalMonthly = isSoleTraderMode
      ? 0
      : sachbezug.monthlyEmployeeTaxEur + sachbezug.monthlyEmployerLnkEur;

    registerTrace({
      id: 'wf.vorsteuer',
      labelDe: isVatExempt
        ? 'Vorsteuerabzug (0 € – Unecht USt-befreit / Heilbehandlung)'
        : 'Vorsteuerabzug (20 % USt-Vorteil)',
      labelSv: isVatExempt
        ? 'Momsavdrag (0 € – Momsbefriad sjukvård § 6 UStG)'
        : 'Momsavdrag (Vorsteuerabzug 20 % USt)',
      value: -Math.round(totalVorsteuerMonthly),
      formattedValue:
        totalVorsteuerMonthly > 0
          ? `−${formatEur(totalVorsteuerMonthly)}/Monat`
          : '0 €/Monat',
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'legislated',
      formulaDe: isVatExempt
        ? 'Unechte Umsatzsteuerbefreiung (§ 6 Abs. 1 Z 19 UStG iVm § 12 Abs. 3 UStG) → 0,00 € Vorsteuerabzug. Dafür sind die Brutto-Kosten (inkl. 20 % USt, bis 40.000 € Luxustangente) als Betriebsausgabe in der ESt/KöSt absetzbar.'
        : car.powertrain === 'bev'
          ? vorsteuer.isAbove80k
            ? 'Bruttopreis > 80.000 € → 0 € Vorsteuerabzug bei Anschaffung'
            : `Vorsteuer aus Kauf (bis 40.000 € Luxustangente: ${formatEur(vorsteuer.vorsteuerEur)}) + 20 % Vorsteuer aus Ladestrom & Service`
          : 'Verbrenner/Hybrid (> 0 g CO₂) → Kein Vorsteuerabzug für PKW in Österreich (§ 12 Abs. 2 Z 2a UStG)',
      formulaSv: isVatExempt
        ? 'Momsbefriad sjukvård (§ 6 Abs. 1 Z 19 UStG & § 12 Abs. 3 UStG) → 0,00 € i momsavdrag (Vorsteuer). I stället dras hela bruttokostnaden inklusive 20 % moms (upp till 40 000 € Luxustangente) av som kostnad mot inkomst-/bolagsskatten!'
        : car.powertrain === 'bev'
          ? vorsteuer.isAbove80k
            ? 'Bruttopris > 80 000 € → 0 € momsavdrag vid inköp'
            : `Fullt 20 % momsavdrag upp till 40 000 € Luxustangente (${formatEur(vorsteuer.vorsteuerEur)}) + 20 % momsavdrag på el & service`
          : 'Bensin/diesel/laddhybrid (> 0 g CO₂) → 0 € momsavdrag för personbil i Österrike',
      explanationDe: isVatExempt
        ? 'Ärzt:innen und Gesundheitsberufe sind in Österreich gemäß § 6 Abs. 1 Z 19 UStG unecht umsatzsteuerbefreit. Daher kann auch beim E-Auto keine Vorsteuer abgezogen werden; die 20 % USt erhöhen stattdessen die steuerlich absetzbare Betriebsausgabe.'
        : 'In Österreich sind 0 g/km CO₂ Elektro-PKW bis 40.000 € brutto voll vorsteuerabzugsberechtigt (max. 6.667 € USt).',
      explanationSv: isVatExempt
        ? 'Sjukvård och läkarmottagningar (Ordination) är undantagna från moms i Österrike (unecht umsatzsteuerbefreit). Därför får man 0 € i momsavdrag även på elbil — men den ej avdragsgilla momsen ingår i underlaget som dras av mot din inkomstskatt (ESt)!'
        : 'I Österrike får momspliktiga företag dra av hela momsen (20 % USt) på elbilar upp till 40 000 € (max 6 667 €).',
      inputs: ['price.purchase'],
      source: isVatExempt
        ? OFFICIAL_SOURCES.bmfHeilbehandlungUst
        : OFFICIAL_SOURCES.bmfVorsteuer,
    });

    registerTrace({
      id: 'wf.koestShield',
      labelDe: isSoleTraderMode
        ? `ESt-Steuerersparnis Ordination/EPU (${Math.round(effectiveOwnerTaxRate * 100)} % Grenzsteuer)`
        : `GmbH-Steuervorteil (${profile.gmbhPayoutChannel === 'dividend' ? '23 % KöSt + 27,5 % KESt' : 'GF-Bezug Steuerersparnis'})`,
      labelSv: isSoleTraderMode
        ? `Skattesköld Ordination/EPU (${Math.round(effectiveOwnerTaxRate * 100)} % marginalskatt ESt)`
        : `Skattesköld i GmbH (${profile.gmbhPayoutChannel === 'dividend' ? '23 % KöSt + 27,5 % KESt' : 'Löneskattesköld'})`,
      value: -Math.round(taxShieldMonthly),
      formattedValue: `−${formatEur(taxShieldMonthly)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'legislated',
      formulaDe: isSoleTraderMode
        ? `Abzugsfähige Betriebsausgaben (${Math.round(effectiveBizShare * 100)} % betrieblicher Anteil${isVatExempt ? ' inkl. 20 % USt' : ''}, Luxustangente 40.000 €${oekoIfbBaseEur > 0 ? ` + 20 % Öko-IFB § 10 EStG` : ''}) = ${formatEur(deductibleMonthlyExpense)}/Mon. × ${Math.round(effectiveOwnerTaxRate * 100)} % ESt`
        : `Abzugsfähige GmbH-Kosten ${formatEur(deductibleMonthlyExpense)}/Monat (Luxustangente 40.000 € berücksichtigt) × ${Math.round(effectiveOwnerTaxRate * 100)} % Steuerersparnis`,
      formulaSv: isSoleTraderMode
        ? `Avdragsgilla kostnader i Ordination/EPU (${Math.round(effectiveBizShare * 100)} % tjänsteandel${isVatExempt ? ' inkl. 20 % moms' : ''}, 40 000 € Luxustangente${oekoIfbBaseEur > 0 ? ` + 20 % Öko-IFB § 10 EStG` : ''}) = ${formatEur(deductibleMonthlyExpense)}/mån × ${Math.round(effectiveOwnerTaxRate * 100)} % ESt`
        : `Avdragsgilla GmbH-kostnader ${formatEur(deductibleMonthlyExpense)}/mån (beaktat 40 000 € Luxustangente) × ${Math.round(effectiveOwnerTaxRate * 100)} % skatteeffekt`,
      explanationDe: isSoleTraderMode
        ? `In einer Einzelpraxis / Ordination oder als EPU (§ 22 / § 23 EStG) mindern die betrieblichen PKW-Kosten (${Math.round(effectiveBizShare * 100)} % Nutzung, Privatanteil ${Math.round((1 - effectiveBizShare) * 100)} % ausgeschieden) direkt dein steuerpflichtiges Einkommen zum Grenzsteuersatz von ${Math.round(effectiveOwnerTaxRate * 100)} %.`
        : 'Da die GmbH die Fahrzeugkosten aus unversteuertem Unternehmensgewinn trägt, erspart sich die Gesellschafter-Geschäftsführung Körperschaftsteuer (23 % KöSt) und Ausschüttungsbesteuerung (27,5 % KESt) bzw. Einkommensteuer.',
      explanationSv: isSoleTraderMode
        ? `I en egen läkarmottagning (Ordination / Freiberufler) eller enskild firma (EPU) i Österrike dras tjänsteandelen (${Math.round(effectiveBizShare * 100)} %; privatandel ${Math.round((1 - effectiveBizShare) * 100)} % ej avdragsgill) av direkt mot din progressiva inkomstskatt (${Math.round(effectiveOwnerTaxRate * 100)} % ESt).`
        : 'Eftersom ditt österrikiska GmbH betalar bilen med oskattade bolagsmedel slipper du 23 % bolagsskatt (KöSt) och 27,5 % utdelningsskatt (KESt) respektive inkomstskatt.',
      inputs: [],
      source: isVatExempt
        ? OFFICIAL_SOURCES.bmfHeilbehandlungUst
        : OFFICIAL_SOURCES.bmfVorsteuer,
    });

    registerTrace({
      id: 'wf.sachbezug',
      labelDe: isSoleTraderMode
        ? `Privatanteil ausgeschieden (${Math.round((1 - effectiveBizShare) * 100)} % – kein Dienstnehmer-Sachbezug)`
        : `Sachbezug-Steuer (${sachbezug.ratePercent.toFixed(1).replace('.', ',')} %)`,
      labelSv: isSoleTraderMode
        ? `Privatandel avräknad (${Math.round((1 - effectiveBizShare) * 100)} % – ingen Sachbezug-skatt i EPU)`
        : `Förmånsskatt / Sachbezug (${sachbezug.ratePercent.toFixed(1).replace('.', ',')} %)`,
      value: Math.round(sachbezugTotalMonthly),
      formattedValue: `${formatEur(sachbezugTotalMonthly)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'legislated',
      formulaDe: isSoleTraderMode
        ? `Einzelunternehmen / Ordination → Kein Dienstnehmer-Sachbezug (Privatanteil von ${Math.round((1 - effectiveBizShare) * 100)} % ist bereits bei den Betriebsausgaben abgezogen)`
        : car.powertrain === 'bev'
          ? '0 g/km CO₂ → 0,00 € Sachbezug in Österreich!'
          : `Sachbezug ${formatEur(sachbezug.monthlyGrossBenefitEur)}/Monat × (${Math.round(profile.taxBracket * 100)} % ESt + 7,1 % Lohnnebenkosten)`,
      formulaSv: isSoleTraderMode
        ? `Ordination / EPU (ej GmbH) → Ingen anställds-Sachbezug utgår (privatandelen på ${Math.round((1 - effectiveBizShare) * 100)} % är redan borträknad från skatteavdraget)`
        : car.powertrain === 'bev'
          ? '0 g/km CO₂ → 0,00 € i förmånsvärde (Sachbezug) i Österrike!'
          : `Sachbezug ${formatEur(sachbezug.monthlyGrossBenefitEur)}/mån × (${Math.round(profile.taxBracket * 100)} % skatt + 7,1 % arbetsgivaravgifter)`,
      explanationDe: isSoleTraderMode
        ? 'Selbständige Ärzt:innen / Freiberufler:innen im Einzelunternehmen unterliegen nicht der Sachbezugswerteverordnung für Dienstnehmer, sondern scheiden den tatsächlichen Privatanteil aus den Betriebsausgaben aus.'
        : car.powertrain === 'bev'
          ? 'Der größte Steuervorteil Österreichs: Für Privatfahrten mit einem 0 g/km CO₂ Firmenwagen fällt 0 € Sachbezug an – auch das Aufladen zuhause oder in der Firma ist steuerfrei!'
          : `Bei Verbrennern und Plug-in-Hybriden müssen monatlich ${sachbezug.ratePercent} % des Listenpreises versteuert werden.`,
      explanationSv: isSoleTraderMode
        ? 'I en Ordination / EPU (enskild verksamhet utan GmbH) betalar man inte schablonmässig Sachbezug som anställd; i stället drar man bara av den faktiska tjänsteandelen i deklarationen.'
        : car.powertrain === 'bev'
          ? 'Österrikes största skattefördel: För elbilar (0 g/km CO₂) är förmånsvärdet (Sachbezug) 0 € per månad!'
          : `För bensin, diesel och laddhybrid beskattas ${sachbezug.ratePercent} % av nybilspriset per månad.`,
      inputs: [],
      source: OFFICIAL_SOURCES.bmfSachbezug,
    });

    const central =
      grossMonthlyBeforeTax -
      totalVorsteuerMonthly -
      taxShieldMonthly +
      sachbezugTotalMonthly;
    const low =
      central - (depreciationMonthlyCentral - depreciationMonthlyLow) * 0.7;
    const high =
      central + (depreciationMonthlyHigh - depreciationMonthlyCentral) * 0.7;

    const waterfall: WaterfallLine[] = [
      {
        id: 'depreciation',
        traceId: 'wf.depreciation',
        labelDe: 'Wertverlust (Brutto)',
        labelSv: 'Värdeminskning (Brutto)',
        monthlyEur: Math.round(depreciationMonthlyCentral),
        kind: 'base',
      },
      {
        id: 'running',
        traceId: 'wf.maintenance',
        labelDe: 'Betrieb, Strom & Vers.',
        labelSv: 'Drift, el & försäkring',
        monthlyEur: Math.round(
          motorTax.monthlyEur +
            insuranceMonthlyCentral +
            energyMonthlyEur +
            maintenanceTotalMonthly
        ),
        kind: 'add',
      },
      {
        id: 'vorsteuer',
        traceId: 'wf.vorsteuer',
        labelDe: isVatExempt ? 'Vorsteuer (0 € USt-befreit)' : 'Vorsteuerabzug',
        labelSv: isVatExempt ? 'Momsavdrag (0 € sjukvård)' : 'Momsavdrag (USt)',
        monthlyEur: -Math.round(totalVorsteuerMonthly),
        kind: 'deduct',
        shortNoteDe: isVatExempt ? '§ 6 Abs 1 Z 19 UStG (Heilbehandlung)' : undefined,
        shortNoteSv: isVatExempt ? '§ 6 Abs 1 Z 19 UStG (Momsbefriad vård)' : undefined,
      },
      {
        id: 'koestShield',
        traceId: 'wf.koestShield',
        labelDe: isSoleTraderMode
          ? `ESt-Vorteil (${Math.round(effectiveBizShare * 100)} % Betrieb)`
          : 'KöSt/ESt-Vorteil',
        labelSv: isSoleTraderMode
          ? `ESt-skattesköld (${Math.round(effectiveBizShare * 100)} % tjänst)`
          : 'Skattesköld GmbH',
        monthlyEur: -Math.round(taxShieldMonthly),
        kind: 'deduct',
      },
      ...(sachbezugTotalMonthly > 0
        ? [
            {
              id: 'sachbezug',
              traceId: 'wf.sachbezug',
              labelDe: 'Sachbezug-Steuer',
              labelSv: 'Sachbezug-skatt',
              monthlyEur: Math.round(sachbezugTotalMonthly),
              kind: 'warn' as const,
            },
          ]
        : [
            {
              id: 'sachbezugZero',
              traceId: 'wf.sachbezug',
              labelDe: isSoleTraderMode ? 'Kein Sachbezug (EPU)' : 'Sachbezug (0 %)',
              labelSv: isSoleTraderMode ? 'Ingen Sachbezug (EPU)' : 'Förmånsskatt (0 %)',
              monthlyEur: 0,
              kind: 'deduct' as const,
            },
          ]),
      {
        id: 'total',
        traceId: 'wf.total',
        labelDe: 'Kostet dich (Netto)',
        labelSv: 'Kostar dig (Netto)',
        monthlyEur: Math.round(central),
        kind: 'total',
      },
    ];

    registerTrace({
      id: 'wf.total',
      labelDe: isSoleTraderMode
        ? `Kostet dich netto über Ordination / EPU (${isVatExempt ? 'USt-befreit' : 'mit Vorsteuer'})`
        : `Kostet dich netto über eigene GmbH (${isVatExempt ? 'USt-befreit' : 'mit Vorsteuer'})`,
      labelSv: isSoleTraderMode
        ? `Kostar dig netto via Ordination / EPU (${isVatExempt ? 'Momsbefriad sjukvård' : 'med momsavdrag'})`
        : `Kostar dig netto via eget GmbH (${isVatExempt ? 'Momsbefriad' : 'med momsavdrag'})`,
      value: Math.round(central),
      formattedValue: `${formatEur(central)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'estimated',
      formulaDe: isSoleTraderMode
        ? `Brutto-Fahrzeugkosten${isVatExempt ? ' (0 € Vorsteuerabzug nach § 6 UStG)' : ' − Vorsteuerabzug'} − ESt-Steuerersparnis (${Math.round(effectiveBizShare * 100)} % betrieblicher Anteil × ${Math.round(effectiveOwnerTaxRate * 100)} % ESt)`
        : 'Brutto-Fahrzeugkosten − Vorsteuerabzug − KöSt/KESt-Steuerschild + Sachbezug-Steuer',
      formulaSv: isSoleTraderMode
        ? `Bruttokostnad inkl. 20 % moms${isVatExempt ? ' (0 € momsavdrag inom sjukvård)' : ' − momsavdrag'} − Inkomstskattesköld (${Math.round(effectiveBizShare * 100)} % tjänsteandel × ${Math.round(effectiveOwnerTaxRate * 100)} % ESt)`
        : 'Bruttokostnad − Momsavdrag − Bolags-/utdelningsskattesköld + Förmånsskatt (Sachbezug)',
      explanationDe: isSoleTraderMode
        ? `Effektive monatliche Nettobelastung bei Führung des PKW in deiner Ordination / Einzelpraxis (EPU) ohne GmbH.`
        : `Effektive monatliche Nettobelastung für Gesellschafter-Geschäftsführer:innen einer österreichischen GmbH.`,
      explanationSv: isSoleTraderMode
        ? `Effektiv privat nettokostnad per månad när bilen tas på din Ordination / enskilda verksamhet (EPU / Freiberufler) i Österrike utan GmbH.`
        : `Effektiv privat nettokostnad per månad för ägare av ett österrikiskt aktiebolag (GmbH).`,
      inputs: waterfall.filter((w) => w.id !== 'total').map((w) => w.traceId),
      span: { low: Math.round(low), high: Math.round(high) },
    });

    if (isVatExempt) {
      assumptionsDe.push(
        `Unechte Umsatzsteuerbefreiung (§ 6 Abs. 1 Z 19 UStG – Heilbehandlung/Gesundheitsberuf): 0 € Vorsteuerabzug; Ausgaben werden brutto (inkl. 20 % USt) bis zur 40.000-€-Luxustangente angesetzt.`
      );
      assumptionsSv.push(
        `Momsbefriad verksamhet (§ 6 Abs. 1 Z 19 UStG – sjukvård/läkare): 0 € i momsavdrag (Vorsteuer); kostnaderna dras i stället av brutto inklusive 20 % moms (upp till 40 000 € Luxustangente).`
      );
    }

    if (isSoleTraderMode && rawBizShare === 0) {
      assumptionsDe.push(
        `Hinweis Ordination/EPU: Da 0 km Dienstreisen eingestellt sind, rechnet das Modell mit 65 % betrieblicher Nutzung im Betriebsvermögen. Passe „Davon berufliche Kilometer“ in Meine Situation für deine exakte Quote an.`
      );
      assumptionsSv.push(
        `Notis Ordination/EPU: Eftersom tjänstekörning står på 0 km antar kalkylen 65 % användning i verksamheten (Betriebsvermögen). Justera ”Varav tjänstekörning” i Min situation för din exakta andel.`
      );
    }

    if (vorsteuer.isCapped) {
      warningsDe.push(
        `Luxustangente aktiv: Kaufpreis (${formatEur(purchasePriceGross)}) liegt über der 40.000-€-Angemessenheitsgrenze (brutto inkl. USt). AfA ist auf 40.000 € gedeckelt.`
      );
      warningsSv.push(
        `Luxustangente aktiv: Priset (${formatEur(purchasePriceGross)}) överstiger taket på 40 000 € brutto (inkl. moms). Skattemässig avskrivning (AfA) begränsas till 40 000 €.`
      );
    }

    return {
      form,
      available: isBusinessAvailable,
      unavailableReasonDe:
        'Aktiviere „Ordination / EPU“ oder „Eigene GmbH“ in Meine Situation.',
      unavailableReasonSv:
        'Aktivera ”Egen mottagning / Ordination / EPU” eller ”Eget GmbH” i Min situation.',
      months,
      wallet: {
        low: Math.round(low),
        central: Math.round(central),
        high: Math.round(high),
      },
      perKmEur: (central * 12) / profile.kmPerYear,
      totalOverHoldingEur: Math.round(central * months),
      novaEurTotal: nova.novaEur,
      novaPercent: nova.novaPercent,
      motorTaxMonthlyEur: motorTax.monthlyEur,
      sachbezugMonthlyGrossEur: isSoleTraderMode
        ? 0
        : sachbezug.monthlyGrossBenefitEur,
      sachbezugTaxMonthlyEur: isSoleTraderMode
        ? 0
        : sachbezug.monthlyEmployeeTaxEur,
      vorsteuerDeductionTotalEur: Math.round(totalVorsteuerMonthly * months),
      residualEndEur: {
        low: residualLow,
        central: residualCentral,
        high: residualHigh,
      },
      residualShare36m: baseShareCentral,
      waterfall,
      traces,
      warningsDe,
      warningsSv,
      assumptionsDe,
      assumptionsSv,
    };
  }

  if (form === 'benefitCar') {
    // Dienstwagen vom Arbeitgeber (Employer pays car, insurance, service, tax; employee pays Sachbezug tax; private charging if not covered)
    // In Austria, employer can reimburse home charging tax-free for EVs! Let's show residual private energy or €0 if employer covers it, plus Sachbezug tax.
    const privateEnergyContribution = Math.round(energyMonthlyEur * 0.25); // 75% covered by employer / Ladekarte, 25% private convenience/vacation charging
    const central = sachbezug.monthlyEmployeeTaxEur + privateEnergyContribution + profile.parkingMonthly;
    const low = Math.max(0, central - 25);
    const high = central + 45;

    registerTrace({
      id: 'wf.sachbezugEmployee',
      labelDe: `Lohnsteuer auf Sachbezug (${sachbezug.ratePercent.toFixed(1).replace('.', ',')} %)`,
      labelSv: `Inkomstskatt på Sachbezug (${sachbezug.ratePercent.toFixed(1).replace('.', ',')} %)`,
      value: Math.round(sachbezug.monthlyEmployeeTaxEur),
      formattedValue: `${formatEur(sachbezug.monthlyEmployeeTaxEur)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'legislated',
      formulaDe:
        car.powertrain === 'bev'
          ? '0 g/km CO₂ → 0,00 € Sachbezug (§ 4 Abs. 1 Z 3 SachbezugswerteVO)'
          : `${formatEur(referencePriceGross)} × ${sachbezug.ratePercent.toFixed(2)} % = ${formatEur(sachbezug.monthlyGrossBenefitEur)} Sachbezug × ${Math.round(profile.taxBracket * 100)} % Grenzsteuersatz`,
      formulaSv:
        car.powertrain === 'bev'
          ? '0 g/km CO₂ → 0,00 € förmånsskatt i Österrike!'
          : `${formatEur(referencePriceGross)} × ${sachbezug.ratePercent.toFixed(2)} % = ${formatEur(sachbezug.monthlyGrossBenefitEur)} förmånsvärde × ${Math.round(profile.taxBracket * 100)} % marginalskatt`,
      explanationDe:
        car.powertrain === 'bev'
          ? 'Für reine Elektroautos beträgt der Sachbezug in Österreich 0 %. Du zahlst 0 € Lohnsteuer für den Dienstwagen!'
          : `Für Dienstwagen mit CO₂-Ausstoß > 0 g/km wird monatlich ein Sachbezug von ${formatEur(sachbezug.monthlyGrossBenefitEur)} zur Lohnsteuerbemessungsgrundlage addiert.`,
      explanationSv:
        car.powertrain === 'bev'
          ? 'För rena elbilar är förmånsvärdet (Sachbezug) i Österrike 0 %. Du betalar 0 € i förmånsskatt!'
          : `För tjänstebilar med CO₂-utsläpp > 0 g/km läggs ${formatEur(sachbezug.monthlyGrossBenefitEur)}/mån till din beskattningsbara lön.`,
      inputs: ['price.purchase'],
      source: OFFICIAL_SOURCES.bmfSachbezug,
    });

    registerTrace({
      id: 'wf.privateEnergy',
      labelDe: 'Privater Strom-/Tankanteil & Parken',
      labelSv: 'Privat el-/bränsleandel & parkering',
      value: privateEnergyContribution + profile.parkingMonthly,
      formattedValue: `${formatEur(privateEnergyContribution + profile.parkingMonthly)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'estimated',
      formulaDe: `25 % privater Urlaubs-/Fremdladeanteil (${formatEur(privateEnergyContribution)})${profile.parkingMonthly > 0 ? ` + Parken ${formatEur(profile.parkingMonthly)}` : ''}`,
      formulaSv: `25 % privat semester-/laddandel (${formatEur(privateEnergyContribution)})${profile.parkingMonthly > 0 ? ` + Parkering ${formatEur(profile.parkingMonthly)}` : ''}`,
      explanationDe:
        'Annahme: Der Arbeitgeber übernimmt Fahrzeug, Versicherung, Service und 75 % der laufenden Energiekosten (steuerfreier Ladestrom-Ersatz bis zum E-Control-Tarif möglich).',
      explanationSv:
        'Antagande: Arbetsgivaren betalar bil, försäkring, service och 75 % av energin (skattefri ersättning för hemmaladdning av elbil i Österrike).',
      inputs: ['wf.energy'],
      source: OFFICIAL_SOURCES.bmfSachbezug,
    });

    const waterfall: WaterfallLine[] = [
      {
        id: 'sachbezugEmployee',
        traceId: 'wf.sachbezugEmployee',
        labelDe: 'Sachbezug-Steuer',
        labelSv: 'Förmånsskatt',
        monthlyEur: Math.round(sachbezug.monthlyEmployeeTaxEur),
        kind: car.powertrain === 'bev' ? 'deduct' : 'base',
      },
      {
        id: 'privateEnergy',
        traceId: 'wf.privateEnergy',
        labelDe: 'Privat-Energie/Parken',
        labelSv: 'Privat energi/park.',
        monthlyEur: Math.round(privateEnergyContribution + profile.parkingMonthly),
        kind: 'add',
      },
      {
        id: 'total',
        traceId: 'wf.total',
        labelDe: 'Kostet dich',
        labelSv: 'Kostar dig',
        monthlyEur: Math.round(central),
        kind: 'total',
      },
    ];

    registerTrace({
      id: 'wf.total',
      labelDe: 'Kostet dich pro Monat (Dienstwagen)',
      labelSv: 'Kostar dig per månad (Tjänstebil / Dienstwagen)',
      value: Math.round(central),
      formattedValue: `${formatEur(central)}/Monat`,
      unitDe: '€/Monat',
      unitSv: '€/mån',
      status: 'estimated',
      formulaDe: 'Lohnsteuer auf Sachbezug + privater Energie-/Parkanteil',
      formulaSv: 'Förmånsskatt (Sachbezug) + privat energi-/parkeringsandel',
      explanationDe:
        'Deine persönliche monatliche Nettobelastung bei einem vom Arbeitgeber bereitgestellten Dienstwagen ohne eigenen Gehaltsverzicht.',
      explanationSv:
        'Din privata månadskostnad netto när arbetsgivaren står för tjänstebil (Dienstwagen) utan bruttolöneavdrag.',
      inputs: ['wf.sachbezugEmployee', 'wf.privateEnergy'],
      span: { low: Math.round(low), high: Math.round(high) },
    });

    return {
      form,
      available: profile.access.employerBenefitCar,
      unavailableReasonDe: 'Aktiviere „Dienstwagen“ in Meine Situation.',
      unavailableReasonSv: 'Aktivera ”Tjänstebil (Dienstwagen)” i Min situation.',
      months,
      wallet: {
        low: Math.round(low),
        central: Math.round(central),
        high: Math.round(high),
      },
      perKmEur: (central * 12) / profile.kmPerYear,
      totalOverHoldingEur: Math.round(central * months),
      novaEurTotal: nova.novaEur,
      novaPercent: nova.novaPercent,
      motorTaxMonthlyEur: motorTax.monthlyEur,
      sachbezugMonthlyGrossEur: sachbezug.monthlyGrossBenefitEur,
      sachbezugTaxMonthlyEur: sachbezug.monthlyEmployeeTaxEur,
      vorsteuerDeductionTotalEur: Math.round(vorsteuer.vorsteuerEur),
      residualEndEur: {
        low: residualLow,
        central: residualCentral,
        high: residualHigh,
      },
      residualShare36m: baseShareCentral,
      waterfall,
      traces,
      warningsDe,
      warningsSv,
      assumptionsDe,
      assumptionsSv,
    };
  }

  // form === 'salaryExchange' (Gehaltsumwandlung / Löneväxling in Austria)
  const netEmployerCarCostMonthly =
    depreciationMonthlyCentral +
    motorTax.monthlyEur +
    insuranceMonthlyCentral +
    maintenanceTotalMonthly -
    (car.powertrain === 'bev' ? vorsteuer.vorsteuerEur / months : 0);

  const grossSacrificeMonthly =
    overrides.customSalarySacrificeGross ??
    Math.round(
      netEmployerCarCostMonthly /
        (1 + AUSTRIAN_MARKET_CONSTANTS.lohnnebenkostenRate)
    );
  const incomeTaxSavedOnSacrifice = grossSacrificeMonthly * profile.taxBracket;
  const netSalaryLossMonthly = grossSacrificeMonthly - incomeTaxSavedOnSacrifice;
  const central =
    netSalaryLossMonthly +
    sachbezug.monthlyEmployeeTaxEur +
    energyMonthlyEur;
  const low = Math.round(central * 0.92);
  const high = Math.round(central * 1.09);

  registerTrace({
    id: 'wf.grossSacrifice',
    labelDe: 'Bruttogehaltsumwandlung (vor Steuer)',
    labelSv: 'Bruttolöneavdrag (Gehaltsumwandlung)',
    value: Math.round(grossSacrificeMonthly),
    formattedValue: `${formatEur(grossSacrificeMonthly)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status:
      overrides.customSalarySacrificeGross !== undefined ? 'user' : 'estimated',
    formulaDe: `Arbeitgeber-Nettokosten ${formatEur(netEmployerCarCostMonthly)} ÷ (1 + 7,1 % Lohnnebenkostenersparnis)`,
    formulaSv: `Arbetsgivarens nettokostnad ${formatEur(netEmployerCarCostMonthly)} ÷ (1 + 7,1 % lägre lönebikostnader)`,
    explanationDe:
      'Bei der Gehaltsumwandlung in Österreich verzichtet der/die Arbeitnehmer:in auf einen Teil des Bruttogehalts zugunsten eines kostenneutralen Dienstwagens.',
    explanationSv:
      'Vid löneväxling (Gehaltsumwandlung) i Österrike avstår den anställde från en del av bruttolönen i utbyte mot en kostnadsneutral förmånsbil.',
    inputs: ['price.purchase'],
    source: OFFICIAL_SOURCES.bmfSachbezug,
  });

  registerTrace({
    id: 'wf.sacrificeTaxSave',
    labelDe: `Lohnsteuerersparnis (${Math.round(profile.taxBracket * 100)} % Grenzsteuer)`,
    labelSv: `Skatteminskning på löneavdrag (${Math.round(profile.taxBracket * 100)} %)`,
    value: -Math.round(incomeTaxSavedOnSacrifice),
    formattedValue: `−${formatEur(incomeTaxSavedOnSacrifice)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'legislated',
    formulaDe: `Bruttoverzicht ${formatEur(grossSacrificeMonthly)} × ${Math.round(profile.taxBracket * 100)} % Grenzsteuersatz`,
    formulaSv: `Bruttolöneavdrag ${formatEur(grossSacrificeMonthly)} × ${Math.round(profile.taxBracket * 100)} % marginalskatt`,
    explanationDe:
      'Da die Umwandlung vom Bruttogehalt erfolgt, sinkt die Lohnsteuerbemessungsgrundlage. Bei E-Autos (0 % Sachbezug) bleibt diese Steuerersparnis voll erhalten!',
    explanationSv:
      'Eftersom avdraget görs på bruttolönen minskar din inkomstskatt. För elbilar (0 % Sachbezug) behåller du hela skattesänkningen!',
    inputs: ['wf.grossSacrifice'],
    source: OFFICIAL_SOURCES.bmfSachbezug,
  });

  registerTrace({
    id: 'wf.sachbezugExchange',
    labelDe: `Sachbezug-Steuer (${sachbezug.ratePercent.toFixed(1).replace('.', ',')} %)`,
    labelSv: `Förmånsskatt / Sachbezug (${sachbezug.ratePercent.toFixed(1).replace('.', ',')} %)`,
    value: Math.round(sachbezug.monthlyEmployeeTaxEur),
    formattedValue: `${formatEur(sachbezug.monthlyEmployeeTaxEur)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'legislated',
    formulaDe:
      car.powertrain === 'bev'
        ? '0 g/km CO₂ → 0 € Sachbezug'
        : `${formatEur(sachbezug.monthlyGrossBenefitEur)} × ${Math.round(profile.taxBracket * 100)} %`,
    formulaSv:
      car.powertrain === 'bev'
        ? '0 g/km CO₂ → 0 € Sachbezug'
        : `${formatEur(sachbezug.monthlyGrossBenefitEur)} × ${Math.round(profile.taxBracket * 100)} %`,
    explanationDe:
      'Lohnsteuer auf den Sachbezug. Bei Elektroautos 0 €; bei Verbrennern frisst der Sachbezug den Vorteil der Gehaltsumwandlung meist auf.',
    explanationSv:
      'Skatt på bilförmånen. För elbilar 0 €; för bensin/diesel äter Sachbezug-skatten oftast upp skattefördelen med löneväxling.',
    inputs: [],
    source: OFFICIAL_SOURCES.bmfSachbezug,
  });

  const waterfall: WaterfallLine[] = [
    {
      id: 'grossSacrifice',
      traceId: 'wf.grossSacrifice',
      labelDe: 'Bruttoverzicht',
      labelSv: 'Bruttolöneavdrag',
      monthlyEur: Math.round(grossSacrificeMonthly),
      kind: 'base',
    },
    {
      id: 'sacrificeTaxSave',
      traceId: 'wf.sacrificeTaxSave',
      labelDe: 'Steuerersparnis',
      labelSv: 'Skattelättnad',
      monthlyEur: -Math.round(incomeTaxSavedOnSacrifice),
      kind: 'deduct',
    },
    ...(sachbezug.monthlyEmployeeTaxEur > 0
      ? [
          {
            id: 'sachbezugExchange',
            traceId: 'wf.sachbezugExchange',
            labelDe: 'Sachbezug-Steuer',
            labelSv: 'Sachbezug-skatt',
            monthlyEur: Math.round(sachbezug.monthlyEmployeeTaxEur),
            kind: 'warn' as const,
          },
        ]
      : []),
    {
      id: 'energy',
      traceId: 'wf.energy',
      labelDe: car.powertrain === 'bev' ? 'Ladestrom' : 'Energie',
      labelSv: car.powertrain === 'bev' ? 'Laddström' : 'Energi',
      monthlyEur: Math.round(energyMonthlyEur),
      kind: 'add',
    },
    {
      id: 'total',
      traceId: 'wf.total',
      labelDe: 'Kostet dich',
      labelSv: 'Kostar dig',
      monthlyEur: Math.round(central),
      kind: 'total',
    },
  ];

  registerTrace({
    id: 'wf.total',
    labelDe: 'Kostet dich pro Monat (Gehaltsumwandlung)',
    labelSv: 'Kostar dig per månad (Löneväxling / Gehaltsumwandlung)',
    value: Math.round(central),
    formattedValue: `${formatEur(central)}/Monat`,
    unitDe: '€/Monat',
    unitSv: '€/mån',
    status: 'estimated',
    formulaDe:
      'Bruttogehaltsverzicht − Lohnsteuerersparnis + Sachbezug-Steuer + Ladestrom/Energie',
    formulaSv:
      'Bruttolöneavdrag − Skattelättnad + Förmånsskatt (Sachbezug) + Laddström/energi',
    explanationDe:
      'Netto-Belastung im Geldbörsel bei kostenneutraler Gehaltsumwandlung über den Arbeitgeber in Österreich.',
    explanationSv:
      'Nettokostnad i plånboken vid kostnadsneutral löneväxling (Gehaltsumwandlung) i Österrike.',
    inputs: waterfall.filter((w) => w.id !== 'total').map((w) => w.traceId),
    span: { low: Math.round(low), high: Math.round(high) },
  });

  return {
    form,
    available: profile.access.employerSalaryExchange,
    unavailableReasonDe: 'Aktiviere „Gehaltsumwandlung“ in Meine Situation.',
    unavailableReasonSv:
      'Aktivera ”Löneväxling (Gehaltsumwandlung)” i Min situation.',
    months,
    wallet: {
      low: Math.round(low),
      central: Math.round(central),
      high: Math.round(high),
    },
    perKmEur: (central * 12) / profile.kmPerYear,
    totalOverHoldingEur: Math.round(central * months),
    novaEurTotal: nova.novaEur,
    novaPercent: nova.novaPercent,
    motorTaxMonthlyEur: motorTax.monthlyEur,
    sachbezugMonthlyGrossEur: sachbezug.monthlyGrossBenefitEur,
    sachbezugTaxMonthlyEur: sachbezug.monthlyEmployeeTaxEur,
    vorsteuerDeductionTotalEur: Math.round(vorsteuer.vorsteuerEur),
    residualEndEur: {
      low: residualLow,
      central: residualCentral,
      high: residualHigh,
    },
    residualShare36m: baseShareCentral,
    waterfall,
    traces,
    warningsDe,
    warningsSv,
    assumptionsDe,
    assumptionsSv,
  };
}

export function calculateAllForCar(
  car: CarVariant,
  profile: AustrianProfile,
  selectedFormFilter: OwnershipForm | 'all' = 'all',
  overrides: CalculationOverrides = {}
): FullCarCalculation {
  const allForms: OwnershipForm[] = [
    'privateCash',
    'privateLoan',
    'privateLease',
    'companyGmbh',
    'benefitCar',
    'salaryExchange',
  ];

  const scenarios = {} as Record<OwnershipForm, OwnershipScenarioResult>;
  for (const f of allForms) {
    scenarios[f] = calculateScenario(car, profile, f, overrides);
  }

  const availableScenarios = allForms
    .map((f) => scenarios[f])
    .filter((s) => s.available && s.wallet.central > 0);

  const bestScenario =
    [...availableScenarios].sort(
      (a, b) => a.wallet.central - b.wallet.central
    )[0] ?? scenarios.privateCash;

  const selectedScenario =
    selectedFormFilter !== 'all' && scenarios[selectedFormFilter]
      ? scenarios[selectedFormFilter]
      : bestScenario;

  const activeForm = selectedScenario.form;
  const baseCentral = selectedScenario.wallet.central;

  // Compute Tornado Sensitivity Analysis for the active ownership form
  const discount10 = calculateScenario(car, profile, activeForm, {
    ...overrides,
    discountPercent: (overrides.discountPercent ?? 0) + 10,
  });
  const residualLowScenario = calculateScenario(car, profile, activeForm, {
    ...overrides,
    residualShareOverride: Math.max(
      0.15,
      selectedScenario.residualShare36m - 0.08
    ),
  });
  const residualHighScenario = calculateScenario(car, profile, activeForm, {
    ...overrides,
    residualShareOverride: Math.min(
      0.8,
      selectedScenario.residualShare36m + 0.08
    ),
  });
  const kmPlus5000 = calculateScenario(
    car,
    { ...profile, kmPerYear: profile.kmPerYear + 5000 },
    activeForm,
    overrides
  );
  const kmMinus5000 = calculateScenario(
    car,
    { ...profile, kmPerYear: Math.max(5000, profile.kmPerYear - 5000) },
    activeForm,
    overrides
  );
  const publicChargingOnly = calculateScenario(
    car,
    { ...profile, hasHomeCharger: false },
    activeForm,
    overrides
  );

  const tornadoRaw: TornadoItem[] = [
    {
      id: 'discount-10',
      labelDe: 'Händlernachlass: −10 % auf Listenpreis',
      labelSv: 'Handlarrabatt: −10 % på listpriset',
      deltaMonthlyEur: Math.round(discount10.wallet.central - baseCentral),
      newMonthlyEur: discount10.wallet.central,
      parameterHintDe: `${formatEur(car.listPriceGross * 0.9)} statt ${formatEur(car.listPriceGross)}`,
      parameterHintSv: `${formatEur(car.listPriceGross * 0.9)} i stället för ${formatEur(car.listPriceGross)}`,
    },
    {
      id: 'residual-low',
      labelDe: `Restwert niedriger: ${Math.round((selectedScenario.residualShare36m - 0.08) * 100)} % statt ${Math.round(selectedScenario.residualShare36m * 100)} %`,
      labelSv: `Lägre restvärde: ${Math.round((selectedScenario.residualShare36m - 0.08) * 100)} % i stället för ${Math.round(selectedScenario.residualShare36m * 100)} %`,
      deltaMonthlyEur: Math.round(
        residualLowScenario.wallet.central - baseCentral
      ),
      newMonthlyEur: residualLowScenario.wallet.central,
      parameterHintDe: 'Ungünstiger Gebrauchtwagenmarkt',
      parameterHintSv: 'Svagare andrahandsmarknad',
    },
    {
      id: 'residual-high',
      labelDe: `Restwert höher: ${Math.round((selectedScenario.residualShare36m + 0.08) * 100)} % statt ${Math.round(selectedScenario.residualShare36m * 100)} %`,
      labelSv: `Högre restvärde: ${Math.round((selectedScenario.residualShare36m + 0.08) * 100)} % i stället för ${Math.round(selectedScenario.residualShare36m * 100)} %`,
      deltaMonthlyEur: Math.round(
        residualHighScenario.wallet.central - baseCentral
      ),
      newMonthlyEur: residualHighScenario.wallet.central,
      parameterHintDe: 'Stabiler Wiederverkaufswert',
      parameterHintSv: 'Starkt andrahandsvärde',
    },
    {
      id: 'km-plus',
      labelDe: `Fahrleistung +5.000 km: ${formatNum(profile.kmPerYear + 5000)} km/Jahr`,
      labelSv: `Körsträcka +5 000 km: ${formatNum(profile.kmPerYear + 5000)} km/år`,
      deltaMonthlyEur: Math.round(kmPlus5000.wallet.central - baseCentral),
      newMonthlyEur: kmPlus5000.wallet.central,
      parameterHintDe: 'Mehr Energie, Verschleiß & Wertverlust',
      parameterHintSv: 'Mer energi, slitage & värdeminskning',
    },
    {
      id: 'km-minus',
      labelDe: `Fahrleistung −5.000 km: ${formatNum(Math.max(5000, profile.kmPerYear - 5000))} km/Jahr`,
      labelSv: `Körsträcka −5 000 km: ${formatNum(Math.max(5000, profile.kmPerYear - 5000))} km/år`,
      deltaMonthlyEur: Math.round(kmMinus5000.wallet.central - baseCentral),
      newMonthlyEur: kmMinus5000.wallet.central,
      parameterHintDe: 'Weniger Energie & höherer Restwert',
      parameterHintSv: 'Lägre energikostnad & högre restvärde',
    },
  ];

  if (car.powertrain === 'bev' && profile.hasHomeCharger) {
    tornadoRaw.push({
      id: 'public-charge',
      labelDe: 'Nur öffentlich laden (54 ct/kWh statt Heimladen)',
      labelSv: 'Endast publik laddning (54 ct/kWh i stället för hemma)',
      deltaMonthlyEur: Math.round(
        publicChargingOnly.wallet.central - baseCentral
      ),
      newMonthlyEur: publicChargingOnly.wallet.central,
      parameterHintDe: 'AC/DC-Mix ohne eigene Wallbox',
      parameterHintSv: 'AC/DC-mix utan egen laddbox',
    });
  }

  const tornado = tornadoRaw
    .filter((t) => Math.abs(t.deltaMonthlyEur) > 0)
    .sort((a, b) => Math.abs(b.deltaMonthlyEur) - Math.abs(a.deltaMonthlyEur));

  // Break-even Residual (Barkauf vs. Privatleasing)
  let breakEvenResidual: FullCarCalculation['breakEvenResidual'] = undefined;
  if (scenarios.privateLease.available) {
    const leaseWallet = scenarios.privateLease.wallet.central;
    const buyWallet = scenarios.privateCash.wallet.central;
    const monthlyDiff = buyWallet - leaseWallet;
    const neededResidualDeltaEur = monthlyDiff * profile.holdingMonths;
    const breakEvenEur = Math.max(
      0,
      scenarios.privateCash.residualEndEur.central + neededResidualDeltaEur
    );
    const breakEvenShare = Math.min(
      0.95,
      Math.max(0.1, breakEvenEur / car.listPriceGross)
    );
    breakEvenResidual = {
      hasLeaseOffer: true,
      leaseMonthlyWallet: leaseWallet,
      buyMonthlyWallet: buyWallet,
      breakEvenResidualShare: breakEvenShare,
      breakEvenResidualEur: Math.round(breakEvenEur),
      estimatedResidualShare: scenarios.privateCash.residualShare36m,
      estimatedResidualLowShare:
        scenarios.privateCash.residualEndEur.low / car.listPriceGross,
      estimatedResidualHighShare:
        scenarios.privateCash.residualEndEur.high / car.listPriceGross,
    };
  }

  return {
    car,
    profile,
    scenarios,
    bestScenario,
    selectedScenario,
    tornado,
    breakEvenResidual,
  };
}
