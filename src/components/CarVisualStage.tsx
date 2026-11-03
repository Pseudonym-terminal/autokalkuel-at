import React, { useState } from 'react';
import { BundeslandId, CarVariant, Language } from '../types';

const BUNDESLAND_PLATE_PREFIX: Record<BundeslandId, { code: string; coatColor: string }> = {
  wien: { code: 'W', coatColor: '#C8232C' },
  noe: { code: 'P', coatColor: '#1E4368' },
  ooe: { code: 'L', coatColor: '#C8232C' },
  stmk: { code: 'G', coatColor: '#146348' },
  tirol: { code: 'I', coatColor: '#C8232C' },
  kaernten: { code: 'KL', coatColor: '#D97706' },
  salzburg: { code: 'S', coatColor: '#C8232C' },
  vorarlberg: { code: 'B', coatColor: '#C8232C' },
  burgenland: { code: 'E', coatColor: '#D97706' },
};

export function getCarImageUrl(modelId: string): string {
  return `cars/${modelId.replace('/', '-')}.jpg?v=studio2`;
}

interface CarVisualStageProps {
  car: CarVariant;
  bundesland: BundeslandId;
  compact?: boolean;
  /** Set true on the 1-2 LCP candidate images at the top of the viewport (modern-web-guidance: optimize-image-priority) */
  isPriority?: boolean;
}

