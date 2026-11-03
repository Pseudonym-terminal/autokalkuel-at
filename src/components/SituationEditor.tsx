import React, { useEffect, useRef } from 'react';
import {
  AUSTRIAN_MUNICIPALITIES,
  AUSTRIAN_PROFILE_PRESETS,
  BUNDESLAENDER,
} from '../data/austriaRules';
import { formatEur, formatNum } from '../engine/austrianCalculator';
import { UI_TEXT } from '../i18n/translations';
import { AustrianProfile, BundeslandId, Language } from '../types';

interface SituationEditorProps {
  profile: AustrianProfile;
  onChange: (next: AustrianProfile) => void;
  lang: Language;
}

const TAX_BRACKETS: Array<AustrianProfile['taxBracket']> = [
  0.2, 0.3, 0.4, 0.48, 0.5, 0.55,
];
const HOLDING_OPTIONS: Array<AustrianProfile['holdingMonths']> = [
  24, 36, 48, 60, 72,
];

// Probe discrete display transition support (modern-web-guidance: animate-to-from-top-layer)
let supportsDisplayTransition: boolean | undefined;
function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return (
    Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay()
  );
}

export async function closeTopLayer(element: HTMLDialogElement): Promise<void> {
  if (!supportsTopLayerExit()) {
    element.setAttribute('data-closing', '');
    const animations = element.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
    }
    if (!element.hasAttribute('data-closing')) return;
    element.removeAttribute('data-closing');
  }
  element.close();
}

