import React, { useState, useEffect } from 'react';
import {
  AustrianProfile,
  CalculationOverrides,
  CarVariant,
  FullCarCalculation,
  Language,
  OwnershipForm,
} from '../types';
import {
  BODY_LABELS,
  DRIVE_LABELS,
  getOwnershipFormLabel,
  OWNERSHIP_FORM_LABELS,
  POWERTRAIN_LABELS,
  UI_TEXT,
} from '../i18n/translations';
import { formatEur } from '../engine/austrianCalculator';
import { CarVisualStage, ZulassungsscheinCard } from './CarVisualStage';

interface CarDetailViewProps {
  calculation: FullCarCalculation;
  lang: Language;
  selectedForm: OwnershipForm;
  onSelectForm: (form: OwnershipForm) => void;
  overrides: CalculationOverrides;
  onChangeOverrides: (next: CalculationOverrides) => void;
  profile: AustrianProfile;
  onChangeProfile: (next: AustrianProfile) => void;
  onBack: () => void;
  isCompared: boolean;
  onToggleCompare: (car: CarVariant, form: OwnershipForm) => void;
  otherVariantsOfModel: CarVariant[];
  onSelectVariant: (slug: string) => void;
}

const ALL_FORMS: OwnershipForm[] = [
  'privateCash',
  'privateLoan',
  'privateLease',
  'companyGmbh',
  'benefitCar',
  'salaryExchange',
];