export const CarVisualStage: React.FC<CarVisualStageProps> = ({
  car,
  bundesland,
  compact = false,
  isPriority = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const plateInfo = BUNDESLAND_PLATE_PREFIX[bundesland] || BUNDESLAND_PLATE_PREFIX.wien;
  const isBev = car.powertrain === 'bev';

  // Generate a realistic Austrian plate number from the car model/power
  const numPart = Math.max(100, Math.min(999, car.continuousPowerKw + car.rimInches * 10));
  const suffix = isBev ? 'E' : car.powertrain === 'phev' ? 'H' : 'AT';
  const imageSrc = getCarImageUrl(car.modelId);

  return (
    <div
      className={`car-visual-stage ${compact ? 'car-visual-stage--compact' : ''} ${
        !imgFailed ? 'car-visual-stage--photo' : ''
      }`}
    >
      {/* Real Car Photograph with modern-web-guidance priority management */}
      {!imgFailed && (
        <div className="car-photo-frame">
          {isPriority ? (
            <img
              src={imageSrc}
              alt={`${car.brand} ${car.model} (${car.version})`}
              className="car-stage-photo"
              width={640}
              height={360}
              {...({ fetchpriority: 'high' } as React.ImgHTMLAttributes<HTMLImageElement>)}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <img
              src={imageSrc}
              alt={`${car.brand} ${car.model} (${car.version})`}
              className="car-stage-photo"
              width={640}
              height={360}
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          )}
          <div className="car-photo-vignette" aria-hidden="true" />
        </div>
      )}

      {/* Top micro metadata bar overlaid on the photo */}
      <div className="car-stage-meta">
        {/* Authentic Austrian EU License Plate (Grünes Kennzeichen for BEV) */}
        <div
          className={`at-plate ${isBev ? 'at-plate--ev' : ''}`}
          title={
            isBev
              ? 'Österreichisches Grünes E-Kennzeichen (0 g/km CO₂ · 0 % NoVA · 0 % Sachbezug)'
              : 'Österreichisches KFZ-Kennzeichen'
          }
        >
          <span className="at-plate-eu">A</span>
          <span className="at-plate-code">{plateInfo.code}</span>
          <span
            className="at-plate-crest"
            style={{ backgroundColor: plateInfo.coatColor }}
          />
          <span className="at-plate-num">
            {numPart} {suffix}
          </span>
        </div>

        <div className="car-stage-pills">
          {car.wltpRangeKm !== null && (
            <span className="stage-spec-chip">
              <strong>{car.wltpRangeKm}</strong> km WLTP
            </span>
          )}
          <span
            className="stage-spec-chip"
            title="30-Minuten-Nenndauerleistung (Feld P.2) / Peak"
          >
            <strong>{car.continuousPowerKw}</strong>/{car.peakPowerKw} kW
          </span>
        </div>
      </div>

      {/* Bottom Austrian Fiscal Badge on Photo */}
      <div className="car-stage-bottom-badge">
        {isBev ? (
          <span className="stage-fiscal-pill stage-fiscal-pill--ev">
            0 % NoVA · 0 % Sachbezug
          </span>
        ) : (
          <span className="stage-fiscal-pill">
            WLTP {car.co2GKm} g CO₂/km
          </span>
        )}
      </div>
    </div>
  );
};

interface ZulassungsscheinCardProps {
  car: CarVariant;
  lang: Language;
  motorTaxMonthlyEur: number;
  novaPercent: number;
}

export const ZulassungsscheinCard: React.FC<ZulassungsscheinCardProps> = ({
  car,
  lang,
  motorTaxMonthlyEur,
  novaPercent,
}) => {
  return (
    <div className="zulassungsschein-card">
      <div className="zs-header">
        <div>
          <span className="zs-kicker">REPUBLIK ÖSTERREICH · ZULASSUNGSSCHEIN TEIL I</span>
          <h3 className="zs-title">
            {lang === 'de'
              ? 'Steuerrelevante Fahrzeugdaten (BMF / VersStG 2025)'
              : 'Skattegrundande fordonsdata i österrikiska regbeviset'}
          </h3>
        </div>
        <span className="spec-pill">AT · § 6 VersStG</span>
      </div>

      <div className="zs-grid">
        <div className="zs-cell">
          <span className="zs-field-code">Feld P.2 (Dauerleistung)</span>
          <strong className="zs-field-val">{car.continuousPowerKw} kW</strong>
          <span className="zs-field-note">
            {car.powertrain === 'bev'
              ? lang === 'de'
                ? `Abzgl. 45 kW Freibetrag = ${Math.max(0, car.continuousPowerKw - 45)} kW steuerpflichtig`
                : `Minus 45 kW fribelopp = ${Math.max(0, car.continuousPowerKw - 45)} kW beskattas`
              : lang === 'de'
                ? 'Bei E-Autos zählt 30-Min.-Leistung'
                : 'För elbil räknas 30-min effekt'}
          </span>
        </div>

        <div className="zs-cell">
          <span className="zs-field-code">Feld P.2 Max (Peak)</span>
          <strong className="zs-field-val">
            {car.peakPowerKw} kW ({Math.round(car.peakPowerKw * 1.36)} PS)
          </strong>
          <span className="zs-field-note">
            {car.powertrain === 'bev'
              ? lang === 'de'
                ? 'Spitzenleistung (steuerfrei beim BEV!)'
                : 'Toppeffekt (beskattas ej för elbil!)'
              : lang === 'de'
                ? `Abzgl. 61 kW = ${Math.max(0, car.peakPowerKw - 61)} kW steuerpfl.`
                : `Minus 61 kW = ${Math.max(0, car.peakPowerKw - 61)} kW beskattas`}
          </span>
        </div>

        <div className="zs-cell">
          <span className="zs-field-code">Feld G (Eigengewicht)</span>
          <strong className="zs-field-val">{car.kerbMassKg} kg</strong>
          <span className="zs-field-note">
            {car.powertrain === 'bev'
              ? lang === 'de'
                ? `Abzgl. 900 kg = ${Math.max(0, car.kerbMassKg - 900)} kg steuerpflichtig`
                : `Minus 900 kg = ${Math.max(0, car.kerbMassKg - 900)} kg beskattas`
              : lang === 'de'
                ? 'Nur bei E-Autos steuerrelevant'
                : 'Styr endast elbilsskatten'}
          </span>
        </div>

        <div className="zs-cell">
          <span className="zs-field-code">Feld V.7 (CO₂ WLTP)</span>
          <strong className="zs-field-val">{car.co2GKm} g/km</strong>
          <span className="zs-field-note">
            NoVA: {novaPercent} % · VersSt: {Math.round(motorTaxMonthlyEur)} €/Mon.
          </span>
        </div>
      </div>
    </div>
  );
};