export const SituationFields: React.FC<SituationEditorProps> = ({
  profile,
  onChange,
  lang,
}) => {
  const t = UI_TEXT[lang];
  const rootRef = useRef<HTMLDivElement>(null);
  const bl = BUNDESLAENDER[profile.bundesland];

  // Fallback for browsers that do not support :has() (modern-web-guidance: child-state-based-styling)
  useEffect(() => {
    if (
      typeof CSS !== 'undefined' &&
      !CSS.supports('selector(:has(*))') &&
      rootRef.current
    ) {
      const pills = rootRef.current.querySelectorAll('.choice-pill, .choice-card');
      pills.forEach((pill) => {
        const input = pill.querySelector('input') as HTMLInputElement | null;
        if (input) {
          pill.classList.toggle('is-active', input.checked);
        }
      });
    }
  }, [profile]);

  const update = (patch: Partial<AustrianProfile>) => {
    const merged = { ...profile, ...patch };
    if (merged.businessKmPerYear > merged.kmPerYear) {
      merged.businessKmPerYear = merged.kmPerYear;
    }
    onChange(merged);
  };

  return (
    <div className="situation-body" ref={rootRef}>
      <div className="preset-strip">
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>
          {t.presetLabel}
        </span>
        {AUSTRIAN_PROFILE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="preset-pill"
            title={lang === 'de' ? preset.descDe : preset.descSv}
            onClick={() =>
              update({
                ...preset.patch,
                vatExempt: preset.patch.vatExempt ?? false,
                access: preset.patch.access
                  ? { ...profile.access, ...preset.patch.access }
                  : profile.access,
              })
            }
          >
            {lang === 'de' ? preset.labelDe : preset.labelSv}
          </button>
        ))}
      </div>

      <div className="situation-grid">
        {/* 1. Annual Mileage & Business Mileage */}
        <div className="field-box">
          <div className="field-title">
            <span>{t.kmPerYearLabel}</span>
            <span className="field-value-badge">
              {formatNum(profile.kmPerYear)} km/
              {lang === 'de' ? 'Jahr' : 'år'}
              {lang === 'sv'
                ? ` (${formatNum(Math.round(profile.kmPerYear / 10))} mil)`
                : ''}
            </span>
          </div>
          <div className="range-row">
            <input
              type="range"
              min={5000}
              max={45000}
              step={1000}
              value={profile.kmPerYear}
              aria-label={t.kmPerYearLabel}
              onChange={(e) => update({ kmPerYear: Number(e.target.value) })}
            />
            <label className="num-input-wrap">
              <input
                type="number"
                min={2000}
                max={80000}
                step={500}
                value={profile.kmPerYear}
                onChange={(e) =>
                  update({
                    kmPerYear: Math.max(1000, Number(e.target.value) || 15000),
                  })
                }
              />
              <span>km</span>
            </label>
          </div>
          <p className="field-hint">{t.kmPerYearAffect}</p>

          <div
            style={{
              marginTop: 6,
              paddingTop: 10,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <label
              htmlFor="biz-km-input"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {t.businessKmLabel}
            </label>
            <span className="num-input-wrap">
              <input
                id="biz-km-input"
                type="number"
                min={0}
                max={profile.kmPerYear}
                step={500}
                value={profile.businessKmPerYear}
                onChange={(e) =>
                  update({
                    businessKmPerYear: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
              <span>km</span>
            </span>
          </div>
          <p className="field-hint">{t.businessKmHint}</p>
        </div>

        {/* 2. Bundesland, Stromnetz & Ort */}
        <div className="field-box">
          <div className="field-title">
            <label htmlFor="bundesland-select">{t.bundeslandLabel}</label>
            <span className="field-value-badge">
              {(bl.homeElectricityEurKwh * 100).toFixed(1).replace('.', ',')} ct/kWh
            </span>
          </div>
          <select
            id="bundesland-select"
            className="select-input"
            value={profile.bundesland}
            onChange={(e) => {
              const nextBl = e.target.value as BundeslandId;
              update({
                bundesland: nextBl,
                municipality: BUNDESLAENDER[nextBl].capital,
              });
            }}
          >
            {Object.values(BUNDESLAENDER).map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'de' ? b.nameDe : b.nameSv} —{' '}
                {(b.homeElectricityEurKwh * 100).toFixed(1)} ct/kWh
              </option>
            ))}
          </select>

          <label
            htmlFor="at-municipality-input"
            style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}
          >
            {t.municipalityLabel}
          </label>
          <input
            id="at-municipality-input"
            className="text-input"
            list="at-municipalities-list"
            placeholder={t.municipalityPlaceholder}
            value={profile.municipality}
            onChange={(e) => {
              const val = e.target.value;
              const matched = AUSTRIAN_MUNICIPALITIES.find(
                (m) =>
                  m.name.toLowerCase() === val.toLowerCase() || m.plz === val
              );
              update({
                municipality: val,
                ...(matched ? { bundesland: matched.bundesland } : {}),
              });
            }}
          />
          <datalist id="at-municipalities-list">
            {AUSTRIAN_MUNICIPALITIES.map((m) => (
              <option key={`${m.plz}-${m.name}`} value={m.name}>
                {m.plz} ({BUNDESLAENDER[m.bundesland].capital})
              </option>
            ))}
          </datalist>
          <p className="field-hint">{t.bundeslandAffect}</p>
        </div>

        {/* 3. Ownership Access & Ordination / EPU / GmbH / Dienstwagen */}
        <div className="field-box">
          <div className="field-title">
            <span>{t.accessLabel}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label className="choice-pill is-active">
              <input type="checkbox" checked disabled />
              <span>
                {t.accessPrivate}{' '}
                <small style={{ opacity: 0.7 }}>({t.accessAlways})</small>
              </span>
            </label>
            <label className={`choice-pill ${profile.access.soleTrader ? 'is-active' : ''}`}>
              <input
                type="checkbox"
                checked={profile.access.soleTrader}
                onChange={(e) => {
                  const checked = e.target.checked;
                  update({
                    vatExempt: checked ? true : profile.vatExempt,
                    access: {
                      ...profile.access,
                      soleTrader: checked,
                      ownGmbh: checked ? false : profile.access.ownGmbh,
                    },
                  });
                }}
              />
              <span>🩺 {t.accessSoleTrader}</span>
            </label>
            <label className={`choice-pill ${profile.access.ownGmbh ? 'is-active' : ''}`}>
              <input
                type="checkbox"
                checked={profile.access.ownGmbh}
                onChange={(e) => {
                  const checked = e.target.checked;
                  update({
                    access: {
                      ...profile.access,
                      ownGmbh: checked,
                      soleTrader: checked ? false : profile.access.soleTrader,
                    },
                  });
                }}
              />
              <span>{t.accessGmbh}</span>
            </label>
            <label className={`choice-pill ${profile.access.employerBenefitCar ? 'is-active' : ''}`}>
              <input
                type="checkbox"
                checked={profile.access.employerBenefitCar}
                onChange={(e) =>
                  update({
                    access: {
                      ...profile.access,
                      employerBenefitCar: e.target.checked,
                    },
                  })
                }
              />
              <span>{t.accessBenefit}</span>
            </label>
            <label className={`choice-pill ${profile.access.employerSalaryExchange ? 'is-active' : ''}`}>
              <input
                type="checkbox"
                checked={profile.access.employerSalaryExchange}
                onChange={(e) =>
                  update({
                    access: {
                      ...profile.access,
                      employerSalaryExchange: e.target.checked,
                    },
                  })
                }
              />
              <span>{t.accessSalaryExchange}</span>
            </label>
          </div>

          {(profile.access.soleTrader || profile.access.ownGmbh) && (
            <div style={{ marginTop: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {t.vatStatusLabel}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className={`choice-pill ${profile.vatExempt ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="at-vat-status"
                    checked={Boolean(profile.vatExempt)}
                    onChange={() => update({ vatExempt: true })}
                  />
                  <span>{t.vatExemptYes}</span>
                </label>
                <label className={`choice-pill ${!profile.vatExempt ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="at-vat-status"
                    checked={!profile.vatExempt}
                    onChange={() => update({ vatExempt: false })}
                  />
                  <span>{t.vatExemptNo}</span>
                </label>
              </div>
            </div>
          )}

          {profile.access.ownGmbh && (
            <div style={{ marginTop: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {t.gmbhChannelLabel}
              </span>
              <div className="choice-grid">
                <label className={`choice-pill ${profile.gmbhPayoutChannel === 'salary' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="gmbh-channel"
                    checked={profile.gmbhPayoutChannel === 'salary'}
                    onChange={() => update({ gmbhPayoutChannel: 'salary' })}
                  />
                  <span>{t.gmbhChannelSalary}</span>
                </label>
                <label className={`choice-pill ${profile.gmbhPayoutChannel === 'dividend' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="gmbh-channel"
                    checked={profile.gmbhPayoutChannel === 'dividend'}
                    onChange={() => update({ gmbhPayoutChannel: 'dividend' })}
                  />
                  <span>{t.gmbhChannelDividend}</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 4. Tax Bracket, Holding Period & Charging */}
        <div className="field-box">
          <div className="field-title">
            <span>{t.taxBracketLabel}</span>
            <span className="field-value-badge">
              {Math.round(profile.taxBracket * 100)} %
            </span>
          </div>
          <div className="choice-grid">
            {TAX_BRACKETS.map((rate) => (
              <label key={rate} className={`choice-pill ${profile.taxBracket === rate ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="at-tax-bracket"
                  checked={profile.taxBracket === rate}
                  onChange={() => update({ taxBracket: rate })}
                />
                <span>{Math.round(rate * 100)} %</span>
              </label>
            ))}
          </div>

          <div className="field-title" style={{ marginTop: 8 }}>
            <span>{t.holdingLabel}</span>
            <span className="field-value-badge">
              {profile.holdingMonths / 12} {t.yearsUnit} ({profile.holdingMonths}{' '}
              {lang === 'de' ? 'Mon.' : 'mån'})
            </span>
          </div>
          <div className="choice-grid">
            {HOLDING_OPTIONS.map((m) => (
              <label key={m} className={`choice-pill ${profile.holdingMonths === m ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="at-holding"
                  checked={profile.holdingMonths === m}
                  onChange={() => update({ holdingMonths: m })}
                />
                <span>
                  {m / 12} {t.yearsUnit}
                </span>
              </label>
            ))}
          </div>

          <div className="field-title" style={{ marginTop: 8 }}>
            <span>{t.chargingLabel}</span>
          </div>
          <div className="choice-grid">
            <label className={`choice-pill ${profile.hasHomeCharger ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="at-charging"
                checked={profile.hasHomeCharger}
                onChange={() => update({ hasHomeCharger: true })}
              />
              <span>{t.chargingYes}</span>
            </label>
            <label className={`choice-pill ${!profile.hasHomeCharger ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="at-charging"
                checked={!profile.hasHomeCharger}
                onChange={() => update({ hasHomeCharger: false })}
              />
              <span>{t.chargingNo}</span>
            </label>
          </div>

          <label className={`choice-pill ${profile.includeVignette ? 'is-active' : ''}`} style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={profile.includeVignette}
              onChange={(e) => update({ includeVignette: e.target.checked })}
            />
            <span>{t.vignetteLabel}</span>
          </label>
        </div>
      </div>
    </div>
  );
};

interface SituationModalProps extends SituationEditorProps {
  dialogRef: React.RefObject<HTMLDialogElement>;
  previewMonthlyEur?: number;
}

export const SituationModal: React.FC<SituationModalProps> = ({
  dialogRef,
  profile,
  onChange,
  lang,
  previewMonthlyEur,
}) => {
  const t = UI_TEXT[lang];

  // Mandatory fallbacks for <dialog closedby> & top-layer exit animation
  // (modern-web-guidance: light-dismiss-a-dialog & animate-to-from-top-layer)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      closeTopLayer(dialog);
    };
    dialog.addEventListener('cancel', handleCancel);

    let handleBackdropClick: ((event: MouseEvent) => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        closeTopLayer(dialog);
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [dialogRef]);

  return (
    <dialog
      ref={dialogRef}
      className="at-modal"
      aria-labelledby="situation-modal-title"
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
    >
      <div className="modal-inner">
        <div className="modal-header">
          <div>
            <span className="hero-kicker" style={{ marginBottom: 4, display: 'block' }}>
              ÖSTERREICH-PROFIL · LIVE-BERECHNUNG
            </span>
            <h2
              id="situation-modal-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                margin: 0,
              }}
            >
              {t.mySituation}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              {t.situationBannerHint}
            </p>
          </div>
          {previewMonthlyEur !== undefined && (
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--muted)',
                  display: 'block',
                }}
              >
                {lang === 'de' ? 'Günstigstes Modell ab' : 'Billigaste modell från'}
              </span>
              <strong
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 24,
                  color: 'var(--primary)',
                }}
              >
                ≈ {formatEur(previewMonthlyEur)}
              </strong>
            </div>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (dialogRef.current) {
                closeTopLayer(dialogRef.current);
              }
            }}
          >
            {t.closeLabel} ✕
          </button>
        </div>

        <SituationFields profile={profile} onChange={onChange} lang={lang} />
      </div>
    </dialog>
  );
};
