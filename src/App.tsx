import React, { useState, useMemo, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  AustrianProfile,
  BodyType,
  CalculationOverrides,
  CarVariant,
  CompareItem,
  FullCarCalculation,
  Language,
  OwnershipForm,
  OwnershipFormFilter,
  Powertrain,
} from './types';
import { DEFAULT_AUSTRIAN_PROFILE, BUNDESLAENDER } from './data/austriaRules';
import { AUSTRIAN_CARS_CATALOG } from './data/carsCatalog';
import { calculateAllForCar, formatEur } from './engine/austrianCalculator';
import {
  BODY_LABELS,
  DRIVE_LABELS,
  getOwnershipFormLabel,
  OWNERSHIP_FORM_LABELS,
  POWERTRAIN_LABELS,
  UI_TEXT,
} from './i18n/translations';
import { SituationFields, SituationModal } from './components/SituationEditor';
import { CarDetailView } from './components/CarDetailView';
import { CompareView, TaxGuideView } from './components/CompareAndTaxViews';
import { CarVisualStage, getCarImageUrl } from './components/CarVisualStage';

type ActiveRoute = 'find' | 'detail' | 'compare' | 'tax-guide';

interface FilterState {
  maxMonthlyEur: number | null; // ?tak=
  maxListPriceEur: number | null; // ?tak-pris=
  powertrain: Powertrain | 'all'; // ?drivmedel=
  bodyTypes: BodyType[]; // ?kaross=
  minRangeKm: number; // ?rackvidd=
  form: OwnershipFormFilter; // ?form=
  searchQuery: string; // ?q=
  currentPricesOnly: boolean; // ?aktuella=1
  includeLastKnown: boolean; // ?senast-kanda=1
  includeUnknownRange: boolean; // ?okand-rackvidd=1
  viewMode: 'cards' | 'table'; // ?visa=tabell
}

const VALID_BODY_TYPES: BodyType[] = [
  'suv',
  'hatchback',
  'estate',
  'sedan',
  'coupe',
  'mpv',
  'van',
];

function parseInitialFiltersFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  const hasAnyFilterParam =
    params.has('drivmedel') ||
    params.has('kaross') ||
    params.has('rackvidd') ||
    params.has('tak') ||
    params.has('form');

  if (!hasAnyFilterParam) {
    // Default to the exact filter combination from the user's prompt URL:
    // ?tak=&drivmedel=bev&kaross=suv&kaross=hatchback&kaross=estate&rackvidd=450&form=all&aktuella=1&senast-kanda=1
    return {
      maxMonthlyEur: null,
      maxListPriceEur: null,
      powertrain: 'bev',
      bodyTypes: ['suv', 'hatchback', 'estate'],
      minRangeKm: 450,
      form: 'all',
      searchQuery: '',
      currentPricesOnly: true,
      includeLastKnown: true,
      includeUnknownRange: false,
      viewMode: params.get('visa') === 'tabell' ? 'table' : 'cards',
    };
  }

  const takRaw = params.get('tak');
  const takPrisRaw = params.get('tak-pris');
  const drivmedelRaw = params.get('drivmedel') as Powertrain | 'all' | null;
  const karossRaw = params.getAll('kaross').filter((k): k is BodyType =>
    VALID_BODY_TYPES.includes(k as BodyType)
  );
  const rackviddRaw = params.get('rackvidd');
  const formRaw = params.get('form') as OwnershipFormFilter | null;

  return {
    maxMonthlyEur: takRaw && Number(takRaw) > 0 ? Number(takRaw) : null,
    maxListPriceEur: takPrisRaw && Number(takPrisRaw) > 0 ? Number(takPrisRaw) : null,
    powertrain:
      drivmedelRaw && ['all', 'bev', 'phev', 'hev', 'petrol', 'diesel'].includes(drivmedelRaw)
        ? drivmedelRaw
        : 'bev',
    bodyTypes: karossRaw,
    minRangeKm: rackviddRaw !== null && !Number.isNaN(Number(rackviddRaw)) ? Number(rackviddRaw) : 0,
    form:
      formRaw &&
      [
        'all',
        'privateCash',
        'privateLoan',
        'privateLease',
        'companyGmbh',
        'benefitCar',
        'salaryExchange',
      ].includes(formRaw)
        ? formRaw
        : 'all',
    searchQuery: params.get('q') ?? '',
    currentPricesOnly: params.get('aktuella') !== '0',
    includeLastKnown: params.get('senast-kanda') !== '0',
    includeUnknownRange: params.get('okand-rackvidd') === '1',
    viewMode: params.get('visa') === 'tabell' ? 'table' : 'cards',
  };
}

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('autokalkuel_lang');
    return saved === 'sv' || saved === 'de' ? saved : 'de';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('autokalkuel_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [profile, setProfile] = useState<AustrianProfile>(() => {
    try {
      const saved = localStorage.getItem('autokalkuel_profile_v1');
      if (saved) {
        return { ...DEFAULT_AUSTRIAN_PROFILE, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_AUSTRIAN_PROFILE;
  });

  const [filters, setFilters] = useState<FilterState>(() => parseInitialFiltersFromUrl());
  const [route, setRoute] = useState<ActiveRoute>('find');
  const [selectedCarSlug, setSelectedCarSlug] = useState<string>(
    AUSTRIAN_CARS_CATALOG[0].slug
  );
  const [selectedDetailForm, setSelectedDetailForm] =
    useState<OwnershipForm>('privateCash');
  const [overridesByCarId, setOverridesByCarId] = useState<
    Record<string, CalculationOverrides>
  >({});
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const [compareKeys, setCompareKeys] = useState<
    Array<{ carId: string; form: OwnershipForm }>
  >([]);
  const [situationInlineOpen, setSituationInlineOpen] = useState<boolean>(false);

  const situationDialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    localStorage.setItem('autokalkuel_lang', lang);
    document.documentElement.lang = lang === 'de' ? 'de-AT' : 'sv-SE';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('autokalkuel_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('autokalkuel_profile_v1', JSON.stringify(profile));
    } catch {
      // ignore storage quota errors
    }
  }, [profile]);

  // Sync filters to URL query parameters (Bilkalkylen-compatible query schema)
  useEffect(() => {
    if (route !== 'find') return;
    const params = new URLSearchParams();
    params.set('tak', filters.maxMonthlyEur ? String(filters.maxMonthlyEur) : '');
    if (filters.maxListPriceEur) {
      params.set('tak-pris', String(filters.maxListPriceEur));
    }
    params.set('drivmedel', filters.powertrain);
    filters.bodyTypes.forEach((b) => params.append('kaross', b));
    params.set('rackvidd', String(filters.minRangeKm));
    params.set('form', filters.form);
    if (filters.currentPricesOnly) params.set('aktuella', '1');
    if (filters.includeLastKnown) params.set('senast-kanda', '1');
    if (filters.includeUnknownRange) params.set('okand-rackvidd', '1');
    if (filters.searchQuery.trim()) params.set('q', filters.searchQuery.trim());
    if (filters.viewMode === 'table') params.set('visa', 'tabell');

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [filters, route]);

  const t = UI_TEXT[lang];

  // Calculate all cars for the active Austrian profile & any user overrides
  const allCalculations = useMemo(() => {
    const map = new Map<string, FullCarCalculation>();
    for (const car of AUSTRIAN_CARS_CATALOG) {
      const ov = overridesByCarId[car.id] ?? {};
      const preferred = filters.form === 'all' ? 'all' : filters.form;
      const calc = calculateAllForCar(car, profile, preferred, ov);
      map.set(car.id, calc);
    }
    return map;
  }, [profile, overridesByCarId, filters.form]);

  // Filter cars according to active FilterState
  const filteredCalculations = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    const list: FullCarCalculation[] = [];

    for (const car of AUSTRIAN_CARS_CATALOG) {
      const calc = allCalculations.get(car.id);
      if (!calc) continue;

      // Price status filter
      if (car.priceStatus === 'lastKnown' && !filters.includeLastKnown) {
        continue;
      }
      if (
        filters.currentPricesOnly &&
        !filters.includeLastKnown &&
        car.priceStatus !== 'current'
      ) {
        continue;
      }

      // Powertrain filter
      if (filters.powertrain !== 'all' && car.powertrain !== filters.powertrain) {
        continue;
      }

      // Body type filter
      if (
        filters.bodyTypes.length > 0 &&
        !filters.bodyTypes.includes(car.bodyType)
      ) {
        continue;
      }

      // Range filter
      if (filters.minRangeKm > 0) {
        if (car.wltpRangeKm === null) {
          if (!filters.includeUnknownRange) continue;
        } else if (car.wltpRangeKm < filters.minRangeKm) {
          continue;
        }
      }

      // Max list price filter
      if (
        filters.maxListPriceEur !== null &&
        car.listPriceGross > filters.maxListPriceEur
      ) {
        continue;
      }

      // Search query filter
      if (q) {
        const hay = `${car.brand} ${car.model} ${car.version} ${car.name}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      // Scenario to evaluate against monthly ceiling
      const targetScenario =
        filters.form === 'all'
          ? calc.bestScenario
          : calc.scenarios[filters.form] || calc.bestScenario;

      if (
        filters.maxMonthlyEur !== null &&
        targetScenario.wallet.central > filters.maxMonthlyEur
      ) {
        continue;
      }

      list.push(calc);
    }

    // Sort ascending by target scenario monthly cost
    list.sort((a, b) => {
      const sa =
        filters.form === 'all' ? a.bestScenario : a.scenarios[filters.form];
      const sb =
        filters.form === 'all' ? b.bestScenario : b.scenarios[filters.form];
      return sa.wallet.central - sb.wallet.central;
    });

    return list;
  }, [allCalculations, filters]);

  // Group filtered calculations by modelId for Card View (like Bilkalkylen)
  const groupedModels = useMemo(() => {
    const groups = new Map<string, FullCarCalculation[]>();
    for (const calc of filteredCalculations) {
      const mId = calc.car.modelId;
      const arr = groups.get(mId) ?? [];
      arr.push(calc);
      groups.set(mId, arr);
    }
    return Array.from(groups.entries()).map(([modelId, variants]) => ({
      modelId,
      primary: variants[0],
      extraVariants: variants.slice(1),
    }));
  }, [filteredCalculations]);

  // Build CompareItem list
  const compareItems: CompareItem[] = useMemo(() => {
    return compareKeys
      .map(({ carId, form }) => {
        const calc = allCalculations.get(carId);
        if (!calc) return null;
        const sc = calc.scenarios[form] || calc.bestScenario;
        return {
          key: `${carId}:${form}`,
          carId,
          slug: calc.car.slug,
          carName: calc.car.name,
          brand: calc.car.brand,
          powertrain: calc.car.powertrain,
          form,
          walletMonthly: sc.wallet.central,
          walletSpan: { low: sc.wallet.low, high: sc.wallet.high },
          perKmEur: sc.perKmEur,
          listPriceGross: calc.car.listPriceGross,
          wltpRangeKm: calc.car.wltpRangeKm,
          motorTaxMonthlyEur: sc.motorTaxMonthlyEur,
          sachbezugMonthlyGrossEur: sc.sachbezugMonthlyGrossEur,
          vorsteuerDeductionTotalEur: sc.vorsteuerDeductionTotalEur,
        };
      })
      .filter((x): x is CompareItem => x !== null);
  }, [compareKeys, allCalculations]);

  const isCarCompared = (carId: string, form: OwnershipForm) =>
    compareKeys.some((k) => k.carId === carId && k.form === form);

  const toggleCompare = (car: CarVariant, form: OwnershipForm) => {
    setCompareKeys((prev) => {
      const exists = prev.some((k) => k.carId === car.id && k.form === form);
      if (exists) {
        return prev.filter((k) => !(k.carId === car.id && k.form === form));
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), { carId: car.id, form }];
      }
      return [...prev, { carId: car.id, form }];
    });
  };

  const navigateWithTransition = (updateDOM: () => void) => {
    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!docWithVT.startViewTransition) {
      updateDOM();
      requestAnimationFrame(() => {
        document.getElementById('view-main-heading')?.focus({ preventScroll: true });
      });
      return;
    }
    const transition = docWithVT.startViewTransition(() => {
      flushSync(() => {
        updateDOM();
      });
    });
    transition.finished.finally(() => {
      document.getElementById('view-main-heading')?.focus({ preventScroll: true });
    });
  };

  const openCarDetail = (slug: string, preferredForm?: OwnershipForm) => {
    const car =
      AUSTRIAN_CARS_CATALOG.find((c) => c.slug === slug) ||
      AUSTRIAN_CARS_CATALOG[0];
    const calc = allCalculations.get(car.id);
    const initialForm =
      preferredForm ||
      (filters.form !== 'all'
        ? filters.form
        : calc?.bestScenario.form || 'privateCash');
    navigateWithTransition(() => {
      setSelectedCarSlug(car.slug);
      setSelectedDetailForm(initialForm);
      setRoute('detail');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSituationModal = () => {
    if (situationDialogRef.current) {
      situationDialogRef.current.showModal();
    }
  };

  const toggleBodyFilter = (body: BodyType) => {
    setFilters((prev) => {
      const exists = prev.bodyTypes.includes(body);
      return {
        ...prev,
        bodyTypes: exists
          ? prev.bodyTypes.filter((b) => b !== body)
          : [...prev.bodyTypes, body],
      };
    });
  };

  const resetAllFilters = () => {
    setFilters({
      maxMonthlyEur: null,
      maxListPriceEur: null,
      powertrain: 'all',
      bodyTypes: [],
      minRangeKm: 0,
      form: 'all',
      searchQuery: '',
      currentPricesOnly: true,
      includeLastKnown: true,
      includeUnknownRange: true,
      viewMode: filters.viewMode,
    });
  };

  const activeDetailCar =
    AUSTRIAN_CARS_CATALOG.find((c) => c.slug === selectedCarSlug) ||
    AUSTRIAN_CARS_CATALOG[0];

  const activeDetailCalculation = useMemo(() => {
    const ov = overridesByCarId[activeDetailCar.id] ?? {};
    return calculateAllForCar(activeDetailCar, profile, selectedDetailForm, ov);
  }, [activeDetailCar, profile, overridesByCarId, selectedDetailForm]);

  const siblingVariantsOfActiveCar = useMemo(
    () =>
      AUSTRIAN_CARS_CATALOG.filter((c) => c.modelId === activeDetailCar.modelId),
    [activeDetailCar.modelId]
  );

  const bundeslandInfo = BUNDESLAENDER[profile.bundesland];

  const renderCarCard = (
    calc: FullCarCalculation,
    extraVariants: FullCarCalculation[] = [],
    isExpandedChild = false,
    isPriorityLcp = false
  ) => {
    const { car } = calc;
    const scenario =
      filters.form === 'all'
        ? calc.bestScenario
        : calc.scenarios[filters.form] || calc.bestScenario;
    const compared = isCarCompared(car.id, scenario.form);

    // Span bar geometry (0 to 100%)
    const spanSpread = Math.max(40, scenario.wallet.high - scenario.wallet.low);
    const fillLeftPct = Math.max(
      12,
      Math.min(30, ((scenario.wallet.central - scenario.wallet.low) / spanSpread) * 45)
    );
    const fillWidthPct = Math.min(75, Math.max(32, (spanSpread / Math.max(400, scenario.wallet.central)) * 100));

    const isModelExpanded = !!expandedModels[car.modelId];

    return (
      <React.Fragment key={car.id}>
        <article
          className="car-card"
          style={
            isExpandedChild
              ? {
                  borderStyle: 'dashed',
                  background: 'var(--at-bg-canvas)',
                }
              : undefined
          }
        >
          <CarVisualStage
            car={car}
            bundesland={profile.bundesland}
            isPriority={isPriorityLcp}
          />

          <div className="car-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span className="car-brand-kicker">{car.brand}</span>
                {car.priceStatus === 'lastKnown' && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.08rem 0.38rem',
                      borderRadius: '4px',
                      background: 'var(--at-amber-soft)',
                      color: 'var(--at-amber)',
                      fontWeight: 700,
                    }}
                  >
                    {lang === 'de' ? 'Zuletzt bekannt' : 'Senast känd'}
                  </span>
                )}
              </div>
              <h3 className="car-model-title">
                <a
                  href={`#kalkyl/${car.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    openCarDetail(car.slug, scenario.form);
                  }}
                >
                  {car.model} · {car.version}
                </a>
              </h3>
            </div>

            <div className="car-spec-pills">
              <span
                className={`spec-pill ${car.powertrain === 'bev' ? 'bev-badge' : ''}`}
              >
                {POWERTRAIN_LABELS[lang][car.powertrain]}
              </span>
              <span className="spec-pill">{BODY_LABELS[lang][car.bodyType]}</span>
              <span className="spec-pill">{DRIVE_LABELS[lang][car.drive]}</span>
              {car.wltpRangeKm !== null && (
                <span className="spec-pill">WLTP {car.wltpRangeKm} km</span>
              )}
              <span className="spec-pill">
                {car.peakPowerKw} kW ({car.continuousPowerKw} kW Dauerl.)
              </span>
            </div>
          </div>

          {/* Monthly Net Cost Hero Box */}
          <div className="car-price-hero">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.2rem',
              }}
            >
              <span className="price-caption">{t.costsYou}</span>
              <span className="best-form-tag">
                {getOwnershipFormLabel(lang, scenario.form, profile)}
              </span>
            </div>

            <div className="price-main-row">
              <div>
                <span className="price-monthly-figure">
                  {formatEur(scenario.wallet.central, lang)}
                </span>
                <span className="price-monthly-unit">{t.perMonth}</span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  color: 'var(--at-ink-secondary)',
                }}
              >
                {scenario.perKmEur.toFixed(2).replace('.', ',')} €/km
              </span>
            </div>

            <div className="span-bar-wrap">
              <div className="span-meta-row">
                <span>{t.spanLabel}</span>
                <span>
                  {formatEur(scenario.wallet.low, lang)} –{' '}
                  {formatEur(scenario.wallet.high, lang)} {t.perMonth}
                </span>
              </div>
              <div className="span-track">
                <div
                  className="span-fill"
                  style={{
                    left: `${fillLeftPct}%`,
                    width: `${fillWidthPct}%`,
                  }}
                />
              </div>
            </div>

            {/* Mini 4-Form Quick Switcher Strip */}
            <div className="card-mini-forms">
              {(
                [
                  { f: 'privateCash', labelDe: 'Barkauf', labelSv: 'Kontant' },
                  { f: 'privateLease', labelDe: 'Leasing', labelSv: 'Leasing' },
                  {
                    f: 'companyGmbh',
                    labelDe:
                      profile.access.soleTrader && !profile.access.ownGmbh
                        ? 'Ord./EPU'
                        : 'GmbH',
                    labelSv:
                      profile.access.soleTrader && !profile.access.ownGmbh
                        ? 'Ord./EPU'
                        : 'GmbH',
                  },
                  { f: 'benefitCar', labelDe: 'Dienstw.', labelSv: 'Tjänsteb.' },
                ] as const
              ).map(({ f, labelDe, labelSv }) => {
                const sc = calc.scenarios[f];
                const isBest = calc.bestScenario.form === f && sc.available;
                return (
                  <button
                    key={f}
                    type="button"
                    className={`mini-form-cell ${isBest ? 'is-best' : ''}`}
                    title={getOwnershipFormLabel(lang, f, profile)}
                    onClick={() => openCarDetail(car.slug, f)}
                  >
                    <span className="mini-form-name">
                      {lang === 'de' ? labelDe : labelSv}
                    </span>
                    <span className="mini-form-val">
                      {formatEur(sc.wallet.central)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Austrian Specific Tax Breakdown */}
          <div className="car-tax-breakdown">
            <div className="tax-row">
              <span className="tax-row-label">
                {lang === 'de' ? 'Listenpreis AT (inkl. 20 % USt)' : 'Listpris AT (inkl. 20 % moms)'}
              </span>
              <span className="tax-row-val">{formatEur(car.listPriceGross, lang)}</span>
            </div>
            <div className="tax-row">
              <span className="tax-row-label">NoVA (§ 6 NoVAG 1991)</span>
              <span
                className={`tax-row-val ${scenario.novaPercent === 0 ? 'zero-tax' : ''}`}
              >
                {scenario.novaPercent} % ({formatEur(scenario.novaEurTotal, lang)})
              </span>
            </div>
            <div className="tax-row">
              <span className="tax-row-label">
                {lang === 'de'
                  ? 'Motorbez. Steuer (ab 04/2025)'
                  : 'Fordonsskatt AT (fr. 04/2025)'}
              </span>
              <span className="tax-row-val">
                {formatEur(scenario.motorTaxMonthlyEur, lang)}/Mon.
              </span>
            </div>
            <div className="tax-row">
              <span className="tax-row-label">
                {scenario.form === 'companyGmbh'
                  ? profile.vatExempt
                    ? lang === 'de'
                      ? 'Vorsteuer (§ 6 UStG Heilbeh.)'
                      : 'Momsavdrag (§ 6 UStG Sjukvård)'
                    : lang === 'de'
                      ? 'Vorsteuerabzug (USt)'
                      : 'Momsavdrag (Vorsteuer)'
                  : lang === 'de'
                    ? 'Dienstwagen-Sachbezug'
                    : 'Förmånsvärde (Sachbezug)'}
              </span>
              <span
                className={`tax-row-val ${
                  scenario.form === 'companyGmbh'
                    ? scenario.vorsteuerDeductionTotalEur > 0
                      ? 'zero-tax'
                      : ''
                    : scenario.sachbezugMonthlyGrossEur === 0
                      ? 'zero-tax'
                      : ''
                }`}
              >
                {scenario.form === 'companyGmbh'
                  ? profile.vatExempt
                    ? lang === 'de'
                      ? '0 € (Brutto-AfA)'
                      : '0 € (Bruttoavdrag)'
                    : formatEur(scenario.vorsteuerDeductionTotalEur, lang)
                  : `${formatEur(scenario.sachbezugMonthlyGrossEur, lang)}/Mon.`}
              </span>
            </div>
          </div>

          {/* Card Actions */}
          <div className="car-card-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => openCarDetail(car.slug, scenario.form)}
            >
              {t.showCalculation}
            </button>
            <button
              type="button"
              className={`btn-secondary ${compared ? 'active' : ''}`}
              onClick={() => toggleCompare(car, scenario.form)}
            >
              {compared ? t.compareAdded : t.compareAdd}
            </button>
          </div>

          {/* Expandable sibling versions button */}
          {extraVariants.length > 0 && !isExpandedChild && (
            <button
              type="button"
              className="btn-secondary"
              style={{
                width: '100%',
                fontSize: '0.76rem',
                padding: '0.38rem 0.65rem',
                marginTop: '0.15rem',
                borderStyle: 'dashed',
              }}
              onClick={() =>
                setExpandedModels((prev) => ({
                  ...prev,
                  [car.modelId]: !prev[car.modelId],
                }))
              }
            >
              {isModelExpanded
                ? lang === 'de'
                  ? `▲ ${extraVariants.length} ${t.moreVersions} ausblenden`
                  : `▲ Dölj ${extraVariants.length} ${t.moreVersions}`
                : lang === 'de'
                  ? `▼ +${extraVariants.length} ${t.moreVersions} zeigen`
                  : `▼ Visa +${extraVariants.length} ${t.moreVersions}`}
            </button>
          )}
        </article>

        {isModelExpanded &&
          extraVariants.map((extCalc) => renderCarCard(extCalc, [], true))}
      </React.Fragment>
    );
  };

  return (
    <div className="app-shell">
      <div className="at-ribbon" aria-hidden="true" />
      {/* Top Header */}
      <header className="site-header">
        <div className="header-inner">
          <a
            href="#hitta-bil"
            className="brand-lockup"
            onClick={(e) => {
              e.preventDefault();
              navigateWithTransition(() => setRoute('find'));
            }}
          >
            <span className="brand-flag-mark" aria-hidden="true">
              AT
            </span>
            <div>
              <div className="brand-title">AUTOKALKÜL · AT</div>
              <span className="brand-subtitle">{t.brandSubtitle}</span>
            </div>
          </a>

          <nav className="header-nav" aria-label="Primary">
            <button
              type="button"
              className={`nav-link-btn ${route === 'find' || route === 'detail' ? 'active' : ''}`}
              onClick={() => navigateWithTransition(() => setRoute('find'))}
            >
              {t.navFindCar}
            </button>
            <button
              type="button"
              className={`nav-link-btn ${route === 'tax-guide' ? 'active' : ''}`}
              onClick={() => navigateWithTransition(() => setRoute('tax-guide'))}
            >
              {t.navTaxGuide}
            </button>
            <button
              type="button"
              className={`nav-link-btn ${route === 'compare' ? 'active' : ''}`}
              onClick={() => navigateWithTransition(() => setRoute('compare'))}
            >
              {t.navCompare} ({compareItems.length})
            </button>

            {/* Quick Situation Pill */}
            <button
              type="button"
              className="situation-pill"
              onClick={openSituationModal}
              title={t.mySituation}
            >
              <span className="situation-pill-dot" />
              <span>{t.mySituation}:</span>
              <span className="situation-pill-meta">
                {profile.kmPerYear.toLocaleString('de-AT')} km · {bundeslandInfo.capital} ·{' '}
                {Math.round(profile.taxBracket * 100)} % ESt
              </span>
            </button>

            {/* Language Switcher DE / SV */}
            <div className="lang-switch" role="group" aria-label="Language switcher">
              <button
                type="button"
                className={lang === 'de' ? 'active' : ''}
                onClick={() => setLang('de')}
              >
                DE 🇦🇹
              </button>
              <button
                type="button"
                className={lang === 'sv' ? 'active' : ''}
                onClick={() => setLang('sv')}
              >
                SV 🇸🇪
              </button>
            </div>

            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              className="theme-btn"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="main-container">
        {route === 'find' && (
          <>
            {/* Editorial Hero Section */}
            <section className="editorial-hero">
              <div className="hero-top-row">
                <div>
                  <span className="hero-kicker">{t.heroKicker}</span>
                  <h1
                    id="view-main-heading"
                    tabIndex={-1}
                    className="hero-headline"
                    style={{ outline: 'none' }}
                  >
                    {lang === 'de' ? (
                      <>
                        Auto finden nach <em>echten Monatskosten</em> in Österreich
                      </>
                    ) : (
                      <>
                        Hitta bil i Österrike efter <em>verklig månadskostnad</em>
                      </>
                    )}
                  </h1>
                  <p className="hero-lead">{t.heroLead}</p>
                </div>

                {/* View Mode Toggle: Cards vs Table */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--at-ink-muted)',
                    }}
                  >
                    {t.viewAs}
                  </span>
                  <div className="view-toggle-group">
                    <button
                      type="button"
                      className={`view-toggle-btn ${filters.viewMode === 'cards' ? 'active' : ''}`}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, viewMode: 'cards' }))
                      }
                    >
                      {t.viewCards}
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn ${filters.viewMode === 'table' ? 'active' : ''}`}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, viewMode: 'table' }))
                      }
                    >
                      {t.viewTable}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3-Pillar Austrian Tax Advantage Ribbon */}
              <div className="hero-highlights-strip">
                <div className="hero-stat-pill">
                  <span className="hero-stat-icon hero-stat-icon--spruce">0%</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {lang === 'de'
                        ? '0 % Sachbezug & 0 % NoVA für E-Autos'
                        : '0 % förmånsvärde (Sachbezug) & 0 % NoVA'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                      {lang === 'de'
                        ? 'Kein Lohnsteuer-Zuschlag beim Elektro-Dienstwagen (§ 4 SB-VO)'
                        : 'Ingen förmånsskatt på lönen för el-tjänstebil i Österrike'}
                    </div>
                  </div>
                </div>

                <div className="hero-stat-pill">
                  <span className="hero-stat-icon hero-stat-icon--vermilion">kW</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {lang === 'de'
                        ? 'Neue E-Auto-Steuer ab 04/2025 eingerechnet'
                        : 'Nya elbilsskatten (fr.o.m. 04/2025) inräknad'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                      {lang === 'de'
                        ? '30-Min.-Nenndauerleistung (−45 kW) & Eigengewicht (−900 kg)'
                        : 'Baseras på 30-min kontinuerlig effekt (−45 kW) & vikt (−900 kg)'}
                    </div>
                  </div>
                </div>

                <div className="hero-stat-pill">
                  <span className="hero-stat-icon hero-stat-icon--danube">USt</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {lang === 'de'
                        ? '40.000 € Luxustangente & Vorsteuerabzug'
                        : '40 000 € Luxustangente & momsavdrag'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                      {lang === 'de'
                        ? 'Bis zu 6.667 € USt-Abzug & 23 % KöSt-Schild in der GmbH'
                        : 'Upp till 6 667 € momsavdrag & 23 % bolagsskatt i eget GmbH'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Collapsible Inline Situation Accordion */}
            <section className="situation-banner" aria-label={t.mySituation}>
              <div
                className="situation-banner-header"
                onClick={() => setSituationInlineOpen((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSituationInlineOpen((prev) => !prev);
                  }
                }}
              >
                <div className="situation-summary-strip">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                    }}
                  >
                    ⚙️ {t.mySituation}
                  </span>
                  <span className="summary-chip">
                    <strong>{profile.kmPerYear.toLocaleString('de-AT')} km/Jahr</strong>
                    {profile.businessKmPerYear > 0 &&
                      ` (${profile.businessKmPerYear.toLocaleString('de-AT')} km dienstlich)`}
                  </span>
                  <span className="summary-chip">
                    <strong>
                      {lang === 'de' ? bundeslandInfo.nameDe : bundeslandInfo.nameSv}
                    </strong>{' '}
                    ({(bundeslandInfo.homeElectricityEurKwh * 100).toFixed(1).replace('.', ',')}{' '}
                    ct/kWh)
                  </span>
                  <span className="summary-chip">
                    Grenzsteuer: <strong>{Math.round(profile.taxBracket * 100)} %</strong>
                  </span>
                  <span className="summary-chip">
                    Haltedauer: <strong>{profile.holdingMonths / 12} {t.yearsUnit}</strong>
                  </span>
                  <span className="summary-chip">
                    {profile.hasHomeCharger ? '🔌 Wallbox / Heimladen' : '⚡ Öffentlich laden'}
                  </span>
                  {profile.access.soleTrader && (
                    <span className="summary-chip">
                      {profile.vatExempt
                        ? lang === 'de'
                          ? '🩺 Ordination / EPU (USt-befreit)'
                          : '🩺 Ordination / EPU (Momsbefriad)'
                        : '🧑‍⚕️ Ordination / EPU (ESt)'}
                    </span>
                  )}
                  {profile.access.ownGmbh && (
                    <span className="summary-chip">
                      {profile.vatExempt
                        ? lang === 'de'
                          ? '🏢 GmbH (USt-befreit)'
                          : '🏢 GmbH (Momsbefriat)'
                        : '🏢 Eigene GmbH (AT)'}
                    </span>
                  )}
                  {profile.access.employerBenefitCar && (
                    <span className="summary-chip">💼 Dienstwagen (0 % BEV)</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.32rem 0.65rem', fontSize: '0.76rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openSituationModal();
                    }}
                  >
                    {lang === 'de' ? 'Als Dialog öffnen' : 'Öppna som dialog'}
                  </button>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--at-vermilion)',
                    }}
                  >
                    {situationInlineOpen
                      ? lang === 'de'
                        ? '▲ Einklappen'
                        : '▲ Fäll ihop'
                      : lang === 'de'
                        ? '▼ Anpassen'
                        : '▼ Ändra'}
                  </span>
                </div>
              </div>

              {situationInlineOpen && (
                <div className="situation-body">
                  <SituationFields
                    profile={profile}
                    lang={lang}
                    onChange={setProfile}
                  />
                </div>
              )}
            </section>

            {/* Filter Deck */}
            <section className="filter-deck" aria-label="Filter">
              <div className="filter-row-grid">
                {/* 1. Max Monthly Cost (?tak=) */}
                <div>
                  <label className="field-label" htmlFor="filter-tak">
                    {t.filterMaxMonthly}
                  </label>
                  <select
                    id="filter-tak"
                    className="at-select"
                    value={filters.maxMonthlyEur ?? ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        maxMonthlyEur: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">{t.filterNoLimit}</option>
                    <option value="400">400 €/Monat</option>
                    <option value="450">450 €/Monat</option>
                    <option value="500">500 €/Monat</option>
                    <option value="550">550 €/Monat</option>
                    <option value="600">600 €/Monat</option>
                    <option value="650">650 €/Monat</option>
                    <option value="700">700 €/Monat</option>
                    <option value="800">800 €/Monat</option>
                    <option value="900">900 €/Monat</option>
                    <option value="1000">1.000 €/Monat</option>
                    <option value="1250">1.250 €/Monat</option>
                  </select>
                </div>

                {/* 2. Max List Price (?tak-pris=) */}
                <div>
                  <label className="field-label" htmlFor="filter-tak-pris">
                    {t.filterMaxPrice}
                  </label>
                  <select
                    id="filter-tak-pris"
                    className="at-select"
                    value={filters.maxListPriceEur ?? ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        maxListPriceEur: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">{t.filterNoLimit}</option>
                    <option value="35000">35.000 €</option>
                    <option value="40000">40.000 € (AT Luxustangente)</option>
                    <option value="45000">45.000 €</option>
                    <option value="50000">50.000 €</option>
                    <option value="60000">60.000 €</option>
                    <option value="70000">70.000 €</option>
                    <option value="80000">80.000 € (AT Vorsteuer-Cap)</option>
                    <option value="100000">100.000 €</option>
                  </select>
                </div>

                {/* 3. Powertrain (?drivmedel=) */}
                <div>
                  <label className="field-label" htmlFor="filter-drivmedel">
                    {t.filterPowertrain}
                  </label>
                  <select
                    id="filter-drivmedel"
                    className="at-select"
                    value={filters.powertrain}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        powertrain: e.target.value as Powertrain | 'all',
                      }))
                    }
                  >
                    {(['all', 'bev', 'phev', 'hev', 'petrol', 'diesel'] as const).map(
                      (pt) => (
                        <option key={pt} value={pt}>
                          {POWERTRAIN_LABELS[lang][pt]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* 4. Min WLTP Range (?rackvidd=) */}
                <div>
                  <label className="field-label" htmlFor="filter-rackvidd">
                    {t.filterMinRange}
                  </label>
                  <select
                    id="filter-rackvidd"
                    className="at-select"
                    value={filters.minRangeKm}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        minRangeKm: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={0}>{t.filterNoLimit}</option>
                    <option value={300}>300 km</option>
                    <option value={350}>350 km</option>
                    <option value={400}>400 km</option>
                    <option value={450}>450 km</option>
                    <option value={500}>500 km</option>
                    <option value={550}>550 km</option>
                    <option value={600}>600 km</option>
                  </select>
                </div>

                {/* 5. Ownership form (?form=) */}
                <div>
                  <label className="field-label" htmlFor="filter-form">
                    {t.filterForm}
                  </label>
                  <select
                    id="filter-form"
                    className="at-select"
                    value={filters.form}
                    onChange={(e) => {
                      const val = e.target.value as OwnershipFormFilter;
                      // Automatically enable access in profile if user explicitly filters by a corporate/employer form
                      if (
                        val === 'companyGmbh' &&
                        !profile.access.ownGmbh &&
                        !profile.access.soleTrader
                      ) {
                        setProfile((p) => ({
                          ...p,
                          access: { ...p.access, soleTrader: true },
                        }));
                      } else if (
                        val === 'benefitCar' &&
                        !profile.access.employerBenefitCar
                      ) {
                        setProfile((p) => ({
                          ...p,
                          access: { ...p.access, employerBenefitCar: true },
                        }));
                      } else if (
                        val === 'salaryExchange' &&
                        !profile.access.employerSalaryExchange
                      ) {
                        setProfile((p) => ({
                          ...p,
                          access: { ...p.access, employerSalaryExchange: true },
                        }));
                      }
                      setFilters((prev) => ({ ...prev, form: val }));
                    }}
                  >
                    {(
                      [
                        'all',
                        'privateCash',
                        'privateLoan',
                        'privateLease',
                        'companyGmbh',
                        'benefitCar',
                        'salaryExchange',
                      ] as const
                    ).map((f) => (
                      <option key={f} value={f}>
                        {getOwnershipFormLabel(lang, f, profile)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Search Query (?q=) */}
                <div>
                  <label className="field-label" htmlFor="filter-q">
                    {t.filterSearchQuery}
                  </label>
                  <input
                    id="filter-q"
                    type="search"
                    className="at-input"
                    placeholder="z. B. Škoda, ID.7, IONIQ, Model Y …"
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Body Type Checkboxes (?kaross=suv&kaross=hatchback&kaross=estate) */}
              <div style={{ marginTop: '0.85rem' }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    gap: '0.5rem',
                    marginBottom: '0.45rem',
                  }}
                >
                  <span className="field-label" style={{ marginBottom: 0 }}>
                    {t.filterBody}:
                  </span>
                  <span className="field-hint">{t.filterBodyHelp}</span>
                </div>

                <div className="body-chip-group">
                  {(['suv', 'hatchback', 'estate', 'sedan'] as BodyType[]).map(
                    (body) => {
                      const checked = filters.bodyTypes.includes(body);
                      return (
                        <label
                          key={body}
                          className={`choice-card ${checked ? 'is-active' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBodyFilter(body)}
                          />
                          <span className="choice-card-label">
                            {BODY_LABELS[lang][body]}
                          </span>
                        </label>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Secondary Filter Checkboxes & Reset */}
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--at-border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <label
                    className={`choice-card ${filters.currentPricesOnly ? 'is-active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.currentPricesOnly}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          currentPricesOnly: e.target.checked,
                        }))
                      }
                    />
                    <span className="choice-card-label" style={{ fontSize: '0.76rem' }}>
                      {t.filterCurrentOnly}
                    </span>
                  </label>

                  <label
                    className={`choice-card ${filters.includeLastKnown ? 'is-active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.includeLastKnown}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          includeLastKnown: e.target.checked,
                        }))
                      }
                    />
                    <span className="choice-card-label" style={{ fontSize: '0.76rem' }}>
                      {t.filterIncludeStale}
                    </span>
                  </label>

                  <label
                    className={`choice-card ${filters.includeUnknownRange ? 'is-active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.includeUnknownRange}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          includeUnknownRange: e.target.checked,
                        }))
                      }
                    />
                    <span className="choice-card-label" style={{ fontSize: '0.76rem' }}>
                      {t.filterIncludeUnknownRange}
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                  onClick={resetAllFilters}
                >
                  {t.resetFilters}
                </button>
              </div>
            </section>

            {/* Results Summary Bar */}
            <div className="results-bar">
              <div className="results-count">
                {lang === 'de' ? (
                  <>
                    <strong>{groupedModels.length} Modelle</strong> (
                    {filteredCalculations.length} Versionen) entsprechen deinen Filtern ·
                    sortiert nach niedrigsten echten Monatskosten in Österreich
                  </>
                ) : (
                  <>
                    <strong>{groupedModels.length} bilmodeller</strong> (
                    {filteredCalculations.length} versioner) matchar dina filter ·
                    sorterade efter lägst verklig månadskostnad i Österrike
                  </>
                )}
              </div>
            </div>

            {/* Empty State */}
            {filteredCalculations.length === 0 ? (
              <div
                style={{
                  background: 'var(--at-bg-elevated)',
                  border: '1px solid var(--at-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2.5rem',
                  textAlign: 'center',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    margin: '0 0 0.5rem',
                  }}
                >
                  {lang === 'de'
                    ? 'Keine Fahrzeuge entsprechen genau diesen Filtern'
                    : 'Inga bilar matchar exakt dessa filter'}
                </h2>
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--at-ink-secondary)',
                    marginBottom: '1rem',
                  }}
                >
                  {lang === 'de'
                    ? 'Versuche das Monatsbudget zu erhöhen, die Mindestreichweite zu senken oder alle Filter zurückzusetzen.'
                    : 'Prova att höja maxbeloppet per månad, sänka räckviddskravet eller rensa filtren.'}
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={resetAllFilters}
                >
                  {t.resetFilters}
                </button>
              </div>
            ) : filters.viewMode === 'cards' ? (
              /* CARD GRID VIEW */
              <div className="car-grid">
                {groupedModels.map(({ primary, extraVariants }, idx) =>
                  renderCarCard(primary, extraVariants, false, idx < 2)
                )}
              </div>
            ) : (
              /* RESPONSIVE TABLE VIEW (modern-web-guidance: responsive-table) */
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="car-table-caption"
                className="table-wrapper"
              >
                <table
                  className="at-data-table"
                  style={
                    {
                      '--label-2':
                        lang === 'de' ? '"Kostet dich (€/Mon.)"' : '"Kostar dig (€/mån)"',
                      '--label-3':
                        lang === 'de' ? '"Erwerbsform"' : '"Innehavsform"',
                      '--label-4':
                        lang === 'de' ? '"Listenpreis AT"' : '"Listpris AT"',
                      '--label-5': '"WLTP / CO₂"',
                      '--label-6':
                        lang === 'de'
                          ? '"Steuern AT (NoVA / VersSt)"'
                          : '"Skatt AT (NoVA / Fordon)"',
                      '--label-7': lang === 'de' ? '"Aktion"' : '"Åtgärd"',
                    } as React.CSSProperties
                  }
                >
                  <caption id="car-table-caption" className="sr-only">
                    {lang === 'de'
                      ? 'Vergleichstabelle der Autos nach monatlichen Vollkosten in Österreich'
                      : 'Jämförelsetabell över bilar efter verklig månadskostnad i Österrike'}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        {lang === 'de' ? 'Modell & Version' : 'Modell & version'}
                      </th>
                      <th scope="col">
                        {lang === 'de' ? 'Kostet dich (€/Mon.)' : 'Kostar dig (€/mån)'}
                      </th>
                      <th scope="col">
                        {lang === 'de' ? 'Erwerbsform' : 'Innehavsform'}
                      </th>
                      <th scope="col">
                        {lang === 'de' ? 'Listenpreis AT' : 'Listpris AT'}
                      </th>
                      <th scope="col">WLTP / CO₂</th>
                      <th scope="col">
                        {lang === 'de'
                          ? 'NoVA & Motorbez. Steuer'
                          : 'NoVA & Fordonsskatt AT'}
                      </th>
                      <th scope="col">
                        {lang === 'de' ? 'Kalkulation' : 'Kalkyl'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalculations.map((calc) => {
                      const { car } = calc;
                      const sc =
                        filters.form === 'all'
                          ? calc.bestScenario
                          : calc.scenarios[filters.form] || calc.bestScenario;
                      const compared = isCarCompared(car.id, sc.form);
                      return (
                        <tr key={car.id}>
                          <th scope="row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <img
                                src={getCarImageUrl(car.modelId)}
                                alt={car.name}
                                className="table-car-thumb"
                                width={68}
                                height={44}
                                loading="lazy"
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--at-ink-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  {car.brand} · {BODY_LABELS[lang][car.bodyType]}
                                </div>
                                <a
                                  href={`#kalkyl/${car.slug}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openCarDetail(car.slug, sc.form);
                                  }}
                                  style={{
                                    color: 'var(--at-ink)',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  {car.model} {car.version}
                                </a>
                              </div>
                            </div>
                          </th>
                          <td>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.98rem',
                              }}
                            >
                              {formatEur(sc.wallet.central, lang)} {t.perMonth}
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                color: 'var(--at-ink-muted)',
                              }}
                            >
                              {formatEur(sc.wallet.low, lang)}–
                              {formatEur(sc.wallet.high, lang)} ·{' '}
                              {sc.perKmEur.toFixed(2).replace('.', ',')} €/km
                            </div>
                          </td>
                          <td>
                            <span className="best-form-tag">
                              {getOwnershipFormLabel(lang, sc.form, profile)}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {formatEur(car.listPriceGross, lang)}
                          </td>
                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                              {car.wltpRangeKm ? `${car.wltpRangeKm} km WLTP` : '—'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--at-ink-muted)' }}>
                              {car.co2GKm} g/km · {car.peakPowerKw} kW
                            </div>
                          </td>
                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                              NoVA: {sc.novaPercent} % ({formatEur(sc.novaEurTotal, lang)})
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--at-ink-secondary)',
                              }}
                            >
                              VersSt: {formatEur(sc.motorTaxMonthlyEur, lang)}/Mon.
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem' }}
                                onClick={() => openCarDetail(car.slug, sc.form)}
                              >
                                {t.showCalculation}
                              </button>
                              <button
                                type="button"
                                className={`btn-secondary ${compared ? 'active' : ''}`}
                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.76rem' }}
                                onClick={() => toggleCompare(car, sc.form)}
                              >
                                {compared ? '✓' : '+'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {route === 'detail' && (
          <CarDetailView
            calculation={activeDetailCalculation}
            lang={lang}
            selectedForm={selectedDetailForm}
            onSelectForm={setSelectedDetailForm}
            overrides={overridesByCarId[activeDetailCar.id] ?? {}}
            onChangeOverrides={(nextOv) =>
              setOverridesByCarId((prev) => ({
                ...prev,
                [activeDetailCar.id]: nextOv,
              }))
            }
            profile={profile}
            onChangeProfile={setProfile}
            onBack={() => navigateWithTransition(() => setRoute('find'))}
            isCompared={isCarCompared(activeDetailCar.id, selectedDetailForm)}
            onToggleCompare={toggleCompare}
            otherVariantsOfModel={siblingVariantsOfActiveCar}
            onSelectVariant={(slug) => openCarDetail(slug, selectedDetailForm)}
          />
        )}

        {route === 'compare' && (
          <CompareView
            items={compareItems}
            lang={lang}
            onRemove={(key) =>
              setCompareKeys((prev) =>
                prev.filter((k) => `${k.carId}:${k.form}` !== key)
              )
            }
            onClear={() => setCompareKeys([])}
            onOpenCar={(slug, form) => openCarDetail(slug, form)}
            onBack={() => navigateWithTransition(() => setRoute('find'))}
          />
        )}

        {route === 'tax-guide' && (
          <TaxGuideView lang={lang} onBack={() => setRoute('find')} />
        )}
      </main>

      {/* Floating Compare Dock */}
      {compareItems.length > 0 && route !== 'compare' && (
        <aside className="compare-dock" aria-label="Comparison tray">
          <div className="compare-dock-inner">
            <div className="compare-chips">
              {compareItems.map((item) => (
                <span key={item.key} className="compare-chip">
                  <strong>{item.carName}</strong>
                  <span style={{ opacity: 0.8 }}>
                    ({formatEur(item.walletMonthly, lang)}/Mon.)
                  </span>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() =>
                      setCompareKeys((prev) =>
                        prev.filter((k) => `${k.carId}:${k.form}` !== item.key)
                      )
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0.42rem 0.9rem', fontSize: '0.82rem' }}
                onClick={() => setRoute('compare')}
              >
                {lang === 'de'
                  ? `Jetzt vergleichen (${compareItems.length})`
                  : `Jämför nu (${compareItems.length})`}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Light-dismissible Situation Modal (<dialog closedby="any">) */}
      <SituationModal
        dialogRef={situationDialogRef}
        profile={profile}
        lang={lang}
        onChange={setProfile}
      />
    </div>
  );
};
