import React from 'react';
import { CompareItem, Language, OwnershipForm } from '../types';
import {
  OWNERSHIP_FORM_LABELS,
  POWERTRAIN_LABELS,
  UI_TEXT,
} from '../i18n/translations';
import { formatEur } from '../engine/austrianCalculator';
import { OFFICIAL_SOURCES, BUNDESLAENDER } from '../data/austriaRules';
import { AUSTRIAN_CARS_CATALOG } from '../data/carsCatalog';
import { getCarImageUrl } from './CarVisualStage';

interface CompareViewProps {
  items: CompareItem[];
  lang: Language;
  onRemove: (key: string) => void;
  onClear: () => void;
  onOpenCar: (slug: string, form: OwnershipForm) => void;
  onBack: () => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  items,
  lang,
  onRemove,
  onClear,
  onOpenCar,
  onBack,
}) => {
  const t = UI_TEXT[lang];

  return (
    <div style={{ padding: '1rem 0 3rem' }}>
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
        <div>
          <span className="hero-kicker">
            {lang === 'de' ? 'DIREKTVERGLEICH ÖSTERREICH' : 'DIREKTJÄMFÖRELSE ÖSTERRIKE'}
          </span>
          <h1
            id="view-main-heading"
            tabIndex={-1}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 700,
              margin: '0.35rem 0 0',
              outline: 'none',
            }}
          >
            {lang === 'de'
              ? 'Autos & Erwerbsformen nebeneinander vergleichen'
              : 'Jämför bilar & innehavsformer sida vid sida'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {items.length > 0 && (
            <button type="button" className="btn-secondary" onClick={onClear}>
              {lang === 'de' ? 'Liste leeren' : 'Töm jämförelse'}
            </button>
          )}
          <button type="button" className="btn-primary" onClick={onBack}>
            {t.backToSearch}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            background: 'var(--at-bg-elevated)',
            border: '1px solid var(--at-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '1rem', color: 'var(--at-ink-secondary)', marginBottom: '1rem' }}>
            {lang === 'de'
              ? 'Du hast noch keine Autos zum Vergleich hinzugefügt. Klicke bei einem Auto auf „+ Vergleichen“.'
              : 'Du har inte lagt till några bilar i jämförelsen än. Klicka på ”+ Jämför” på valfritt bilkort.'}
          </p>
          <button type="button" className="btn-primary" onClick={onBack}>
            {lang === 'de' ? 'Zu den Autos' : 'Hitta bilar att jämföra'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {items.map((item, idx) => {
            const matchedCar = AUSTRIAN_CARS_CATALOG.find((c) => c.id === item.carId);
            return (
            <article key={item.key} className="car-card">
              {matchedCar && (
                <div className="car-visual-stage car-visual-stage--compact">
                  <div className="car-photo-frame">
                    <img
                      src={getCarImageUrl(matchedCar.modelId)}
                      alt={item.carName}
                      className="car-stage-photo"
                      width={640}
                      height={360}
                      {...(idx === 0
                        ? ({ fetchpriority: 'high' } as React.ImgHTMLAttributes<HTMLImageElement>)
                        : { loading: 'lazy' as const })}
                    />
                    <div className="car-photo-vignette" aria-hidden="true" />
                  </div>
                </div>
              )}
              <div className="car-card-header">
                <span className="car-brand-kicker">{item.brand}</span>
                <h2 className="car-model-title" style={{ fontSize: '1.05rem' }}>
                  {item.carName}
                </h2>
                <div className="car-spec-pills">
                  <span className="spec-pill">
                    {POWERTRAIN_LABELS[lang][item.powertrain]}
                  </span>
                  <span className="spec-pill">
                    {OWNERSHIP_FORM_LABELS[lang][item.form]}
                  </span>
                </div>
              </div>

              <div className="car-price-hero">
                <div className="price-main-row">
                  <span className="price-caption">{t.costsYou}</span>
                  <div>
                    <span className="price-monthly-figure">
                      {formatEur(item.walletMonthly, lang)}
                    </span>
                    <span className="price-monthly-unit">{t.perMonth}</span>
                  </div>
                </div>
                <div className="span-meta-row">
                  <span>{t.spanLabel}</span>
                  <span>
                    {formatEur(item.walletSpan.low, lang)} –{' '}
                    {formatEur(item.walletSpan.high, lang)} {t.perMonth}
                  </span>
                </div>
              </div>

              <div className="car-tax-breakdown">
                <div className="tax-row">
                  <span className="tax-row-label">
                    {lang === 'de' ? 'Listenpreis (inkl. NoVA/USt)' : 'Listpris (inkl. NoVA/moms)'}
                  </span>
                  <span className="tax-row-val">{formatEur(item.listPriceGross, lang)}</span>
                </div>
                <div className="tax-row">
                  <span className="tax-row-label">
                    {lang === 'de' ? 'Kosten pro km' : 'Kostnad per km'}
                  </span>
                  <span className="tax-row-val">
                    {item.perKmEur.toFixed(2).replace('.', ',')} €/km
                  </span>
                </div>
                <div className="tax-row">
                  <span className="tax-row-label">WLTP</span>
                  <span className="tax-row-val">
                    {item.wltpRangeKm ? `${item.wltpRangeKm} km` : '—'}
                  </span>
                </div>
                <div className="tax-row">
                  <span className="tax-row-label">Motorbez. Steuer (AT)</span>
                  <span className="tax-row-val">
                    {formatEur(item.motorTaxMonthlyEur, lang)}/Mon.
                  </span>
                </div>
                <div className="tax-row">
                  <span className="tax-row-label">Sachbezug (Brutto)</span>
                  <span
                    className={`tax-row-val ${item.sachbezugMonthlyGrossEur === 0 ? 'zero-tax' : ''}`}
                  >
                    {formatEur(item.sachbezugMonthlyGrossEur, lang)}/Mon.
                  </span>
                </div>
                <div className="tax-row">
                  <span className="tax-row-label">Vorsteuerabzug (AT)</span>
                  <span
                    className={`tax-row-val ${item.vorsteuerDeductionTotalEur > 0 ? 'zero-tax' : ''}`}
                  >
                    {formatEur(item.vorsteuerDeductionTotalEur, lang)}
                  </span>
                </div>
              </div>

              <div className="car-card-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onOpenCar(item.slug, item.form)}
                >
                  {t.showCalculation}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onRemove(item.key)}
                >
                  {lang === 'de' ? 'Entfernen' : 'Ta bort'}
                </button>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface TaxGuideViewProps {
  lang: Language;
  onBack: () => void;
}

export const TaxGuideView: React.FC<TaxGuideViewProps> = ({ lang, onBack }) => {
  const t = UI_TEXT[lang];

  return (
    <div style={{ padding: '1rem 0 3rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <span className="hero-kicker">
            {lang === 'de'
              ? 'STEUER- & RECHTSGRUNDLAGEN ÖSTERREICH · STAND 2025/2026'
              : 'SKATTE- & REGELLÄGE I ÖSTERRIKE · REGLER 2025/2026'}
          </span>
          <h1
            id="view-main-heading"
            tabIndex={-1}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 2.6vw, 2.15rem)',
              fontWeight: 700,
              margin: '0.35rem 0 0.25rem',
              outline: 'none',
            }}
          >
            {lang === 'de'
              ? 'Wie Autosteuern in Österreich funktionieren'
              : 'Så fungerar bilskatterna i Österrike (jämfört med Sverige)'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--at-ink-secondary)' }}>
            {lang === 'de'
              ? 'Alle Formeln in AUTOKALKÜL · AT basieren direkt auf dem österreichischen Einkommensteuergesetz, NoVAG, VersStG (idF BSMG 2025) und den E-Control Netztarifen.'
              : 'Alla formler i AUTOKALKÜL · AT bygger direkt på österrikisk skattelagstiftning (NoVAG, VersStG inkl. 2025 års elbilsskatt, Sachbezugswerteverordnung och E-Control).'}
          </p>
        </div>

        <button type="button" className="btn-primary" onClick={onBack}>
          {t.backToSearch}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Pillar 1: NoVA */}
        <div className="waterfall-card">
          <span className="car-brand-kicker">1 · § 6 NoVAG 1991</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: '0.25rem 0' }}>
            {lang === 'de'
              ? 'Normverbrauchsabgabe (NoVA) beim Kauf'
              : 'Normverbrauchsabgabe (NoVA) – engångsskatt vid nybilsköp'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--at-ink-secondary)' }}>
            {lang === 'de'
              ? 'Anders als in Schweden (wo Bonus-Malus nur über die jährliche Fordonsskatt läuft) erhebt Österreich beim Neukauf oder Erstimport eine einmalige CO₂-abhängige Abgabe auf den Nettopreis:'
              : 'Till skillnad från Sverige (där malus ligger på den årliga fordonsskatten i 3 år) tar Österrike ut en CO₂-baserad engångsskatt (NoVA) direkt på bilens nettopris vid nybilsköp eller import:'}
          </p>
          <div className="trace-formula-box">
            {lang === 'de'
              ? 'NoVA-% = (WLTP_CO₂ - 85) / 5 %  (max. 80 %)\nAbzugsposten: -350 € · Malus ab 155 g/km: +80 € je g/km\nReine Elektroautos (0 g/km): 0 % NoVA (0 €)'
              : 'NoVA-% = (WLTP_CO₂ - 85) / 5 %  (max 80 %)\nAvdrag: -350 € · Malus över 155 g/km: +80 € per g/km\nRena elbilar (0 g/km): 0 % NoVA (0 €)'}
          </div>
        </div>

        {/* Pillar 2: April 2025 EV Motorbezogene Versicherungssteuer */}
        <div className="waterfall-card">
          <span className="car-brand-kicker">2 · § 6 VersStG idF BSMG 2025 (NEU AB 01.04.2025)</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: '0.25rem 0' }}>
            {lang === 'de'
              ? 'Motorbezogene Versicherungssteuer (inkl. E-Autos!)'
              : 'Löpande fordonsskatt – inklusive nya elbilsskatten (fr.o.m. april 2025)'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--at-ink-secondary)' }}>
            {lang === 'de'
              ? 'Seit 1. April 2025 sind auch Elektroautos in Österreich nicht mehr von der motorbezogenen Versicherungssteuer befreit. Maßgeblich für E-Autos sind die 30-Minuten-Nenndauerleistung (Feld P.2 im Zulassungsschein, nicht die Peak-Leistung!) und das Eigengewicht (Feld G):'
              : 'Från 1 april 2025 är elbilar inte längre befriade från löpande fordonsskatt i Österrike. För elbilar beräknas skatten på 30-minuters kontinuerlig effekt (Nenndauerleistung i regbeviset, inte toppeffekten!) samt tjänstevikt (Eigengewicht):'}
          </p>
          <div className="trace-formula-box">
            {lang === 'de'
              ? 'E-Auto (BEV): Freigrenze 45 kW Dauerleistung & 900 kg Eigengewicht.\n• Leistung (kW - 45): nächste 35 kW × 0,25 € | nächste 25 kW × 0,35 € | Rest × 0,45 € / Mon.\n• Gewicht (kg - 900): nächste 500 kg × 0,015 € | nächste 700 kg × 0,030 € | Rest × 0,045 € / Mon.'
              : 'Elbil (BEV): Fribelopp 45 kW kontinuerlig effekt & 900 kg vikt.\n• Effekt (kW - 45): nästa 35 kW × 0,25 € | nästa 25 kW × 0,35 € | resten × 0,45 € / mån.\n• Vikt (kg - 900): nästa 500 kg × 0,015 € | nästa 700 kg × 0,030 € | resten × 0,045 € / mån.'}
          </div>
        </div>

        {/* Pillar 3: Sachbezug */}
        <div className="waterfall-card">
          <span className="car-brand-kicker">3 · § 4 Sachbezugswerteverordnung</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: '0.25rem 0' }}>
            {lang === 'de'
              ? 'Dienstwagen & Sachbezug (0 % für Elektroautos)'
              : 'Tjänstebil (Dienstwagen) & förmånsvärde (0 % för elbil!)'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--at-ink-secondary)' }}>
            {lang === 'de'
              ? 'Der größte Steuervorteil für E-Autos in Österreich: Während in Schweden auch Elektro-Dienstwagen ein steuerpflichtiges förmånsvärde haben, gilt in Österreich für 0-Gramm-Fahrzeuge weiterhin 0 % Sachbezug (inkl. steuerfreiem Laden über Arbeitgeber/Wallbox):'
              : 'Den absolut största skattefördelen för elbil i Österrike: Medan el-tjänstebilar i Sverige beskattas via förmånsvärde, har rena elbilar (0 g/km) i Österrike 0,00 € i förmånsvärde (0 % Sachbezug):'}
          </p>
          <div className="trace-formula-box">
            {lang === 'de'
              ? '• 0 g/km (BEV): 0,0 % Sachbezug → 0 €/Monat Lohnsteuer\n• 1 bis 126 g/km (WLTP 2025/2026): 1,5 % der Anschaffungskosten (max. 720 €/Monat)\n• Über 126 g/km: 2,0 % der Anschaffungskosten (max. 960 €/Monat)\n• Halber Sachbezug (0,75 % / 1,0 %): bei nachweislich ≤ 6.000 km Privatfahrt/Jahr'
              : '• 0 g/km (BEV): 0,0 % Sachbezug → 0 €/mån i förmånsskatt\n• 1 till 126 g/km (WLTP 2025/2026): 1,5 % av inköpspris (max 720 €/mån)\n• Över 126 g/km: 2,0 % av inköpspris (max 960 €/mån)\n• Halverad Sachbezug (0,75 % / 1,0 %): om privatkörning ≤ 6 000 km/år med körjournal'}
          </div>
        </div>

        {/* Pillar 4: Luxustangente & Vorsteuerabzug */}
        <div className="waterfall-card">
          <span className="car-brand-kicker">4 · § 12 Abs 2 Z 2a UStG & PKW-AngemessenheitsVO</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: '0.25rem 0' }}>
            {lang === 'de'
              ? 'Vorsteuerabzug & 40.000-€-Luxustangente (GmbH / EPU)'
              : 'Momsavdrag (Vorsteuerabzug) & 40 000 €-taket i GmbH'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--at-ink-secondary)' }}>
            {lang === 'de'
              ? 'Für Unternehmer und GmbHs gilt in Österreich die strenge PKW-Angemessenheitsgrenze („Luxustangente“) von 40.000 € brutto. Für E-Autos gibt es den vollen 20 % Vorsteuerabzug bis 40.000 €:'
              : 'För företag och eget GmbH i Österrike gäller det skattemässiga pristaket ("Luxustangente") på 40 000 € brutto. För elbilar (0 g/km) medges fullt 20 % momsavdrag (till skillnad från Sveriges halva lyxmoms vid leasing):'}
          </p>
          <div className="trace-formula-box">
            {lang === 'de'
              ? '• Bis 40.000 € Brutto (BEV): voller Vorsteuerabzug (bis 6.666,67 € USt)\n• 40.001 € bis 80.000 € (BEV): Vorsteuerabzug effektiv auf 6.666,67 € gedeckelt (Eigenverbrauch)\n• Über 80.000 € Brutto oder Verbrenner/PHEV (> 0 g/km): 0 € Vorsteuerabzug\n• Ertragsteuer (23 % KöSt / ESt): Abschreibung (AfA 8 Jahre) ist auf 40.000 € gedeckelt.'
              : '• Upp till 40 000 € brutto (BEV): fullt momsavdrag (upp till 6 666,67 €)\n• 40 001 € till 80 000 € (BEV): momsavdraget spärras vid max 6 666,67 €\n• Över 80 000 € brutto eller bil med > 0 g/km: 0 € momsavdrag\n• Bolagsskatt (23 % KöSt): skattemässig avskrivning (8 år) takas vid 40 000 €.'}
          </div>
        </div>
      </div>

      {/* E-Control Bundesländer Table */}
      <div className="waterfall-card" style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
          {lang === 'de'
            ? 'Strom- und Netztarife nach Bundesland (E-Control Österreich 2026)'
            : 'El- och elnätspriser per förbundsland (E-Control Österrike 2026)'}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.65rem',
          }}
        >
          {Object.values(BUNDESLAENDER).map((b) => (
            <div
              key={b.id}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--at-bg-inset)',
                border: '1px solid var(--at-border)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                {lang === 'de' ? b.nameDe : b.nameSv} ({b.capital})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--at-ink-muted)' }}>
                {b.gridOperator}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: 'var(--at-spruce)',
                  marginTop: '0.25rem',
                }}
              >
                {(b.homeElectricityEurKwh * 100).toFixed(1).replace('.', ',')} ct/kWh{' '}
                <span style={{ fontWeight: 400, color: 'var(--at-ink-muted)', fontSize: '0.75rem' }}>
                  (inkl. {b.netzentgeltCentKwh.toFixed(1).replace('.', ',')} ct Netz)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Austrian Sources List */}
      <div className="waterfall-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: '0 0 0.75rem' }}>
          {lang === 'de'
            ? 'Offizielle österreichische Rechts- & Datenquellen'
            : 'Officiella österrikiska lag- och datakällor'}
        </h2>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {Object.values(OFFICIAL_SOURCES).map((src, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.85rem',
                background: 'var(--at-bg-inset)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
              }}
            >
              <div>
                <strong>{src.authority}:</strong> {src.title} (<code>{src.lawRef}</code>)
              </div>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--at-vermilion)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {src.url} ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