export const CarDetailView: React.FC<CarDetailViewProps> = ({
  calculation,
  lang,
  selectedForm,
  onSelectForm,
  overrides,
  onChangeOverrides,
  profile,
  onChangeProfile,
  onBack,
  isCompared,
  onToggleCompare,
  otherVariantsOfModel,
  onSelectVariant,
}) => {
  const t = UI_TEXT[lang];
  const { car, scenarios, tornado, breakEvenResidual } = calculation;
  const activeScenario = scenarios[selectedForm] || calculation.selectedScenario;

  const [activeTraceId, setActiveTraceId] = useState<string>('wf.total');
  const [traceBreadcrumb, setTraceBreadcrumb] = useState<string[]>(['wf.total']);

  useEffect(() => {
    setActiveTraceId('wf.total');
    setTraceBreadcrumb(['wf.total']);
  }, [car.id, selectedForm]);

  const selectTraceNode = (traceId: string, fromChild = false) => {
    if (!activeScenario.traces[traceId]) return;
    setActiveTraceId(traceId);
    if (fromChild) {
      setTraceBreadcrumb((prev) =>
        prev.includes(traceId) ? prev.slice(0, prev.indexOf(traceId) + 1) : [...prev, traceId]
      );
    } else {
      setTraceBreadcrumb(['wf.total', ...(traceId === 'wf.total' ? [] : [traceId])]);
    }
  };

  const activeTrace =
    activeScenario.traces[activeTraceId] || activeScenario.traces['wf.total'];

  const maxWaterfallAbs = Math.max(
    ...activeScenario.waterfall.map((w) => Math.abs(w.monthlyEur)),
    300
  );

  const maxTornadoAbs = Math.max(
    ...tornado.map((item) => Math.abs(item.deltaMonthlyEur)),
    50
  );

  const handleEnableAccessForForm = (
    form: OwnershipForm,
    mode?: 'soleTraderVatExempt' | 'gmbh'
  ) => {
    const nextAccess = { ...profile.access };
    let nextVatExempt = profile.vatExempt;
    if (form === 'companyGmbh') {
      if (mode === 'soleTraderVatExempt') {
        nextAccess.soleTrader = true;
        nextAccess.ownGmbh = false;
        nextVatExempt = true;
      } else {
        nextAccess.ownGmbh = true;
        nextAccess.soleTrader = false;
      }
    }
    if (form === 'benefitCar') nextAccess.employerBenefitCar = true;
    if (form === 'salaryExchange') nextAccess.employerSalaryExchange = true;
    onChangeProfile({
      ...profile,
      vatExempt: nextVatExempt,
      access: nextAccess,
    });
    onSelectForm(form);
  };

  const toggleEquipment = (eqId: string) => {
    const current = overrides.selectedEquipmentIds ?? [];
    const next = current.includes(eqId)
      ? current.filter((id) => id !== eqId)
      : [...current, eqId];
    onChangeOverrides({
      ...overrides,
      selectedEquipmentIds: next,
    });
  };

  const statusLabel = (status: 'legislated' | 'market' | 'estimated' | 'user') => {
    if (lang === 'de') {
      switch (status) {
        case 'legislated':
          return 'Gesetzlich fixiert (AT)';
        case 'market':
          return 'Österreichische Marktdaten';
        case 'estimated':
          return 'Modellschätzung (mit Spanne)';
        case 'user':
          return 'Deine Eingabe';
      }
    } else {
      switch (status) {
        case 'legislated':
          return 'Lagstadgad (Österrike)';
        case 'market':
          return 'Österrikiska marknadsdata';
        case 'estimated':
          return 'Modellerad (med spann)';
        case 'user':
          return 'Ditt val';
      }
    }
  };

  return (
    <div className="detail-view">
      {/* Top bar: back button, variant switcher, compare button */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={onBack}>
            {t.backToSearch}
          </button>

          {otherVariantsOfModel.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--at-ink-muted)', fontWeight: 600 }}>
                {lang === 'de' ? 'Version wechseln:' : 'Byt version:'}
              </span>
              <select
                className="at-select"
                style={{ width: 'auto', padding: '0.38rem 0.65rem', fontSize: '0.82rem' }}
                value={car.slug}
                onChange={(e) => onSelectVariant(e.target.value)}
              >
                {otherVariantsOfModel.map((v) => (
                  <option key={v.id} value={v.slug}>
                    {v.version} ({formatEur(v.listPriceGross, lang)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`btn-secondary ${isCompared ? 'active' : ''}`}
          onClick={() => onToggleCompare(car, selectedForm)}
        >
          {isCompared ? t.compareAdded : t.compareAdd}
        </button>
      </div>

      {/* Main Hero & Austrian Tax Summary */}
      <div className="detail-hero">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="car-brand-kicker">{car.brand}</span>
              <span className={`spec-pill ${car.powertrain === 'bev' ? 'bev-badge' : ''}`}>
                {POWERTRAIN_LABELS[lang][car.powertrain]}
              </span>
              <span className="spec-pill">{BODY_LABELS[lang][car.bodyType]}</span>
              <span className="spec-pill">{DRIVE_LABELS[lang][car.drive]}</span>
              {car.wltpRangeKm && (
                <span className="spec-pill">WLTP {car.wltpRangeKm} km</span>
              )}
              <span className="spec-pill">
                {car.peakPowerKw} kW ({Math.round(car.peakPowerKw * 1.36)} PS) · Dauerleistung{' '}
                {car.continuousPowerKw} kW
              </span>
              <span className="spec-pill">{car.kerbMassKg} kg</span>
            </div>

            <h1
              id="view-main-heading"
              tabIndex={-1}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.65rem, 2.8vw, 2.35rem)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                margin: '0.45rem 0 0.25rem',
                outline: 'none',
              }}
            >
              {car.name}
            </h1>

            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--at-ink-secondary)' }}>
              {lang === 'de'
                ? `Österreichischer Listenpreis inkl. NoVA & 20 % USt: ${formatEur(car.listPriceGross, lang)} · Preisstand ${car.priceValidFrom}`
                : `Österrikiskt listpris inkl. NoVA & 20 % moms: ${formatEur(car.listPriceGross, lang)} · Prisdatum ${car.priceValidFrom}`}
              {car.priceStatus === 'lastKnown' && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '4px',
                    background: 'var(--at-amber-soft)',
                    color: 'var(--at-amber)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                >
                  {lang === 'de' ? 'Zuletzt bekannter Listenpreis' : 'Senast kända listpris'}
                </span>
              )}
            </p>
          </div>

          {/* Big Monthly Headline Box + Car Visual Stage */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.9rem',
              alignItems: 'stretch',
            }}
          >
            <div style={{ width: 'clamp(300px, 38vw, 420px)', flexGrow: 0 }}>
              <CarVisualStage car={car} bundesland={profile.bundesland} isPriority />
            </div>
            <div
              style={{
                background: 'var(--at-bg-inset)',
                border: '1px solid var(--at-border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '0.95rem 1.25rem',
                minWidth: '265px',
                textAlign: 'right',
              }}
            >
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--at-ink-muted)',
              }}
            >
              {getOwnershipFormLabel(lang, selectedForm, profile)} · {t.costsYou}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2.2rem',
                fontWeight: 700,
                color: 'var(--at-ink)',
                lineHeight: 1.1,
                margin: '0.2rem 0',
              }}
            >
              {formatEur(activeScenario.wallet.central, lang)}
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--at-ink-muted)',
                  marginLeft: '0.3rem',
                }}
              >
                {t.perMonth}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                color: 'var(--at-ink-secondary)',
              }}
            >
              {t.spanLabel}: {formatEur(activeScenario.wallet.low, lang)} –{' '}
              {formatEur(activeScenario.wallet.high, lang)} {t.perMonth}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.76rem',
                color: 'var(--at-ink-muted)',
                marginTop: '0.2rem',
              }}
            >
              {activeScenario.perKmEur.toFixed(2).replace('.', ',')} €/km ·{' '}
              {formatEur(activeScenario.totalOverHoldingEur, lang)}{' '}
              {lang === 'de'
                ? `gesamt über ${profile.holdingMonths} Mon.`
                : `totalt över ${profile.holdingMonths} mån`}
            </div>
            </div>
          </div>
        </div>

        {/* Ownership Form Switcher Tabs */}
        <div style={{ marginTop: '1.1rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--at-ink-muted)',
              marginBottom: '0.45rem',
            }}
          >
            {lang === 'de'
              ? 'Alle 6 österreichischen Erwerbsformen im Direktvergleich:'
              : 'Alla 6 österrikiska innehavsformer i direkt jämförelse:'}
          </div>
          <div className="form-tabs-bar">
            {ALL_FORMS.map((form) => {
              const sc = scenarios[form];
              const isSelected = selectedForm === form;
              const isBest = calculation.bestScenario.form === form && sc.available;
              return (
                <button
                  key={form}
                  type="button"
                  className={`form-tab-btn ${isSelected ? 'active' : ''}`}
                  style={{ opacity: sc.available ? 1 : 0.65 }}
                  onClick={() => onSelectForm(form)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{getOwnershipFormLabel(lang, form, profile)}</span>
                    {isBest && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '0.08rem 0.35rem',
                          borderRadius: '4px',
                          background: isSelected ? 'rgba(255,255,255,0.22)' : 'var(--at-spruce-soft)',
                          color: isSelected ? '#fff' : 'var(--at-spruce)',
                          fontWeight: 700,
                        }}
                      >
                        {lang === 'de' ? 'Günstigste' : 'Billigast'}
                      </span>
                    )}
                  </span>
                  <span className="tab-price">
                    {formatEur(sc.wallet.central, lang)} {t.perMonth}{' '}
                    {!sc.available && (lang === 'de' ? '(inaktiv)' : '(ej aktiv)')}
                  </span>
                </button>
              );
            })}
          </div>

          {!activeScenario.available && (
            <div
              style={{
                marginTop: '0.6rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--at-amber-soft)',
                border: '1px solid var(--at-amber)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                fontSize: '0.82rem',
              }}
            >
              <span>
                <strong>
                  {lang === 'de' ? 'Hinweis zu deiner Situation:' : 'Notis för din situation:'}
                </strong>{' '}
                {lang === 'de'
                  ? activeScenario.unavailableReasonDe
                  : activeScenario.unavailableReasonSv}
              </span>
              {selectedForm === 'companyGmbh' ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() =>
                      handleEnableAccessForForm('companyGmbh', 'soleTraderVatExempt')
                    }
                  >
                    {lang === 'de'
                      ? '🩺 Als Ordination / EPU (USt-befreit) aktivieren'
                      : '🩺 Aktivera som Ordination / EPU (Sjukvård, momsbefriad)'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => handleEnableAccessForForm('companyGmbh', 'gmbh')}
                  >
                    {lang === 'de' ? 'Als GmbH aktivieren' : 'Aktivera som GmbH'}
                  </button>
                </div>
              ) : (
                (selectedForm === 'benefitCar' ||
                  selectedForm === 'salaryExchange') && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => handleEnableAccessForForm(selectedForm)}
                  >
                    {lang === 'de'
                      ? 'In „Meine Situation“ aktivieren'
                      : 'Aktivera i ”Min situation”'}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* 4 Austrian Fiscal Key Pillars Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--at-border)',
          }}
        >
          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'var(--at-bg-inset)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
            onClick={() => selectTraceNode('tax.nova')}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-muted)', fontWeight: 700 }}>
              1. NoVA (§ 6 NoVAG 1991)
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.98rem',
                fontWeight: 700,
                color: activeScenario.novaPercent === 0 ? 'var(--at-spruce)' : 'var(--at-ink)',
                marginTop: '0.15rem',
              }}
            >
              {activeScenario.novaPercent} % ({formatEur(activeScenario.novaEurTotal, lang)})
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-secondary)' }}>
              {car.co2GKm === 0
                ? lang === 'de'
                  ? '0 g/km CO₂ → NoVA-befreit'
                  : '0 g/km CO₂ → 0 kr/€ i NoVA'
                : `${car.co2GKm} g/km WLTP`}
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'var(--at-bg-inset)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
            onClick={() => selectTraceNode('wf.motorTax')}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-muted)', fontWeight: 700 }}>
              2. Motorbezogene Steuer (AT 2025+)
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.98rem',
                fontWeight: 700,
                marginTop: '0.15rem',
              }}
            >
              {formatEur(activeScenario.motorTaxMonthlyEur, lang)} {t.perMonth}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-secondary)' }}>
              {car.powertrain === 'bev'
                ? `${car.continuousPowerKw} kW Dauerleistung · ${car.kerbMassKg} kg`
                : `${car.peakPowerKw} kW · ${car.co2GKm} g/km`}
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'var(--at-bg-inset)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-muted)', fontWeight: 700 }}>
              3. Dienstwagen-Sachbezug (AT)
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.98rem',
                fontWeight: 700,
                color:
                  activeScenario.sachbezugMonthlyGrossEur === 0
                    ? 'var(--at-spruce)'
                    : 'var(--at-ink)',
                marginTop: '0.15rem',
              }}
            >
              {formatEur(activeScenario.sachbezugMonthlyGrossEur, lang)}{' '}
              {lang === 'de' ? 'Brutto/Mon.' : 'brutto/mån'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-secondary)' }}>
              {car.co2GKm === 0
                ? lang === 'de'
                  ? '0 % Sachbezug → 0 € Lohnsteuer'
                  : '0 % förmånsvärde → 0 € skatt'
                : lang === 'de'
                  ? `Deine ESt darauf: ${formatEur(activeScenario.sachbezugTaxMonthlyEur, lang)}/Mon.`
                  : `Din skatt: ${formatEur(activeScenario.sachbezugTaxMonthlyEur, lang)}/mån`}
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'var(--at-bg-inset)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-muted)', fontWeight: 700 }}>
              4. Vorsteuerabzug & Luxustangente
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.98rem',
                fontWeight: 700,
                color:
                  activeScenario.vorsteuerDeductionTotalEur > 0
                    ? 'var(--at-spruce)'
                    : 'var(--at-ink)',
                marginTop: '0.15rem',
              }}
            >
              {formatEur(activeScenario.vorsteuerDeductionTotalEur, lang)}{' '}
              {lang === 'de' ? 'USt-Abzug' : 'momsavdrag'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-secondary)' }}>
              {profile.vatExempt
                ? lang === 'de'
                  ? '0 € Vorsteuerabzug (§ 6 Abs 1 Z 19 UStG Heilbehandlung) · Brutto-AfA bis 40.000 €'
                  : '0 € momsavdrag (§ 6 UStG Sjukvård) · Bruttoavskrivning upp till 40 000 €'
                : car.co2GKm === 0
                  ? lang === 'de'
                    ? 'Bis 40.000 € voll, 40–80k € anteilig'
                    : 'Upp till 40 000 € fullt, 40–80k € delvis'
                  : lang === 'de'
                    ? 'Kein Vorsteuerabzug für PKW > 0 g/km'
                    : 'Inget momsavdrag för bil > 0 g/km'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Levers & Offer Customizer */}
      <div
        className="waterfall-card"
        style={{ marginBottom: '1.5rem' }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '0.9rem',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: 700,
                margin: 0,
              }}
            >
              {lang === 'de'
                ? 'Eigenes Händlerangebot, Rabatt & Ausstattung anpassen'
                : 'Anpassa rabatt, restvärde, ränta & extrautrustning'}
            </h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--at-ink-muted)' }}>
              {lang === 'de'
                ? 'Hast du ein konkretes Kauf- oder Leasingangebot in Österreich? Passe die Hebel hier direkt an:'
                : 'Har du fått en konkret offert i Österrike? Justera reglagen nedan så räknas allt om direkt:'}
            </p>
          </div>
          {(overrides.discountPercent ||
            overrides.residualShareOverride !== undefined ||
            overrides.loanRateOverride !== undefined ||
            overrides.customLeaseMonthly !== undefined ||
            (overrides.selectedEquipmentIds && overrides.selectedEquipmentIds.length > 0)) && (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.76rem', padding: '0.32rem 0.65rem' }}
              onClick={() => onChangeOverrides({})}
            >
              {lang === 'de' ? 'Auf Standardwerte zurücksetzen' : 'Återställ standardvärden'}
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Discount slider */}
          <div className="field-card">
            <label className="field-label">
              <span>{lang === 'de' ? 'Händlerrabatt (%)' : 'Handlarrabatt (%)'}</span>
              <span className="field-value-badge">{overrides.discountPercent ?? 0} %</span>
            </label>
            <input
              type="range"
              className="at-range"
              min={0}
              max={20}
              step={1}
              value={overrides.discountPercent ?? 0}
              onChange={(e) =>
                onChangeOverrides({
                  ...overrides,
                  discountPercent: Number(e.target.value),
                })
              }
            />
            <span className="field-hint">
              {lang === 'de'
                ? 'Senkt Kaufpreis, Sachbezugs-Basis (Rechnungspreis) und Luxustangente.'
                : 'Sänker inköpspris, förmånsgrund (fakturerat pris) och Luxustangente.'}
            </span>
          </div>

          {/* Residual value slider */}
          <div className="field-card">
            <label className="field-label">
              <span>
                {lang === 'de'
                  ? `Restwert nach ${profile.holdingMonths} Mon.`
                  : `Restvärde efter ${profile.holdingMonths} mån`}
              </span>
              <span className="field-value-badge">
                {Math.round(
                  (overrides.residualShareOverride ??
                    activeScenario.residualEndEur.central / car.listPriceGross) * 100
                )}{' '}
                % ({formatEur(activeScenario.residualEndEur.central, lang)})
              </span>
            </label>
            <input
              type="range"
              className="at-range"
              min={25}
              max={75}
              step={1}
              value={Math.round(
                (overrides.residualShareOverride ??
                  activeScenario.residualEndEur.central / car.listPriceGross) * 100
              )}
              onChange={(e) =>
                onChangeOverrides({
                  ...overrides,
                  residualShareOverride: Number(e.target.value) / 100,
                })
              }
            />
            <span className="field-hint">
              {lang === 'de'
                ? 'Größter Einzelfaktor beim Kauf (ÖAMTC / Eurotax Österreich).'
                : 'Största enskilda posten vid köp (ÖAMTC / Eurotax Österrike).'}
            </span>
          </div>

          {/* Interest rate or Custom Lease fee */}
          {selectedForm === 'privateLease' ? (
            <div className="field-card">
              <label className="field-label">
                <span>
                  {lang === 'de' ? 'Eigene Leasingrate (€/Mon.)' : 'Egen leasingavgift (€/mån)'}
                </span>
                <span className="field-value-badge">
                  {formatEur(
                    overrides.customLeaseMonthly ?? car.leaseOffer?.monthlyFeeGross ?? 499,
                    lang
                  )}
                </span>
              </label>
              <input
                type="range"
                className="at-range"
                min={199}
                max={1499}
                step={10}
                value={overrides.customLeaseMonthly ?? car.leaseOffer?.monthlyFeeGross ?? 499}
                onChange={(e) =>
                  onChangeOverrides({
                    ...overrides,
                    customLeaseMonthly: Number(e.target.value),
                  })
                }
              />
              <span className="field-hint">
                {car.leaseOffer
                  ? `${car.leaseOffer.lessor} (${car.leaseOffer.rateType === 'fixed' ? 'Fixzins' : 'Variabel'})`
                  : lang === 'de'
                    ? 'Modellierte österreichische Leasingrate'
                    : 'Modellerad österrikisk leasingavgift'}
              </span>
            </div>
          ) : (
            <div className="field-card">
              <label className="field-label">
                <span>{lang === 'de' ? 'Kreditzins effektiv (%)' : 'Billåneränta effektiv (%)'}</span>
                <span className="field-value-badge">
                  {((overrides.loanRateOverride ?? 0.0545) * 100).toFixed(2).replace('.', ',')} %
                </span>
              </label>
              <input
                type="range"
                className="at-range"
                min={1.9}
                max={9.9}
                step={0.1}
                value={Number(((overrides.loanRateOverride ?? 0.0545) * 100).toFixed(1))}
                onChange={(e) =>
                  onChangeOverrides({
                    ...overrides,
                    loanRateOverride: Number(e.target.value) / 100,
                  })
                }
              />
              <span className="field-hint">
                {lang === 'de'
                  ? 'OeNB-Durchschnitt Österreich 2026: 5,45 % p.a.'
                  : 'OeNB-snitt i Österrike 2026: 5,45 % per år.'}
              </span>
            </div>
          )}

          {/* Equipment Options */}
          <div className="field-card">
            <label className="field-label">
              <span>
                {lang === 'de' ? 'Sonderausstattung (AT)' : 'Extrautrustning (AT)'}
              </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {car.equipmentOptions.map((eq) => {
                const checked = (overrides.selectedEquipmentIds ?? []).includes(eq.id);
                return (
                  <label key={eq.id} className={`choice-card ${checked ? 'is-active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEquipment(eq.id)}
                    />
                    <span className="choice-card-label" style={{ fontSize: '0.78rem' }}>
                      {lang === 'de' ? eq.labelDe : eq.labelSv} (+{formatEur(eq.priceGross, lang)})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Deep Dive: Waterfall + Trace Inspector (Left) & Tornado + Break-Even (Right) */}
      <div className="detail-grid">
        {/* LEFT COLUMN: Waterfall + Interactive Formula Trace Inspector */}
        <div className="waterfall-card">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 700,
              margin: '0 0 0.25rem',
            }}
          >
            {t.waterfallTitle}
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--at-ink-secondary)' }}>
            {t.waterfallHint}
          </p>

          <div className="wf-columns">
            {activeScenario.waterfall.map((w) => {
              const widthPct = Math.min(
                100,
                Math.max(4, (Math.abs(w.monthlyEur) / maxWaterfallAbs) * 100)
              );
              const isSelected = activeTraceId === w.traceId;
              return (
                <div
                  key={w.id}
                  className={`wf-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectTraceNode(w.traceId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectTraceNode(w.traceId);
                    }
                  }}
                >
                  <div>
                    <div className="wf-label">
                      {lang === 'de' ? w.labelDe : w.labelSv}
                    </div>
                    {(lang === 'de' ? w.shortNoteDe : w.shortNoteSv) && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-muted)' }}>
                        {lang === 'de' ? w.shortNoteDe : w.shortNoteSv}
                      </div>
                    )}
                  </div>

                  <div className="wf-bar-track">
                    <div
                      className={`wf-bar-fill kind-${w.kind}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  <div
                    className="wf-amount"
                    style={{
                      color:
                        w.monthlyEur < 0
                          ? 'var(--at-spruce)'
                          : w.kind === 'total'
                            ? 'var(--at-vermilion)'
                            : 'var(--at-ink)',
                    }}
                  >
                    {w.monthlyEur > 0 && w.kind !== 'total' ? '+' : ''}
                    {formatEur(w.monthlyEur, lang)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Formula Trace Inspector */}
          {activeTrace && (
            <div className="trace-inspector">
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--at-vermilion)',
                    }}
                  >
                    {t.traceTitle}
                  </span>
                  {traceBreadcrumb.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                      {traceBreadcrumb.map((bcId, idx) => {
                        const node = activeScenario.traces[bcId];
                        if (!node) return null;
                        return (
                          <React.Fragment key={bcId}>
                            {idx > 0 && <span style={{ color: 'var(--at-ink-muted)' }}>›</span>}
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '0.1rem 0.25rem',
                                cursor: 'pointer',
                                color:
                                  bcId === activeTraceId
                                    ? 'var(--at-ink)'
                                    : 'var(--at-danube)',
                                fontWeight: bcId === activeTraceId ? 700 : 500,
                                textDecoration: bcId === activeTraceId ? 'none' : 'underline',
                                fontSize: '0.75rem',
                              }}
                              onClick={() => selectTraceNode(bcId, true)}
                            >
                              {lang === 'de' ? node.labelDe : node.labelSv}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.18rem 0.55rem',
                    borderRadius: '999px',
                    background:
                      activeTrace.status === 'legislated'
                        ? 'var(--at-spruce-soft)'
                        : 'var(--at-danube-soft)',
                    color:
                      activeTrace.status === 'legislated'
                        ? 'var(--at-spruce)'
                        : 'var(--at-danube)',
                  }}
                >
                  {statusLabel(activeTrace.status)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '1rem',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {lang === 'de' ? activeTrace.labelDe : activeTrace.labelSv}
                </h3>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--at-ink)',
                  }}
                >
                  {activeTrace.formattedValue}
                </span>
              </div>

              <div className="trace-formula-box">
                {lang === 'de' ? activeTrace.formulaDe : activeTrace.formulaSv}
              </div>

              <p style={{ margin: '0.5rem 0', fontSize: '0.84rem', color: 'var(--at-ink-secondary)' }}>
                {lang === 'de' ? activeTrace.explanationDe : activeTrace.explanationSv}
              </p>

              {/* Child inputs to click & drill down */}
              {activeTrace.inputs.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: 'var(--at-ink-muted)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    {lang === 'de'
                      ? 'Eingangswerte (anklicken zum Aufschlüsseln):'
                      : 'Ingående delposter (klicka för att borra ner):'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {activeTrace.inputs.map((childId) => {
                      const child = activeScenario.traces[childId];
                      if (!child) return null;
                      return (
                        <button
                          key={childId}
                          type="button"
                          className="btn-secondary"
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.76rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                          onClick={() => selectTraceNode(childId, true)}
                        >
                          <span>{lang === 'de' ? child.labelDe : child.labelSv}:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>
                            {child.formattedValue}
                          </strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Official Austrian Legal Source Citation */}
              {activeTrace.source && (
                <div
                  style={{
                    marginTop: '0.85rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--at-border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.76rem',
                    color: 'var(--at-ink-muted)',
                  }}
                >
                  <div>
                    <strong>{activeTrace.source.authority}:</strong> {activeTrace.source.title} (
                    <code>{activeTrace.source.lawRef}</code>)
                  </div>
                  <a
                    href={activeTrace.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--at-vermilion)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    {lang === 'de' ? 'Offizielle Quelle öffnen ↗' : 'Öppna officiell källa ↗'}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Warnings & Key Assumptions */}
          {(activeScenario.warningsDe.length > 0 || activeScenario.assumptionsDe.length > 0) && (
            <div style={{ marginTop: '1.1rem', display: 'grid', gap: '0.6rem' }}>
              {(lang === 'de' ? activeScenario.warningsDe : activeScenario.warningsSv).map(
                (warn, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--at-amber-soft)',
                      borderLeft: '3px solid var(--at-amber)',
                      fontSize: '0.8rem',
                      color: 'var(--at-ink)',
                    }}
                  >
                    ⚠️ {warn}
                  </div>
                )
              )}

              <div
                style={{
                  padding: '0.7rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--at-bg-inset)',
                  fontSize: '0.78rem',
                  color: 'var(--at-ink-secondary)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--at-ink)' }}>
                  {lang === 'de'
                    ? 'Wichtige Annahmen dieser Kalkulation:'
                    : 'Viktiga antaganden i denna kalkyl:'}
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {(lang === 'de'
                    ? activeScenario.assumptionsDe
                    : activeScenario.assumptionsSv
                  ).map((ass, i) => (
                    <li key={i}>{ass}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Zulassungsschein, Tornado Sensitivity & Buy vs Lease Break-Even */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ZulassungsscheinCard
            car={car}
            lang={lang}
            motorTaxMonthlyEur={activeScenario.motorTaxMonthlyEur}
            novaPercent={activeScenario.novaPercent}
          />

          <div className="tornado-card">
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.12rem',
                fontWeight: 700,
                margin: '0 0 0.25rem',
              }}
            >
              {t.tornadoTitle}
            </h2>
            <p
              style={{
                margin: '0 0 0.85rem',
                fontSize: '0.82rem',
                color: 'var(--at-ink-secondary)',
              }}
            >
              {t.tornadoHint}
            </p>

            <div>
              {tornado.map((item) => {
                const pct = Math.min(
                  100,
                  Math.max(6, (Math.abs(item.deltaMonthlyEur) / maxTornadoAbs) * 100)
                );
                const isSaving = item.deltaMonthlyEur < 0;
                return (
                  <div key={item.id} className="tornado-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        {lang === 'de' ? item.labelDe : item.labelSv}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--at-ink-muted)' }}>
                        {lang === 'de' ? item.parameterHintDe : item.parameterHintSv}
                      </div>
                    </div>

                    <div
                      style={{
                        height: '12px',
                        background: 'var(--at-bg-inset)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: isSaving ? 'var(--at-spruce)' : 'var(--at-vermilion)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textAlign: 'right',
                        color: isSaving ? 'var(--at-spruce)' : 'var(--at-vermilion)',
                      }}
                    >
                      {item.deltaMonthlyEur > 0 ? '+' : ''}
                      {formatEur(item.deltaMonthlyEur, lang)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buy vs. Lease Break-Even Card */}
          {breakEvenResidual && (
            <div className="tornado-card">
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.12rem',
                  fontWeight: 700,
                  margin: '0 0 0.35rem',
                }}
              >
                {t.buyOrLeaseTitle}
              </h2>

              <p
                style={{
                  margin: '0 0 0.9rem',
                  fontSize: '0.83rem',
                  color: 'var(--at-ink-secondary)',
                }}
              >
                {lang === 'de'
                  ? `Vergleich zwischen Barkauf (${formatEur(breakEvenResidual.buyMonthlyWallet, lang)}/Mon.) und Privatleasing (${formatEur(breakEvenResidual.leaseMonthlyWallet, lang)}/Mon.) über ${profile.holdingMonths} Monate:`
                  : `Jämförelse mellan kontantköp (${formatEur(breakEvenResidual.buyMonthlyWallet, lang)}/mån) och privatleasing (${formatEur(breakEvenResidual.leaseMonthlyWallet, lang)}/mån) över ${profile.holdingMonths} månader:`}
              </p>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--at-bg-inset)',
                  border: '1px solid var(--at-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.45rem',
                    fontSize: '0.82rem',
                  }}
                >
                  <span>
                    {lang === 'de'
                      ? 'Break-Even-Restwert (Kauf = Leasing):'
                      : 'Break-even-restvärde (Köp = Leasing):'}
                  </span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>
                    {Math.round(breakEvenResidual.breakEvenResidualShare * 100)} % (
                    {formatEur(breakEvenResidual.breakEvenResidualEur, lang)})
                  </strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                  }}
                >
                  <span>
                    {lang === 'de'
                      ? 'Erwarteter Restwert (Eurotax AT Spanne):'
                      : 'Förväntat restvärde (Eurotax AT-spann):'}
                  </span>
                  <strong
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--at-spruce)',
                    }}
                  >
                    {Math.round(breakEvenResidual.estimatedResidualLowShare * 100)}–
                    {Math.round(breakEvenResidual.estimatedResidualHighShare * 100)} % (Ø{' '}
                    {Math.round(breakEvenResidual.estimatedResidualShare * 100)} %)
                  </strong>
                </div>

                <p
                  style={{
                    margin: '0.65rem 0 0',
                    paddingTop: '0.6rem',
                    borderTop: '1px solid var(--at-border)',
                    fontSize: '0.8rem',
                    color: 'var(--at-ink-secondary)',
                  }}
                >
                  {breakEvenResidual.buyMonthlyWallet <= breakEvenResidual.leaseMonthlyWallet
                    ? lang === 'de'
                      ? `Beim erwarteten Restwert von ${Math.round(breakEvenResidual.estimatedResidualShare * 100)} % ist Kaufen um ${formatEur(breakEvenResidual.leaseMonthlyWallet - breakEvenResidual.buyMonthlyWallet, lang)}/Monat günstiger als Privatleasing. Erst wenn der Wiederverkaufspreis unter ${formatEur(breakEvenResidual.breakEvenResidualEur, lang)} fällt, wäre Leasing günstiger gewesen.`
                      : `Vid det förväntade restvärdet på ${Math.round(breakEvenResidual.estimatedResidualShare * 100)} % är köp ${formatEur(breakEvenResidual.leaseMonthlyWallet - breakEvenResidual.buyMonthlyWallet, lang)}/mån billigare än privatleasing. Först om andrahandsvärdet faller under ${formatEur(breakEvenResidual.breakEvenResidualEur, lang)} hade leasing lönat sig.`
                    : lang === 'de'
                      ? `Das aktuelle Leasingangebot ist um ${formatEur(breakEvenResidual.buyMonthlyWallet - breakEvenResidual.leaseMonthlyWallet, lang)}/Monat günstiger als der Kauf, sofern der Restwert nicht über ${Math.round(breakEvenResidual.breakEvenResidualShare * 100)} % (${formatEur(breakEvenResidual.breakEvenResidualEur, lang)}) steigt.`
                      : `Det aktuella leasingerbjudandet är ${formatEur(breakEvenResidual.buyMonthlyWallet - breakEvenResidual.leaseMonthlyWallet, lang)}/mån billigare än köp, så länge restvärdet inte överstiger ${Math.round(breakEvenResidual.breakEvenResidualShare * 100)} % (${formatEur(breakEvenResidual.breakEvenResidualEur, lang)}).`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
