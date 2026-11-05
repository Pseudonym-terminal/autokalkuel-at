import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Language } from './types';
import {
  CountryCode,
  SituationId,
  FahrwertFormKey,
  FahrwertScenarioResult,
  ProvenanceStatus,
  DesignDirection,
  FuelType,
  BodyCategory,
  CarOverrides,
  PALETTES,
  FAHRWERT_CARS,
  COUNTRIES,
  SITUATIONS,
  calcFahrwertCar,
  fmtCurrency,
  fmtSignedCurrency,
} from './engine/fahrwertEngine';

type ScreenId = 'start' | 'list' | 'detail' | 'compare' | 'calc';
type ListLayoutMode = 'cards' | 'table';
type SortMode = 'total' | 'price' | 'range';
type CalcTabId = 'dw' | 'offer';

const ST_LABELS: Record<Language, Record<ProvenanceStatus, string>> = {
  de: {
    gesetz: 'Gesetz',
    markt: 'Marktpreis',
    schaetzung: 'Schätzung',
    angebot: 'Angebot',
    user: 'Deine Angabe',
  },
  sv: {
    gesetz: 'Lagstadgat',
    markt: 'Marknadspris',
    schaetzung: 'Uppskattning',
    angebot: 'Erbjudande',
    user: 'Din uppgift',
  },
};

const FUEL_LABELS: Record<Language, Record<FuelType, string>> = {
  de: {
    bev: 'Elektro',
    phev: 'Plug-in-Hybrid',
    hev: 'Hybrid',
    petrol: 'Benzin',
    diesel: 'Diesel',
  },
  sv: {
    bev: 'Elbil (BEV)',
    phev: 'Laddhybrid (PHEV)',
    hev: 'Fullhybrid (HEV)',
    petrol: 'Bensin',
    diesel: 'Diesel',
  },
};

const BODY_LABELS: Record<Language, Record<BodyCategory, string>> = {
  de: {
    suv: 'SUV',
    hatchback: 'Kompakt',
    estate: 'Kombi',
    sedan: 'Limousine',
  },
  sv: {
    suv: 'SUV',
    hatchback: 'Halvkombi',
    estate: 'Kombi',
    sedan: 'Sedan',
  },
};

export const App: React.FC = () => {
  // Visual direction: 'fintech' (Light Figtree) or 'premium' (Dark Archivo)
  const [direction, setDirection] = useState<DesignDirection>(() => {
    try {
      const saved = localStorage.getItem('fahrwert_direction');
      if (saved === 'fintech' || saved === 'premium') return saved;
    } catch {
      // ignore
    }
    return 'fintech';
  });

  const [country, setCountry] = useState<CountryCode>('AT');
  const [lang, setLang] = useState<Language>('de');
  const [screen, setScreen] = useState<ScreenId>('start');
  const [sit, setSit] = useState<SituationId>('ordination');
  const [km, setKm] = useState<number>(15000);
  const [term, setTerm] = useState<number>(48);
  const [marg, setMarg] = useState<number | null>(null);
  const [bizSharePct, setBizSharePct] = useState<number>(80);
  const [commute, setCommute] = useState<number>(20);

  // Filters & sorting on 'list' screen
  const [fuels, setFuels] = useState<FuelType[]>(['bev', 'phev', 'hev', 'petrol', 'diesel']);
  const [bodies, setBodies] = useState<BodyCategory[]>(['suv', 'hatchback', 'estate', 'sedan']);
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minRange, setMinRange] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(90000);
  const [onlyOffers, setOnlyOffers] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortMode>('total');
  const [listLayout, setListLayout] = useState<ListLayoutMode>('cards');

  // Detail & Compare state
  const [detailId, setDetailId] = useState<string>('id7');
  const [detailForm, setDetailForm] = useState<FahrwertFormKey | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>(['enyaq', 'id7', 'ioniq5']);
  const [overridesMap, setOverridesMap] = useState<Record<string, CarOverrides>>({});
  const [leadSentFor, setLeadSentFor] = useState<Record<string, boolean>>({});
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  // Calculator ('calc') state
  const [calcTab, setCalcTab] = useState<CalcTabId>('dw');
  const [dwPrice, setDwPrice] = useState<number>(52000);
  const [offerList, setOfferList] = useState<number>(50990);
  const [offerRate, setOfferRate] = useState<number>(439);
  const [offerDown, setOfferDown] = useState<number>(3000);
  const [offerTerm, setOfferTerm] = useState<number>(48);
  const [offerKm, setOfferKm] = useState<number>(15000);

  // Quick-Situation Dialog ref
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const PAL = PALETTES[direction];
  const k = COUNTRIES[country];
  const sitDef = SITUATIONS[sit];
  const effMarg = marg ?? k.marg;

  useEffect(() => {
    document.documentElement.setAttribute('data-direction', direction);
    document.body.classList.add('fahrwert-body');
    document.body.style.backgroundColor = PAL.bg;
    document.body.style.color = PAL.ink;
    document.body.style.fontFamily = PAL.fontFamily;
    try {
      localStorage.setItem('fahrwert_direction', direction);
    } catch {
      // ignore
    }
  }, [direction, PAL]);

  // Same-Document View Transitions helper (modern-web-guidance: same-document-transitions)
  const navigateWithTransition = (updateFn: () => void) => {
    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!docWithVT.startViewTransition) {
      updateFn();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      requestAnimationFrame(() => {
        const heading = document.getElementById('view-main-heading');
        heading?.focus({ preventScroll: true });
      });
      return;
    }
    const transition = docWithVT.startViewTransition(() => {
      flushSync(() => {
        updateFn();
      });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    transition.finished.finally(() => {
      const heading = document.getElementById('view-main-heading');
      heading?.focus({ preventScroll: true });
    });
  };

  // Top-Layer Dialog close helper with fallback (modern-web-guidance: animate-to-from-top-layer)
  const closeTopLayer = (el: HTMLDialogElement | null) => {
    if (!el || !el.open) return;
    el.dataset.closing = '';
    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      delete el.dataset.closing;
      if (el.open) el.close();
    };
    const fallbackTimer = window.setTimeout(finish, 300);
    el.addEventListener(
      'transitionend',
      () => {
        window.clearTimeout(fallbackTimer);
        finish();
      },
      { once: true }
    );
  };

  // Backdrop click fallback for <dialog closedby="any"> (modern-web-guidance: light-dismiss-a-dialog)
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!('closedBy' in HTMLDialogElement.prototype) && e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!isInDialog) {
        closeTopLayer(dialog);
      }
    }
  };

  const calcInput = useMemo(
    () => ({
      term,
      km,
      bizSharePct,
      marg,
      commute,
      sit,
      lang,
    }),
    [term, km, bizSharePct, marg, commute, sit, lang]
  );

  // Calculate all 24 cars & pick best form for user's situation
  const evaluatedCars = useMemo(() => {
    return FAHRWERT_CARS.map((car) => {
      const calc = calcFahrwertCar(car, k, calcInput, overridesMap[car.id]);
      const allowedForms = sitDef.forms.map((fk) => calc[fk]);
      const best = allowedForms.reduce((a, b) => (a.total <= b.total ? a : b));
      const topProv: ProvenanceStatus = best.hasOffer
        ? best.lines.some((x) => x.st === 'user')
          ? 'user'
          : 'angebot'
        : best.key === 'dienstwagen'
          ? 'gesetz'
          : 'schaetzung';
      return {
        car,
        calc,
        best,
        topProv,
      };
    });
  }, [k, calcInput, overridesMap, sitDef]);

  const top3Cars = useMemo(() => {
    return [...evaluatedCars].sort((a, b) => a.best.total - b.best.total).slice(0, 3);
  }, [evaluatedCars]);

  const allBrands = useMemo(() => {
    return Array.from(new Set(FAHRWERT_CARS.map((c) => c.brand))).sort((a, b) =>
      a.localeCompare(b, 'de')
    );
  }, []);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return evaluatedCars
      .filter(({ car }) => {
        if (!fuels.includes(car.fuel)) return false;
        if (!bodies.includes(car.body)) return false;
        if (selectedBrand !== 'ALL' && car.brand !== selectedBrand) return false;
        if (q && !`${car.brand} ${car.model}`.toLowerCase().includes(q)) return false;
        if (car.range < minRange) return false;
        if (car.price > maxPrice) return false;
        if (onlyOffers && !car.offer) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'total') return a.best.total - b.best.total;
        if (sortBy === 'price') return a.car.price - b.car.price;
        return b.car.range - a.car.range;
      });
  }, [evaluatedCars, fuels, bodies, selectedBrand, searchQuery, minRange, maxPrice, onlyOffers, sortBy]);

  const setCarOverride = (carId: string, key: keyof CarOverrides, val: number | null) => {
    setOverridesMap((prev) => {
      const nextCar = { ...(prev[carId] || {}) };
      if (val === null || Number.isNaN(val)) {
        delete nextCar[key];
      } else {
        nextCar[key] = val;
      }
      return { ...prev, [carId]: nextCar };
    });
  };

  const resetCarOverrides = (carId: string) => {
    setOverridesMap((prev) => {
      const copy = { ...prev };
      delete copy[carId];
      return copy;
    });
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const openDetail = (id: string, formKey?: FahrwertFormKey) => {
    navigateWithTransition(() => {
      setDetailId(id);
      setDetailForm(formKey || null);
      setScreen('detail');
    });
  };

  // Simulated PDF leasing offer parser (reads filename or applies realistic Porsche Bank / Leasing offer)
  const handlePdfOfferUpload = (e: React.ChangeEvent<HTMLInputElement>, targetCarId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const carObj = FAHRWERT_CARS.find((c) => c.id === (targetCarId || detailId)) || FAHRWERT_CARS[0];
    const listPriceLocal = Math.round(carObj.price * k.pf);
    const extractedRate = carObj.offer
      ? Math.round(carObj.offer.rate * k.pf * 0.96)
      : Math.round(listPriceLocal * 0.0082);
    const extractedDown = carObj.offer ? Math.round(carObj.offer.down * k.pf) : 3000;

    if (targetCarId) {
      setCarOverride(targetCarId, 'lease', extractedRate);
      setCarOverride(targetCarId, 'leaseDown', extractedDown);
      setDetailForm('leasing');
    } else {
      setOfferList(listPriceLocal);
      setOfferRate(extractedRate);
      setOfferDown(extractedDown);
    }
    setPdfNotice(
      lang === 'sv'
        ? `Läste in "${file.name}": ${fmtCurrency(extractedRate, k)}/mån (${fmtCurrency(extractedDown, k)} kontantinsats)`
        : `„${file.name}“ eingelesen: ${fmtCurrency(extractedRate, k)}/Mon. (${fmtCurrency(extractedDown, k)} Anzahlung)`
    );
    e.target.value = '';
  };

  const renderBadge = (status: ProvenanceStatus) => {
    const stToken = PAL.st[status];
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: PAL.radiusBadge,
          background: stToken.bg,
          color: stToken.fg,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          display: 'inline-block',
        }}
      >
        {ST_LABELS[lang][status]}
      </span>
    );
  };

  const countryName = lang === 'sv' ? k.nameSv : k.nameDe;

  // ============================================================================
  // SCREEN 1: START
  // ============================================================================
  const renderStartScreen = () => {
    const provItems: Array<[ProvenanceStatus, string, string]> =
      lang === 'sv'
        ? [
            ['gesetz', 'Lagstadgat', 'Skatt, NoVA, Sachbezug och 40 000 €-gräns direkt ur lagtext.'],
            ['markt', 'Marknadspris', 'El- och bränslepris från officiell statistik (E-Control / BDEW).'],
            ['schaetzung', 'Uppskattning', 'Värdeminskning, försäkring och service – visas med osäkerhetsspann.'],
            ['angebot', 'Erbjudande', 'Verklig leasingoffert från finanspartner (Porsche Bank m.fl.).'],
            ['user', 'Din uppgift', 'Värde som du själv har matat in eller laddat upp från offert.'],
          ]
        : [
            ['gesetz', 'Gesetz', 'Steuern, NoVA, Sachbezug und Freibeträge direkt aus dem Gesetz.'],
            ['markt', 'Marktpreis', 'Strom- und Spritpreis aus amtlicher Statistik.'],
            ['schaetzung', 'Schätzung', 'Wertverlust, Versicherung, Wartung — mit Bandbreite ausgewiesen.'],
            ['angebot', 'Angebot', 'Konkretes Leasingangebot eines Finanzierungspartners.'],
            ['user', 'Deine Angabe', 'Wert, den du selbst eingetragen hast.'],
          ];

    return (
      <div>
        {/* HERO */}
        <section
          className="fw-hero-grid"
          style={{
            padding: '56px 0 44px',
            borderBottom: `1px solid ${PAL.line}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: direction === 'fintech' ? 600 : 700,
                color: PAL.accent,
                letterSpacing: direction === 'fintech' ? '0.08em' : '0.12em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              {lang === 'sv' ? `TOTALKOSTNAD · ${countryName}` : `VOLLKOSTEN · ${countryName}`}
            </div>
            <h1
              id="view-main-heading"
              tabIndex={-1}
              style={{
                fontSize: direction === 'fintech' ? 50 : 52,
                fontWeight: direction === 'fintech' ? 700 : 800,
                fontStretch: PAL.headingStretch,
                letterSpacing: '-0.03em',
                lineHeight: 1.04,
                margin: '0 0 18px',
                outline: 'none',
              }}
            >
              {lang === 'sv'
                ? 'Vad din nästa bil faktiskt kostar per månad.'
                : 'Was dein nächstes Auto wirklich kostet.'}
            </h1>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.55,
                color: PAL.subInk,
                margin: 0,
                maxWidth: 540,
              }}
            >
              {lang === 'sv'
                ? 'Kontantköp, privatleasing, tjänstebil eller momsbefriad Sjukvård / Ordination (§ 6 UStG) – uträknat som verklig nettokostnad efter skatt per månad.'
                : 'Kauf, Leasing, Dienstwagen, USt-befreite Ordination (§ 6 UStG) oder GmbH — gerechnet als echte Nettokosten pro Monat. Jede Zahl zeigt ihre Herkunft.'}
            </p>
          </div>
          <div
            onClick={() => openDetail('id7')}
            style={{
              background: PAL.stageBg,
              borderRadius: PAL.radiusCard,
              padding: '24px 28px',
              aspectRatio: '16/10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              border: direction === 'fintech' ? `1px solid ${PAL.line}` : 'none',
            }}
          >
            {/* LCP Hero Image: fetchpriority="high", no loading="lazy" (modern-web-guidance: optimize-image-priority) */}
            <img
              src="cars/vw-id-7-tourer.jpg?v=studio2"
              alt="VW ID.7 Tourer Pro S"
              fetchPriority="high"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: 18,
                fontSize: 12,
                color: direction === 'fintech' ? PAL.muted : '#5A5852',
                fontWeight: 600,
              }}
            >
              VW ID.7 Tourer Pro S →
            </div>
          </div>
        </section>

        {/* STEP 01: DEINE SITUATION */}
        <section style={{ padding: '44px 0', borderBottom: `1px solid ${PAL.line}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: PAL.accent,
                letterSpacing: '0.08em',
              }}
            >
              01
            </span>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontStretch: direction === 'premium' ? '108%' : '100%',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {lang === 'sv' ? 'Din skattesituation' : 'Deine Situation'}
            </h2>
            <span style={{ fontSize: 14, color: PAL.muted }}>
              {lang === 'sv'
                ? 'avgör vilka ägandeformer och skatteregler som gäller för dig'
                : 'bestimmt, welche Halteformen für dich gerechnet werden'}
            </span>
          </div>

          <div className="fw-sit-grid">
            {(Object.values(SITUATIONS) as Array<(typeof SITUATIONS)[SituationId]>).map((x) => {
              const on = sit === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setSit(x.id)}
                  style={{
                    textAlign: 'left',
                    padding: 22,
                    borderRadius: direction === 'fintech' ? 16 : 12,
                    cursor: 'pointer',
                    background: on ? PAL.sitOn : PAL.card,
                    color: on ? PAL.sitOnFg : PAL.ink,
                    border: `1.5px solid ${on ? PAL.sitOn : PAL.line}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 156,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          fontStretch: direction === 'premium' ? '106%' : '100%',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {lang === 'sv' ? x.titleSv : x.titleDe}
                      </span>
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 99,
                          flexShrink: 0,
                          border: `2px solid ${on ? PAL.accent : PAL.faint}`,
                          background: on ? PAL.accent : 'transparent',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: on ? PAL.sitOnSub : PAL.muted,
                        lineHeight: 1.45,
                      }}
                    >
                      {lang === 'sv' ? x.descSv : x.descDe}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                    {x.forms.map((fk) => {
                      const lbl =
                        fk === 'kauf'
                          ? lang === 'sv'
                            ? 'Kontantköp'
                            : 'Barkauf'
                          : fk === 'leasing'
                            ? 'Privatleasing'
                            : fk === 'dienstwagen'
                              ? lang === 'sv'
                                ? k.dwSv
                                : k.dwDe
                              : x.isOrdination
                                ? lang === 'sv'
                                  ? k.ordinationSv
                                  : k.ordinationDe
                                : lang === 'sv'
                                  ? k.firmSv
                                  : k.firmDe;
                      return (
                        <span
                          key={fk}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: direction === 'fintech' ? 99 : 4,
                            background: on
                              ? direction === 'fintech'
                                ? 'rgba(255,255,255,0.12)'
                                : 'rgba(12,12,13,0.12)'
                              : PAL.bg,
                            color: on ? PAL.sitOnFg : PAL.subInk,
                          }}
                        >
                          {lbl}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 02: WIE DU FÄHRST */}
        <section style={{ padding: '44px 0', borderBottom: `1px solid ${PAL.line}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: PAL.accent, letterSpacing: '0.08em' }}>
              02
            </span>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontStretch: direction === 'premium' ? '108%' : '100%',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {lang === 'sv' ? 'Hur du kör' : 'Wie du fährst'}
            </h2>
          </div>

          <div
            className="fw-drive-grid"
            style={{
              background: PAL.card,
              border: `1px solid ${PAL.line}`,
              borderRadius: direction === 'fintech' ? 16 : 12,
              padding: 24,
            }}
          >
            {/* KM / Jahr */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: PAL.muted, fontWeight: 500 }}>
                  {lang === 'sv' ? 'Körsträcka per år' : 'Kilometer pro Jahr'}
                </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {km.toLocaleString(k.locale)} km
                </span>
              </div>
              <input
                type="range"
                min={5000}
                max={40000}
                step={2500}
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                style={{ width: '100%', accentColor: PAL.accent }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: PAL.faint,
                  marginTop: 4,
                }}
              >
                <span>5.000</span>
                <span>20.000</span>
                <span>40.000</span>
              </div>
            </div>

            {/* Haltedauer */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: PAL.muted, fontWeight: 500 }}>
                  {lang === 'sv' ? 'Innehavstid' : 'Haltedauer'}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {term} {lang === 'sv' ? 'månader' : 'Monate'} ({term / 12} J.)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[24, 36, 48, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTerm(m)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: direction === 'fintech' ? 8 : 6,
                      cursor: 'pointer',
                      border: `1px solid ${term === m ? PAL.selBg : PAL.line}`,
                      background: term === m ? PAL.selBg : PAL.inputBg,
                      color: term === m ? PAL.selFg : PAL.ink,
                    }}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>

            {/* Grenzsteuersatz */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: PAL.muted, fontWeight: 500 }}>
                  {lang === 'sv' ? 'Marginalskatt (ESt)' : 'Grenzsteuersatz'}
                </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{effMarg} %</span>
              </div>
              <input
                type="range"
                min={20}
                max={60}
                step={2}
                value={effMarg}
                onChange={(e) => setMarg(Number(e.target.value))}
                style={{ width: '100%', accentColor: PAL.accent }}
              />
              <div style={{ fontSize: 11, color: PAL.faint, marginTop: 4 }}>
                {lang === 'sv'
                  ? `för ${k.benNameSv} & skatteavdrag i rörelsen`
                  : `für ${k.benNameDe} & Betriebsausgabe`}
              </div>
            </div>

            {/* Business share when Ordination or Selbstständig */}
            {(sit === 'ordination' || sit === 'selbst') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: PAL.muted, fontWeight: 500 }}>
                    {lang === 'sv' ? 'Tjänsteandel i rörelsen' : 'Betriebliche Nutzung'}
                  </span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{bizSharePct} %</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={bizSharePct}
                  onChange={(e) => setBizSharePct(Number(e.target.value))}
                  style={{ width: '100%', accentColor: PAL.accent }}
                />
                <div style={{ fontSize: 11, color: PAL.faint, marginTop: 4 }}>
                  {sit === 'ordination'
                    ? lang === 'sv'
                      ? '0 € momsavdrag (§ 6 UStG) · Brutto-AfA + 20 % Öko-IFB'
                      : '0 € USt-Abzug (§ 6 UStG) · Brutto-AfA + 20 % Öko-IFB'
                    : lang === 'sv'
                      ? 'Privatandel (100 % − tjänsteandel) tas ur avdraget'
                      : 'Privatanteil wird steuerlich ausgeschieden'}
                </div>
              </div>
            )}

            {/* Arbeitsweg for DE Dienstwagen */}
            {country === 'DE' && sit === 'angestellt' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: PAL.muted, fontWeight: 500 }}>Arbeitsweg einfach</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{commute} km</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={commute}
                  onChange={(e) => setCommute(Number(e.target.value))}
                  style={{ width: '100%', accentColor: PAL.accent }}
                />
                <div style={{ fontSize: 11, color: PAL.faint, marginTop: 4 }}>0,03 %-Zuschlag pro km</div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 03: AM GÜNSTIGSTEN FÜR DICH */}
        <section style={{ padding: '44px 0', borderBottom: `1px solid ${PAL.line}` }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 22,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: PAL.accent, letterSpacing: '0.08em' }}>
                03
              </span>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  fontStretch: direction === 'premium' ? '108%' : '100%',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {lang === 'sv' ? 'Mest prisvärda för dig just nu' : 'Am günstigsten für dich'}
              </h2>
              <span style={{ fontSize: 13, color: PAL.muted }}>
                {lang === 'sv' ? sitDef.titleSv : sitDef.titleDe} · {km.toLocaleString(k.locale)} km/J. · {term} Mon.
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigateWithTransition(() => setScreen('list'))}
              style={{
                padding: '10px 18px',
                borderRadius: PAL.radiusBadge,
                border: 'none',
                cursor: 'pointer',
                background: PAL.accent,
                color: PAL.accentFg,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {lang === 'sv'
                ? `Alla ${FAHRWERT_CARS.length} modeller efter månadskostnad →`
                : `Alle ${FAHRWERT_CARS.length} Modelle nach Monatskosten →`}
            </button>
          </div>

          <div className="fw-top3-grid">
            {top3Cars.map(({ car, best, topProv }) => (
              <div
                key={car.id}
                onClick={() => openDetail(car.id)}
                style={{
                  background: PAL.card,
                  border: `1px solid ${PAL.line}`,
                  borderRadius: direction === 'fintech' ? 18 : 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    aspectRatio: '16/10',
                    background: PAL.stageBg,
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={`cars/${car.img}?v=studio2`}
                    alt={`${car.brand} ${car.model}`}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      mixBlendMode: 'multiply',
                    }}
                  />
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: PAL.muted, fontWeight: 500 }}>{car.brand}</div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 700,
                      fontStretch: direction === 'premium' ? '106%' : '100%',
                      letterSpacing: '-0.02em',
                      marginBottom: 14,
                    }}
                  >
                    {car.model}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: direction === 'fintech' ? 700 : 800,
                          fontStretch: direction === 'premium' ? '108%' : '100%',
                          letterSpacing: '-0.03em',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtCurrency(best.total, k)}
                        <span style={{ fontSize: 13, fontWeight: 500, color: PAL.muted }}> /Mon.</span>
                      </div>
                      <div style={{ fontSize: 12, color: PAL.muted, marginTop: 2 }}>
                        {best.label}
                        {best.span > 5
                          ? ` · ${fmtCurrency(best.lo, k)}–${fmtCurrency(best.hi, k)}`
                          : ''}
                      </div>
                    </div>
                    {renderBadge(topProv)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TRANSPARENCY / PROVENANCE SECTION */}
        <section style={{ padding: '44px 0' }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontStretch: direction === 'premium' ? '108%' : '100%',
              margin: '0 0 14px',
            }}
          >
            {lang === 'sv' ? 'Varje siffra har en tydlig källa' : 'Jede Zahl mit Herkunft'}
          </h3>
          <div className="fw-prov-grid">
            {provItems.map(([key, title, desc]) => (
              <div
                key={key}
                style={{
                  background: PAL.card,
                  border: `1px solid ${PAL.line}`,
                  borderRadius: direction === 'fintech' ? 12 : 8,
                  padding: 16,
                }}
              >
                <div style={{ marginBottom: 8 }}>{renderBadge(key)}</div>
                <div style={{ fontSize: 12, color: PAL.muted, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  // ============================================================================
  // SCREEN 2: AUTOS (LIST & RESPONSIVE CONTAINER TABLE)
  // ============================================================================
  const renderListScreen = () => {
    const toggleFuel = (f: FuelType) => {
      setFuels((prev) =>
        prev.includes(f) ? (prev.length > 1 ? prev.filter((x) => x !== f) : prev) : [...prev, f]
      );
    };
    const toggleBody = (b: BodyCategory) => {
      setBodies((prev) =>
        prev.includes(b) ? (prev.length > 1 ? prev.filter((x) => x !== b) : prev) : [...prev, b]
      );
    };

    return (
      <div className="fw-list-layout" style={{ paddingTop: 28 }}>
        {/* LEFT FILTER SIDEBAR */}
        <aside
          style={{
            background: PAL.card,
            border: `1px solid ${PAL.line}`,
            borderRadius: direction === 'fintech' ? 16 : 12,
            padding: 20,
            position: 'sticky',
            top: 80,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <input
              type="search"
              placeholder={lang === 'sv' ? 'Sök märke eller modell...' : 'Marke oder Modell suchen...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 11px',
                borderRadius: direction === 'fintech' ? 10 : 6,
                border: `1px solid ${PAL.line}`,
                background: PAL.inputBg,
                color: PAL.ink,
                fontSize: 12.5,
                fontWeight: 500,
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: PAL.muted, marginBottom: 8 }}>
              {lang === 'sv' ? 'MÄRKE' : 'MARKE'}
            </div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: direction === 'fintech' ? 10 : 6,
                border: `1px solid ${PAL.line}`,
                background: PAL.inputBg,
                color: PAL.ink,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <option value="ALL">
                {lang === 'sv' ? `Alla märken (${allBrands.length})` : `Alle Marken (${allBrands.length})`}
              </option>
              {allBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: PAL.muted, marginBottom: 10 }}>
            {lang === 'sv' ? 'DRIVLINA' : 'ANTRIEB'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {(['bev', 'phev', 'hev', 'petrol', 'diesel'] as FuelType[]).map((f) => {
              const on = fuels.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFuel(f)}
                  style={{
                    padding: '6px 11px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: PAL.radiusBadge,
                    cursor: 'pointer',
                    border: `1px solid ${on ? PAL.selBg : PAL.line}`,
                    background: on ? PAL.selBg : PAL.offBg,
                    color: on ? PAL.selFg : PAL.offFg,
                  }}
                >
                  {FUEL_LABELS[lang][f]}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: PAL.muted, marginBottom: 10 }}>
            {lang === 'sv' ? 'KAROSS' : 'KAROSSERIE'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {(['suv', 'hatchback', 'estate', 'sedan'] as BodyCategory[]).map((b) => {
              const on = bodies.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBody(b)}
                  style={{
                    padding: '6px 11px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: PAL.radiusBadge,
                    cursor: 'pointer',
                    border: `1px solid ${on ? PAL.selBg : PAL.line}`,
                    background: on ? PAL.selBg : PAL.offBg,
                    color: on ? PAL.selFg : PAL.offFg,
                  }}
                >
                  {BODY_LABELS[lang][b]}
                </button>
              );
            })}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: PAL.muted, fontWeight: 600 }}>
                {lang === 'sv' ? 'RÄCKVIDD MIN.' : 'REICHWEITE MIN.'}
              </span>
              <span style={{ fontWeight: 700 }}>{minRange} km</span>
            </div>
            <input
              type="range"
              min={0}
              max={650}
              step={50}
              value={minRange}
              onChange={(e) => setMinRange(Number(e.target.value))}
              style={{ width: '100%', accentColor: PAL.accent }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: PAL.muted, fontWeight: 600 }}>
                {lang === 'sv' ? 'LISTPRIS MAX.' : 'LISTENPREIS MAX.'}
              </span>
              <span style={{ fontWeight: 700 }}>{fmtCurrency(maxPrice * k.pf, k)}</span>
            </div>
            <input
              type="range"
              min={25000}
              max={90000}
              step={2500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%', accentColor: PAL.accent }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 18,
            }}
          >
            <input
              type="checkbox"
              checked={onlyOffers}
              onChange={(e) => setOnlyOffers(e.target.checked)}
              style={{ accentColor: PAL.accent }}
            />
            <span>{lang === 'sv' ? 'Endast med leasingerbjudande' : 'Nur mit Leasingangebot'}</span>
          </label>

          <div style={{ borderTop: `1px solid ${PAL.line}`, paddingTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: PAL.muted, fontWeight: 600 }}>KM / JAHR</span>
              <span style={{ fontWeight: 700 }}>{km.toLocaleString(k.locale)}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={40000}
              step={2500}
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
              style={{ width: '100%', accentColor: PAL.accent, marginBottom: 14 }}
            />

            <div style={{ fontSize: 12, color: PAL.muted, fontWeight: 600, marginBottom: 6 }}>
              {lang === 'sv' ? 'INNEHAVSTID' : 'HALTEDAUER'}
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {[24, 36, 48, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTerm(m)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    cursor: 'pointer',
                    border: `1px solid ${term === m ? PAL.selBg : PAL.line}`,
                    background: term === m ? PAL.selBg : PAL.offBg,
                    color: term === m ? PAL.selFg : PAL.ink,
                  }}
                >
                  {m}M
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: PAL.muted, fontWeight: 600 }}>
                {lang === 'sv' ? 'MARGINALSKATT' : 'GRENZSTEUER'}
              </span>
              <span style={{ fontWeight: 700 }}>{effMarg} %</span>
            </div>
            <input
              type="range"
              min={20}
              max={60}
              step={2}
              value={effMarg}
              onChange={(e) => setMarg(Number(e.target.value))}
              style={{ width: '100%', accentColor: PAL.accent }}
            />
          </div>
        </aside>

        {/* MAIN AREA */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h1
                id="view-main-heading"
                tabIndex={-1}
                style={{
                  fontSize: 28,
                  fontWeight: direction === 'fintech' ? 700 : 800,
                  fontStretch: direction === 'premium' ? '110%' : '100%',
                  letterSpacing: '-0.025em',
                  margin: 0,
                  outline: 'none',
                }}
              >
                {filteredCars.length} {lang === 'sv' ? 'Modeller' : 'Modelle'}
              </h1>
              <div style={{ fontSize: 13, color: PAL.muted }}>
                {lang === 'sv' ? 'Nettokostnad/mån för ' : 'Nettokosten/Monat für '}
                <strong style={{ color: PAL.ink }}>
                  {lang === 'sv' ? sitDef.titleSv : sitDef.titleDe}
                </strong>{' '}
                · {km.toLocaleString(k.locale)} km/J. · {term} Mon.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: PAL.muted }}>
                  {lang === 'sv' ? 'Sortera:' : 'Sortieren:'}
                </span>
                {(
                  [
                    ['total', lang === 'sv' ? 'Månadskostnad' : 'Monatskosten'],
                    ['price', lang === 'sv' ? 'Listpris' : 'Preis'],
                    ['range', lang === 'sv' ? 'Räckvidd' : 'Reichweite'],
                  ] as Array<[SortMode, string]>
                ).map(([sk, sl]) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => setSortBy(sk)}
                    style={{
                      padding: '6px 11px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: PAL.radiusBadge,
                      cursor: 'pointer',
                      border: `1px solid ${sortBy === sk ? PAL.selBg : PAL.line}`,
                      background: sortBy === sk ? PAL.selBg : PAL.card,
                      color: sortBy === sk ? PAL.selFg : PAL.offFg,
                    }}
                  >
                    {sl}
                  </button>
                ))}
              </div>

              {/* View Mode Switcher: Cards vs Container-Query Table */}
              <div
                style={{
                  display: 'inline-flex',
                  border: `1px solid ${PAL.line}`,
                  borderRadius: PAL.radiusBadge,
                  padding: 2,
                  background: PAL.card,
                }}
              >
                <button
                  type="button"
                  onClick={() => setListLayout('cards')}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: PAL.radiusBadge,
                    cursor: 'pointer',
                    background: listLayout === 'cards' ? PAL.selBg : 'transparent',
                    color: listLayout === 'cards' ? PAL.selFg : PAL.muted,
                  }}
                >
                  {lang === 'sv' ? 'Kort' : 'Karten'}
                </button>
                <button
                  type="button"
                  onClick={() => setListLayout('table')}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: PAL.radiusBadge,
                    cursor: 'pointer',
                    background: listLayout === 'table' ? PAL.selBg : 'transparent',
                    color: listLayout === 'table' ? PAL.selFg : PAL.muted,
                  }}
                >
                  {lang === 'sv' ? 'Tabell' : 'Tabelle'}
                </button>
              </div>
            </div>
          </div>

          {listLayout === 'cards' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(295px, 1fr))',
                gap: 16,
              }}
            >
              {filteredCars.map(({ car, calc, best, topProv }, idx) => {
                const inCmp = compareIds.includes(car.id);
                const otherForms = sitDef.forms
                  .map((fk) => calc[fk])
                  .filter((f) => f.key !== best.key);

                return (
                  <div
                    key={car.id}
                    style={{
                      background: PAL.card,
                      border: `1px solid ${PAL.line}`,
                      borderRadius: direction === 'fintech' ? 18 : 12,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      onClick={() => openDetail(car.id)}
                      style={{
                        aspectRatio: '16/10',
                        background: PAL.stageBg,
                        padding: '14px 20px',
                        position: 'relative',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={`cars/${car.img}?v=studio2`}
                        alt={`${car.brand} ${car.model}`}
                        fetchPriority={idx === 0 ? 'high' : undefined}
                        loading={idx === 0 ? undefined : 'lazy'}
                        decoding="async"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          mixBlendMode: 'multiply',
                        }}
                      />
                      {car.offer && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 10,
                            left: 12,
                            background: PAL.accent,
                            color: direction === 'fintech' ? '#FFF' : '#0C0C0D',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: PAL.radiusBadge,
                          }}
                        >
                          {lang === 'sv' ? 'Leasingerbjudande' : 'Leasingangebot'}
                        </span>
                      )}
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 12,
                          background: 'rgba(255,255,255,0.88)',
                          color: direction === 'fintech' ? PAL.subInk : '#1A1A1C',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: PAL.radiusBadge,
                        }}
                      >
                        {FUEL_LABELS[lang][car.fuel]}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '16px 18px 18px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div onClick={() => openDetail(car.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: 12, color: PAL.muted }}>{car.brand}</div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            fontStretch: direction === 'premium' ? '106%' : '100%',
                            letterSpacing: '-0.02em',
                            marginBottom: 4,
                          }}
                        >
                          {car.model}
                        </div>
                        <div style={{ fontSize: 12, color: PAL.muted, marginBottom: 14 }}>
                          {lang === 'sv' ? 'Listpris' : 'Listenpreis'} {fmtCurrency(car.price * k.pf, k)} ·{' '}
                          {car.range} km · {car.kw} kW
                        </div>
                      </div>

                      <div
                        onClick={() => openDetail(car.id)}
                        style={{
                          borderTop: `1px solid ${PAL.line}`,
                          paddingTop: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: PAL.accent,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {best.label}
                          </span>
                          {renderBadge(topProv)}
                        </div>
                        <div
                          style={{
                            fontSize: 30,
                            fontWeight: direction === 'fintech' ? 700 : 800,
                            fontStretch: direction === 'premium' ? '108%' : '100%',
                            letterSpacing: '-0.03em',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmtCurrency(best.total, k)}
                          <span style={{ fontSize: 13, fontWeight: 500, color: PAL.muted }}> /Mon.</span>
                        </div>
                        <div style={{ fontSize: 11, color: PAL.muted }}>
                          {best.span > 5
                            ? `${lang === 'sv' ? 'Spann' : 'Bandbreite'} ${fmtCurrency(best.lo, k)}–${fmtCurrency(best.hi, k)} /Mon.`
                            : lang === 'sv'
                              ? 'ingen osäkerhet i skattesats'
                              : 'keine Schätzbandbreite'}
                        </div>
                      </div>

                      {otherForms.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: `1px dashed ${PAL.line}`,
                            fontSize: 12,
                            color: PAL.muted,
                          }}
                        >
                          {otherForms.map((f) => (
                            <div
                              key={f.key}
                              onClick={() => openDetail(car.id, f.key)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '2px 0',
                                cursor: 'pointer',
                              }}
                            >
                              <span>{f.label}</span>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: PAL.subInk,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {fmtCurrency(f.total, k)} /Mon.
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginTop: 'auto',
                          paddingTop: 14,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openDetail(car.id)}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: direction === 'fintech' ? 10 : 6,
                            border: 'none',
                            cursor: 'pointer',
                            background: PAL.selBg,
                            color: PAL.selFg,
                            fontSize: 12,
                            fontWeight: direction === 'fintech' ? 600 : 700,
                          }}
                        >
                          {lang === 'sv' ? 'Uträkning →' : 'Aufschlüsselung →'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCompare(car.id)}
                          style={{
                            padding: '9px 12px',
                            borderRadius: direction === 'fintech' ? 10 : 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            border: `1px solid ${inCmp ? PAL.accent : PAL.line}`,
                            background: inCmp ? PAL.accent : PAL.offBg,
                            color: inCmp ? (direction === 'fintech' ? '#FFF' : '#0C0C0D') : PAL.offFg,
                          }}
                        >
                          {inCmp ? '✓' : '+'} {lang === 'sv' ? 'Jämför' : 'Vergleichen'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Responsive Container-Query Data Table (modern-web-guidance: responsive-table) */
            <div className="table-wrapper">
              <table
                className="at-data-table"
                style={
                  {
                    '--label-2': `"${lang === 'sv' ? 'Listpris' : 'Listenpreis'}"`,
                    '--label-3': `"${lang === 'sv' ? 'Räckvidd WLTP' : 'Reichweite WLTP'}"`,
                    '--label-4': `"${lang === 'sv' ? 'Bästa form' : 'Beste Halteform'}"`,
                    '--label-5': `"${lang === 'sv' ? 'Nettokostnad/mån' : 'Netto / Monat'}"`,
                    '--label-6': `"${lang === 'sv' ? 'Källa' : 'Herkunft'}"`,
                    '--label-7': `"${lang === 'sv' ? 'Jämför' : 'Vergleich'}"`,
                  } as React.CSSProperties
                }
              >
                <thead>
                  <tr>
                    <th scope="col">{lang === 'sv' ? 'Modell' : 'Modell'}</th>
                    <th scope="col">{lang === 'sv' ? 'Listpris' : 'Listenpreis'}</th>
                    <th scope="col">{lang === 'sv' ? 'Räckvidd WLTP' : 'Reichweite WLTP'}</th>
                    <th scope="col">{lang === 'sv' ? 'Bästa form' : 'Beste Halteform'}</th>
                    <th scope="col">{lang === 'sv' ? 'Nettokostnad/mån' : 'Netto / Monat'}</th>
                    <th scope="col">{lang === 'sv' ? 'Källa' : 'Herkunft'}</th>
                    <th scope="col">{lang === 'sv' ? 'Jämför' : 'Vergleich'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCars.map(({ car, best, topProv }) => {
                    const inCmp = compareIds.includes(car.id);
                    return (
                      <tr key={car.id}>
                        <th scope="row">
                          <div
                            onClick={() => openDetail(car.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              cursor: 'pointer',
                            }}
                          >
                            <img
                              src={`cars/${car.img}?v=studio2`}
                              alt={`${car.brand} ${car.model}`}
                              loading="lazy"
                              decoding="async"
                              style={{
                                width: 58,
                                height: 36,
                                objectFit: 'contain',
                                borderRadius: 6,
                                background: '#FFFFFF',
                              }}
                            />
                            <div>
                              <div style={{ fontSize: 11, color: PAL.muted }}>{car.brand}</div>
                              <div style={{ fontWeight: 700 }}>{car.model}</div>
                            </div>
                          </div>
                        </th>
                        <td>{fmtCurrency(car.price * k.pf, k)}</td>
                        <td>
                          {car.range} km · {car.kw} kW
                        </td>
                        <td>{best.label}</td>
                        <td>
                          <strong style={{ fontSize: 16 }}>
                            {fmtCurrency(best.total, k)} /Mon.
                          </strong>
                        </td>
                        <td>{renderBadge(topProv)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => toggleCompare(car.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: `1px solid ${inCmp ? PAL.accent : PAL.line}`,
                              background: inCmp ? PAL.accent : 'transparent',
                              color: inCmp ? (direction === 'fintech' ? '#FFF' : '#0C0C0D') : PAL.ink,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {inCmp ? '✓' : '+'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {compareIds.length > 0 && (
            <div
              style={{
                position: 'fixed',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: PAL.selBg,
                color: PAL.selFg,
                padding: '10px 18px',
                borderRadius: PAL.radiusBadge,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
                zIndex: 30,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {compareIds.length}{' '}
                {lang === 'sv' ? 'i jämförelsen' : 'im Vergleich'}
              </span>
              <button
                type="button"
                onClick={() => navigateWithTransition(() => setScreen('compare'))}
                style={{
                  background: PAL.accent,
                  color: direction === 'fintech' ? '#FFF' : '#0C0C0D',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: PAL.radiusBadge,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {lang === 'sv' ? 'Jämför nu →' : 'Vergleichen →'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // SCREEN 3: DETAIL
  // ============================================================================
  const renderDetailScreen = () => {
    const car = FAHRWERT_CARS.find((c) => c.id === detailId) || FAHRWERT_CARS[0];
    const ov = overridesMap[car.id] || {};
    const calc = calcFahrwertCar(car, k, calcInput, ov);
    const allowedForms = sitDef.forms.map((fk) => calc[fk]);
    const cheapest = allowedForms.reduce((a, b) => (a.total <= b.total ? a : b));
    const activeFormKey: FahrwertFormKey = detailForm || cheapest.key;
    const activeScenario = calc[activeFormKey];
    const allForms: FahrwertScenarioResult[] = [
      calc.kauf,
      calc.leasing,
      calc.dienstwagen,
      calc.firma,
    ];
    const inCmp = compareIds.includes(car.id);

    return (
      <div style={{ paddingTop: 24 }}>
        <button
          type="button"
          onClick={() => navigateWithTransition(() => setScreen('list'))}
          style={{
            background: 'none',
            border: 'none',
            color: PAL.muted,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 18,
          }}
        >
          ← {lang === 'sv' ? 'Alla modeller' : 'Alle Modelle'}
        </button>

        {/* CAR HERO */}
        <div
          className="fw-detail-hero-grid"
          style={{
            background: PAL.card,
            border: `1px solid ${PAL.line}`,
            borderRadius: PAL.radiusCard,
            padding: 28,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              aspectRatio: '16/10',
              background: PAL.stageBg,
              borderRadius: direction === 'fintech' ? 14 : 10,
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={`cars/${car.img}?v=studio2`}
              alt={`${car.brand} ${car.model}`}
              fetchPriority="high"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, color: PAL.muted, fontWeight: 600 }}>{car.brand}</div>
            <h1
              id="view-main-heading"
              tabIndex={-1}
              style={{
                fontSize: 36,
                fontWeight: direction === 'fintech' ? 700 : 800,
                fontStretch: PAL.headingStretch,
                letterSpacing: '-0.03em',
                margin: '2px 0 14px',
                outline: 'none',
              }}
            >
              {car.model}
            </h1>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                padding: '14px 0',
                borderTop: `1px solid ${PAL.line}`,
                borderBottom: `1px solid ${PAL.line}`,
                marginBottom: 18,
              }}
            >
              {[
                [lang === 'sv' ? 'Listpris' : 'Listenpreis', fmtCurrency(calc.meta.list, k)],
                [lang === 'sv' ? 'Räckvidd WLTP' : 'Reichweite WLTP', `${car.range} km`],
                [
                  lang === 'sv' ? 'Förbrukning' : 'Verbrauch',
                  car.kwh > 0 ? `${car.kwh.toLocaleString('de-AT')} kWh` : `${car.l.toLocaleString('de-AT')} l`,
                ],
                [
                  lang === 'sv' ? 'Effekt (Peak / P.2)' : 'Leistung (Peak / P.2)',
                  `${car.kw} kW${car.cont ? ` / ${car.cont} kW` : ''}`,
                ],
                [lang === 'sv' ? 'Tjänstevikt (G)' : 'Leergewicht (G)', `${car.mass} kg`],
                ['CO₂', `${car.co2} g/km`],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: PAL.muted }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick toggle for Sjukvård/Ordination vs GmbH directly inside Detail */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 14,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11.5, color: PAL.muted, fontWeight: 600 }}>
                {lang === 'sv' ? 'Skattesituation:' : 'Steuerprofil:'}
              </span>
              {(Object.values(SITUATIONS) as Array<(typeof SITUATIONS)[SituationId]>).map((stObj) => {
                const activeSit = sit === stObj.id;
                return (
                  <button
                    key={stObj.id}
                    type="button"
                    onClick={() => setSit(stObj.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: PAL.radiusBadge,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: `1px solid ${activeSit ? PAL.accent : PAL.line}`,
                      background: activeSit ? PAL.accent : 'transparent',
                      color: activeSit ? PAL.accentFg : PAL.subInk,
                    }}
                  >
                    {lang === 'sv' ? stObj.titleSv : stObj.titleDe}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setLeadSentFor((prev) => ({ ...prev, [car.id]: true }))}
                style={{
                  padding: '11px 18px',
                  borderRadius: direction === 'fintech' ? 10 : 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: PAL.accent,
                  color: PAL.accentFg,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {leadSentFor[car.id]
                  ? lang === 'sv'
                    ? '✓ Förfrågan mottagen – vi återkommer'
                    : '✓ Anfrage vorgemerkt — wir melden uns'
                  : lang === 'sv'
                    ? 'Begär leasingoffert'
                    : 'Leasingangebote anfordern'}
              </button>
              <button
                type="button"
                onClick={() => toggleCompare(car.id)}
                style={{
                  padding: '11px 16px',
                  borderRadius: direction === 'fintech' ? 10 : 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1px solid ${PAL.line}`,
                  background: PAL.card,
                  color: PAL.ink,
                }}
              >
                {inCmp
                  ? lang === 'sv'
                    ? '✓ I jämförelsen'
                    : '✓ Im Vergleich'
                  : lang === 'sv'
                    ? '+ Lägg till i jämförelse'
                    : '+ Zum Vergleich'}
              </button>
            </div>
          </div>
        </div>

        {/* 4 HALTEFORM CARDS */}
        <div className="fw-detail-forms-grid">
          {allForms.map((f) => {
            const on = f.key === activeFormKey;
            const isBest = f.key === cheapest.key;
            const inSit = sitDef.forms.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setDetailForm(f.key)}
                style={{
                  textAlign: 'left',
                  padding: 18,
                  borderRadius: direction === 'fintech' ? 14 : 10,
                  cursor: 'pointer',
                  background: on ? PAL.sitOn : PAL.card,
                  color: on ? PAL.sitOnFg : PAL.ink,
                  border: `1.5px solid ${on ? PAL.sitOn : isBest ? PAL.accent : PAL.line}`,
                  opacity: inSit || on ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</span>
                  {isBest && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: PAL.radiusBadge,
                        background: PAL.accent,
                        color: direction === 'fintech' ? '#FFF' : '#0C0C0D',
                      }}
                    >
                      {lang === 'sv' ? 'Billigast' : 'Am günstigsten'}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: direction === 'fintech' ? 700 : 800,
                    fontStretch: direction === 'premium' ? '108%' : '100%',
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtCurrency(f.total, k)}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: on ? PAL.sitOnSub : PAL.muted,
                    }}
                  >
                    {' '}
                    /Mon.
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: on ? PAL.sitOnSub : PAL.muted,
                    marginTop: 2,
                  }}
                >
                  {f.span > 5
                    ? `${fmtCurrency(f.lo, k)}–${fmtCurrency(f.hi, k)}`
                    : lang === 'sv'
                      ? 'exakt enligt lag'
                      : 'fix laut Gesetz'}
                </div>
              </button>
            );
          })}
        </div>

        {/* BREAKDOWN + ASSUMPTIONS SIDEBAR */}
        <div className="fw-detail-main-grid">
          {/* LEFT: FULL ITEMIZED BREAKDOWN */}
          <div
            style={{
              background: PAL.card,
              border: `1px solid ${PAL.line}`,
              borderRadius: direction === 'fintech' ? 18 : 12,
              padding: 28,
            }}
          >
            {/* Big Net Cost Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingBottom: 22,
                marginBottom: 8,
                borderBottom: `2px solid ${PAL.ink}`,
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: PAL.accent,
                    marginBottom: 6,
                  }}
                >
                  {activeScenario.label} · {lang === 'sv' ? 'Nettokostnad per månad' : 'Nettokosten pro Monat'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 64,
                      fontWeight: 800,
                      fontStretch: direction === 'premium' ? '110%' : '100%',
                      letterSpacing: '-0.04em',
                      lineHeight: 0.95,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtCurrency(activeScenario.total, k)}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: PAL.muted }}>
                    {lang === 'sv' ? '/ månad' : '/ Monat'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: PAL.muted, marginTop: 10 }}>
                  {activeScenario.span > 5
                    ? `${lang === 'sv' ? 'Bandbredd p.g.a. restvärde' : 'Bandbreite durch Restwert-Unsicherheit'}: ${fmtCurrency(activeScenario.lo, k)} – ${fmtCurrency(activeScenario.hi, k)} /Mon.`
                    : lang === 'sv'
                      ? 'Alla poster är lagstadgade eller från konkret offert — ingen osäkerhetsmarginal'
                      : 'Alle Posten gesetzlich oder aus Angebot — keine Schätzbandbreite'}
                </div>
              </div>

              {activeFormKey === cheapest.key && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: PAL.radiusBadge,
                    background: PAL.accent,
                    color: direction === 'fintech' ? '#FFF' : '#0C0C0D',
                  }}
                >
                  {lang === 'sv' ? 'Billigaste formen för dig' : 'Günstigste Form für dich'}
                </span>
              )}
            </div>

            {/* Line Items */}
            {activeScenario.lines.map((x, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: `1px solid ${PAL.line}`,
                  opacity: x.info ? 0.65 : 1,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {x.l}
                    {x.info ? (lang === 'sv' ? ' (informationsvärde)' : ' (nachrichtlich)') : ''}
                  </div>
                  <div style={{ fontSize: 12, color: PAL.muted }}>{x.note}</div>
                </div>
                {renderBadge(x.st)}
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 96,
                    textAlign: 'right',
                    color: x.v < 0 ? PAL.good : PAL.ink,
                  }}
                >
                  {fmtSignedCurrency(x.v, k)}
                </div>
              </div>
            ))}

            {/* Total over holding period & cost per km */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: 18,
                marginTop: 6,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {lang === 'sv'
                    ? `Totalt över ${term} månader`
                    : `Gesamt über ${term} Monate`}
                </div>
                <div style={{ fontSize: 12, color: PAL.muted }}>
                  {fmtCurrency(activeScenario.total * term, k)}{' '}
                  {lang === 'sv' ? 'totalt' : 'insgesamt'} ·{' '}
                  {((activeScenario.total * 12) / km).toFixed(2).replace('.', ',')}{' '}
                  {k.cur === 'EUR' ? '€' : 'kr'}/km
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    fontStretch: direction === 'premium' ? '108%' : '100%',
                    letterSpacing: '-0.02em',
                    color: PAL.subInk,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtCurrency(activeScenario.total * term, k)}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: ASSUMPTIONS + CUSTOM OFFER + SOURCES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: direction === 'fintech' ? 18 : 12,
                padding: 22,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    fontStretch: direction === 'premium' ? '106%' : '100%',
                    margin: 0,
                  }}
                >
                  {lang === 'sv' ? 'Antaganden' : 'Annahmen'}
                </h3>
                <button
                  type="button"
                  onClick={() => resetCarOverrides(car.id)}
                  style={{
                    fontSize: 11,
                    color: PAL.muted,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {lang === 'sv' ? 'Återställ' : 'Zurücksetzen'}
                </button>
              </div>

              {[
                {
                  lbl: lang === 'sv' ? 'Körsträcka / år' : 'Kilometer / Jahr',
                  val: `${km.toLocaleString(k.locale)} km`,
                  min: 5000,
                  max: 40000,
                  step: 2500,
                  cur: km,
                  onChange: (v: number) => setKm(v),
                },
                {
                  lbl: lang === 'sv' ? 'Innehavstid' : 'Haltedauer',
                  val: `${term} Mon.`,
                  min: 24,
                  max: 60,
                  step: 12,
                  cur: term,
                  onChange: (v: number) => setTerm(v),
                },
                {
                  lbl: lang === 'sv' ? 'Marginalskatt' : 'Grenzsteuersatz',
                  val: `${effMarg} %`,
                  min: 20,
                  max: 60,
                  step: 2,
                  cur: effMarg,
                  onChange: (v: number) => setMarg(v),
                },
                {
                  lbl: lang === 'sv' ? 'Handlarrabatt' : 'Händlerrabatt',
                  val: `${ov.disc || 0} %`,
                  min: 0,
                  max: 20,
                  step: 1,
                  cur: ov.disc || 0,
                  onChange: (v: number) => setCarOverride(car.id, 'disc', v),
                },
                {
                  lbl: lang === 'sv' ? `Restvärde efter ${term}M` : `Restwert nach ${term}M`,
                  val: `${Math.round(calc.meta.r * 100)} %`,
                  min: 20,
                  max: 75,
                  step: 1,
                  cur: Math.round(calc.meta.r * 100),
                  onChange: (v: number) => setCarOverride(car.id, 'res', v),
                },
                {
                  lbl: lang === 'sv' ? 'Elpris / kWh' : 'Strompreis / kWh',
                  val: `${(ov.elec ?? k.elec).toFixed(2).replace('.', ',')} ${k.cur === 'EUR' ? '€' : 'kr'}`,
                  min: 0.15,
                  max: 5,
                  step: 0.02,
                  cur: ov.elec ?? k.elec,
                  onChange: (v: number) => setCarOverride(car.id, 'elec', v),
                },
              ].map((slider, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: PAL.muted }}>{slider.lbl}</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{slider.val}</span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={slider.cur}
                    onChange={(e) => slider.onChange(Number(e.target.value))}
                    style={{ width: '100%', accentColor: PAL.accent }}
                  />
                </div>
              ))}
            </div>

            {/* DEIN ANGEBOT */}
            <div
              style={{
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: direction === 'fintech' ? 18 : 12,
                padding: 22,
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  fontStretch: direction === 'premium' ? '106%' : '100%',
                  margin: '0 0 4px',
                }}
              >
                {lang === 'sv' ? 'Din egen offert' : 'Dein Angebot'}
              </h3>
              <p style={{ fontSize: 12, color: PAL.muted, margin: '0 0 14px' }}>
                {lang === 'sv'
                  ? 'Har du fått en leasing- eller försäkringsoffert? Fyll i siffrorna här — de ersätter uppskattningen.'
                  : 'Hast du ein Leasing- oder Versicherungsangebot? Trag es ein — es ersetzt die Schätzung.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(
                  [
                    [
                      lang === 'sv' ? 'Leasingavgift / mån' : 'Leasingrate / Mon.',
                      'lease',
                      ov.lease ?? '',
                      car.offer ? String(Math.round(car.offer.rate * k.pf)) : '450',
                    ],
                    [
                      lang === 'sv' ? 'Första förhöjd avgift' : 'Anzahlung einmalig',
                      'leaseDown',
                      ov.leaseDown ?? '',
                      car.offer ? String(Math.round(car.offer.down * k.pf)) : '3000',
                    ],
                    [
                      lang === 'sv' ? 'Försäkring / mån' : 'Versicherung / Mon.',
                      'ins',
                      ov.ins ?? '',
                      '95',
                    ],
                  ] as Array<[string, keyof CarOverrides, number | '', string]>
                ).map(([label, key, val, ph]) => (
                  <label key={key} style={{ fontSize: 11, color: PAL.muted }}>
                    {label}
                    <input
                      type="number"
                      placeholder={ph}
                      value={val}
                      onChange={(e) =>
                        setCarOverride(
                          car.id,
                          key,
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      style={{
                        width: '100%',
                        marginTop: 4,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${PAL.line}`,
                        fontSize: 13,
                        fontWeight: 600,
                        background: PAL.inputBg,
                        color: PAL.ink,
                      }}
                    />
                  </label>
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => handlePdfOfferUpload(e, car.id)}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '9px',
                  borderRadius: 8,
                  border: `1px dashed ${PAL.line}`,
                  background: PAL.inputBg,
                  fontSize: 12,
                  fontWeight: 600,
                  color: PAL.subInk,
                  cursor: 'pointer',
                }}
              >
                {lang === 'sv'
                  ? '📄 Ladda upp PDF-offert och granska →'
                  : '📄 PDF-Angebot hochladen und prüfen →'}
              </button>
              {pdfNotice && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: PAL.good, fontWeight: 600 }}>
                  {pdfNotice}
                </div>
              )}
            </div>

            {car.offer && (
              <div
                style={{
                  background: PAL.card,
                  border: `1.5px solid ${PAL.accent}`,
                  borderRadius: direction === 'fintech' ? 18 : 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: PAL.accent, letterSpacing: '0.06em' }}>
                    {lang === 'sv' ? 'PARTNERERBJUDANDE' : 'PARTNERANGEBOT'}
                  </span>
                  <span style={{ fontSize: 11, color: PAL.muted }}>
                    {lang === 'sv' ? 'giltigt t.o.m.' : 'gültig bis'} {car.offer.valid}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{car.offer.lessor}</div>
                <div style={{ fontSize: 12, color: PAL.muted }}>
                  {fmtCurrency(car.offer.rate * k.pf, k)} /Mon. ·{' '}
                  {lang === 'sv' ? 'Kontantinsats' : 'Anzahlung'}{' '}
                  {fmtCurrency(car.offer.down * k.pf, k)} · {car.offer.term} Mon. ·{' '}
                  {car.offer.km.toLocaleString(k.locale)} km/J.
                  {car.offer.service
                    ? lang === 'sv'
                      ? ' · inkl. service'
                      : ' · inkl. Wartung'
                    : ''}
                </div>
              </div>
            )}

            <div
              style={{
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: direction === 'fintech' ? 14 : 10,
                padding: 18,
                fontSize: 12,
                color: PAL.muted,
              }}
            >
              <div style={{ fontWeight: 700, color: PAL.ink, marginBottom: 6 }}>
                {lang === 'sv' ? `KÄLLOR · ${countryName}` : `QUELLEN · ${countryName}`}
              </div>
              {k.sources.map((src, i) => (
                <div key={i} style={{ padding: '2px 0' }}>
                  · {src}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // SCREEN 4: VERGLEICH (SIDE-BY-SIDE COMPARE)
  // ============================================================================
  const renderCompareScreen = () => {
    const list = compareIds
      .map((id) => FAHRWERT_CARS.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    if (list.length === 0) {
      return (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <h1 id="view-main-heading" tabIndex={-1} style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {lang === 'sv' ? 'Inga modeller i jämförelsen' : 'Keine Modelle im Vergleich'}
          </h1>
          <p style={{ color: PAL.muted, marginBottom: 18 }}>
            {lang === 'sv'
              ? 'Välj upp till 4 bilar i modellöversikten.'
              : 'Wähle in der Modellübersicht bis zu 4 Fahrzeuge aus.'}
          </p>
          <button
            type="button"
            onClick={() => navigateWithTransition(() => setScreen('list'))}
            style={{
              padding: '10px 18px',
              borderRadius: PAL.radiusBadge,
              border: 'none',
              background: PAL.selBg,
              color: PAL.selFg,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {lang === 'sv' ? 'Till modellerna →' : 'Zu den Modellen →'}
          </button>
        </div>
      );
    }

    const calcs = list.map((c) => calcFahrwertCar(c, k, calcInput, overridesMap[c.id]));

    const rows: Array<{
      label: string;
      vals: number[];
      fmt: (v: number) => string;
      lower: boolean;
      bold?: boolean;
    }> = [
      {
        label: lang === 'sv' ? 'Listpris' : 'Listenpreis',
        vals: list.map((c) => c.price * k.pf),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
      },
      {
        label: lang === 'sv' ? 'Räckvidd WLTP' : 'Reichweite WLTP',
        vals: list.map((c) => c.range),
        fmt: (v) => `${v} km`,
        lower: false,
      },
      {
        label: lang === 'sv' ? 'Effekt (Peak)' : 'Leistung',
        vals: list.map((c) => c.kw),
        fmt: (v) => `${v} kW`,
        lower: false,
      },
      {
        label: `${lang === 'sv' ? 'Kontantköp' : 'Barkauf'} / Mon.`,
        vals: calcs.map((x) => x.kauf.total),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
        bold: true,
      },
      {
        label: 'Privatleasing / Mon.',
        vals: calcs.map((x) => x.leasing.total),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
        bold: true,
      },
      {
        label: `${lang === 'sv' ? k.dwSv : k.dwDe} / Mon.`,
        vals: calcs.map((x) => x.dienstwagen.total),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
        bold: true,
      },
      {
        label: `${
          sitDef.isOrdination
            ? lang === 'sv'
              ? k.ordinationSv
              : k.ordinationDe
            : lang === 'sv'
              ? k.firmSv
              : k.firmDe
        } / Mon.`,
        vals: calcs.map((x) => x.firma.total),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
        bold: true,
      },
      {
        label: lang === 'sv' ? ' därav värdeminskning' : '  davon Wertverlust',
        vals: calcs.map((x) => x.kauf.lines[0].v),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
      },
      {
        label: lang === 'sv' ? ' därav energi' : '  davon Energie',
        vals: calcs.map((x) => x.kauf.lines[2].v),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
      },
      {
        label: lang === 'sv' ? ' därav försäkring' : '  davon Versicherung',
        vals: calcs.map((x) => x.kauf.lines[3].v),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
      },
      {
        label: `  ${lang === 'sv' ? 'därav' : 'davon'} ${lang === 'sv' ? k.taxNameSv : k.taxNameDe}`,
        vals: calcs.map((x) => x.kauf.lines[4].v),
        fmt: (v) => fmtCurrency(v, k),
        lower: true,
      },
    ];

    const colTemplate = `220px repeat(${list.length}, minmax(200px, 1fr))`;

    return (
      <div style={{ paddingTop: 28, overflowX: 'auto' }}>
        <h1
          id="view-main-heading"
          tabIndex={-1}
          style={{
            fontSize: 28,
            fontWeight: direction === 'fintech' ? 700 : 800,
            fontStretch: direction === 'premium' ? '110%' : '100%',
            letterSpacing: '-0.025em',
            margin: '0 0 20px',
            outline: 'none',
          }}
        >
          {lang === 'sv' ? 'Jämförelse' : 'Vergleich'}
        </h1>

        <div
          style={{
            background: PAL.card,
            border: `1px solid ${PAL.line}`,
            borderRadius: direction === 'fintech' ? 18 : 12,
            overflow: 'hidden',
            minWidth: 680,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: colTemplate,
              borderBottom: `1px solid ${PAL.line}`,
            }}
          >
            <div style={{ padding: 18, fontSize: 12, color: PAL.muted, alignSelf: 'end' }}>
              {km.toLocaleString(k.locale)} km/J. · {term} Mon. · {effMarg} %
            </div>
            {list.map((c) => (
              <div key={c.id} style={{ padding: 18, borderLeft: `1px solid ${PAL.line}` }}>
                <div
                  onClick={() => openDetail(c.id)}
                  style={{
                    aspectRatio: '16/10',
                    background: PAL.stageBg,
                    borderRadius: direction === 'fintech' ? 10 : 8,
                    padding: 10,
                    marginBottom: 10,
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={`cars/${c.img}?v=studio2`}
                    alt={`${c.brand} ${c.model}`}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      mixBlendMode: 'multiply',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 11, color: PAL.muted }}>{c.brand}</div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontStretch: direction === 'premium' ? '106%' : '100%',
                      }}
                    >
                      {c.model}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCompare(c.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: PAL.muted,
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {rows.map((r, ri) => {
            const bestVal = r.lower ? Math.min(...r.vals) : Math.max(...r.vals);
            return (
              <div
                key={ri}
                style={{
                  display: 'grid',
                  gridTemplateColumns: colTemplate,
                  borderBottom: `1px solid ${PAL.line}`,
                  background: r.bold ? PAL.rowOn : 'transparent',
                }}
              >
                <div
                  style={{
                    padding: '12px 18px',
                    fontSize: 13,
                    fontWeight: r.bold ? 700 : 500,
                    color: r.bold ? PAL.ink : PAL.subInk,
                  }}
                >
                  {r.label}
                </div>
                {r.vals.map((v, ci) => {
                  const win = v === bestVal && list.length > 1;
                  return (
                    <div
                      key={ci}
                      style={{
                        padding: '12px 18px',
                        borderLeft: `1px solid ${PAL.line}`,
                        fontSize: r.bold ? 16 : 14,
                        fontWeight: win || r.bold ? 700 : 500,
                        color: win ? PAL.good : PAL.ink,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {r.fmt(v)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // SCREEN 5: RECHNER (DIENSTWAGEN-RECHNER & ANGEBOT PRÜFEN)
  // ============================================================================
  const renderCalcScreen = () => {
    const m = effMarg / 100;

    // Tab 1: Dienstwagen comparison (Elektro vs Plug-in-Hybrid vs Verbrenner)
    const sampleFuels: Array<[FuelType, string, number]> = [
      ['bev', lang === 'sv' ? 'Elbil (0 g/km)' : 'Elektro (0 g/km)', 0],
      ['phev', 'Plug-in-Hybrid (35 g/km)', 35],
      ['petrol', lang === 'sv' ? 'Bensin / Diesel (145 g/km)' : 'Verbrenner (145 g/km)', 145],
    ];

    const dwCards = sampleFuels.map(([fuel, label, co2]) => {
      const dummyCar = { ...FAHRWERT_CARS[0], fuel, co2 };
      const listLocal = dwPrice * k.pf;
      // Compute monthly taxable benefit
      let ben = 0;
      if (k.code === 'AT') {
        ben =
          fuel === 'bev'
            ? 0
            : co2 <= 126
              ? Math.min(listLocal * 0.015, 720)
              : Math.min(listLocal * 0.02, 960);
      } else if (k.code === 'DE') {
        const f = fuel === 'bev' ? (listLocal <= 100000 ? 0.25 : 0.5) : fuel === 'phev' ? 0.5 : 1;
        ben = listLocal * f * 0.01 + listLocal * f * 0.0003 * commute;
      } else {
        const eff = fuel === 'bev' ? listLocal - Math.min(350000, listLocal * 0.5) : listLocal;
        ben = (0.29 * 59200 + eff * (0.7 * 0.0255 + 0.01) + eff * 0.09) / 12;
      }
      const netTax = ben * m;
      return {
        dummyCar,
        fuel,
        label,
        ben,
        netTax,
        yr: netTax * 12,
      };
    });

    // Tab 2: Angebot prüfen (Leasingfaktor gauge)
    const effRate = offerRate + offerDown / offerTerm;
    const lf = (effRate / offerList) * 100;
    const verdict =
      lf < 0.75
        ? {
            t: lang === 'sv' ? 'Mycket bra erbjudande' : 'Sehr gutes Angebot',
            c: PAL.good,
            d:
              lang === 'sv'
                ? 'Tydligt under marknadssnittet — kontrollera dolda avgifter och övermil.'
                : 'Deutlich unter Marktdurchschnitt — Sonderkonditionen oder Herstelleraktion.',
          }
        : lf < 1.0
          ? {
              t: lang === 'sv' ? 'Marknadsmässigt' : 'Marktüblich',
              c: PAL.ink,
              d:
                lang === 'sv'
                  ? 'Rättvis månadskostnad i förhållande till listpriset.'
                  : 'Faire Kondition im Verhältnis zum Listenpreis.',
            }
          : {
              t: lang === 'sv' ? 'Dyrt erbjudande' : 'Teuer',
              c: PAL.bad,
              d:
                lang === 'sv'
                  ? 'Över riktvärdet 1,0 — begär konkurrerande offert eller jämför med kontantköp.'
                  : 'Über Richtwert 1,0 — Nachverhandeln oder Barkauf prüfen.',
            };
    const gaugePct = Math.min(100, Math.max(0, ((lf - 0.3) / 1.0) * 100));

    return (
      <div style={{ paddingTop: 28 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {(
            [
              ['dw', `${lang === 'sv' ? k.dwSv : k.dwDe}-${lang === 'sv' ? 'kalkylator' : 'Rechner'}`],
              ['offer', lang === 'sv' ? 'Granska leasingoffert' : 'Angebot prüfen'],
            ] as Array<[CalcTabId, string]>
          ).map(([tk, tl]) => (
            <button
              key={tk}
              type="button"
              onClick={() => setCalcTab(tk)}
              style={{
                padding: '10px 18px',
                borderRadius: PAL.radiusBadge,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${calcTab === tk ? PAL.selBg : PAL.line}`,
                background: calcTab === tk ? PAL.selBg : PAL.card,
                color: calcTab === tk ? PAL.selFg : PAL.ink,
              }}
            >
              {tl}
            </button>
          ))}
        </div>

        {calcTab === 'dw' ? (
          <div className="fw-calc-dw-grid">
            <div
              style={{
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: direction === 'fintech' ? 18 : 12,
                padding: 22,
              }}
            >
              <h1
                id="view-main-heading"
                tabIndex={-1}
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontStretch: direction === 'premium' ? '106%' : '100%',
                  margin: '0 0 14px',
                  outline: 'none',
                }}
              >
                {lang === 'sv' ? k.dwSv : k.dwDe} · {countryName}
              </h1>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: PAL.muted }}>
                    {lang === 'sv' ? 'Bruttolistpris' : 'Bruttolistenpreis'}
                  </span>
                  <span style={{ fontWeight: 700 }}>{fmtCurrency(dwPrice * k.pf, k)}</span>
                </div>
                <input
                  type="range"
                  min={25000}
                  max={90000}
                  step={2500}
                  value={dwPrice}
                  onChange={(e) => setDwPrice(Number(e.target.value))}
                  style={{ width: '100%', accentColor: PAL.accent }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: PAL.muted }}>
                    {lang === 'sv' ? 'Marginalskatt' : 'Grenzsteuersatz'}
                  </span>
                  <span style={{ fontWeight: 700 }}>{effMarg} %</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={60}
                  step={2}
                  value={effMarg}
                  onChange={(e) => setMarg(Number(e.target.value))}
                  style={{ width: '100%', accentColor: PAL.accent }}
                />
              </div>

              {country === 'DE' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: PAL.muted }}>Arbeitsweg einfach</span>
                    <span style={{ fontWeight: 700 }}>{commute} km</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={commute}
                    onChange={(e) => setCommute(Number(e.target.value))}
                    style={{ width: '100%', accentColor: PAL.accent }}
                  />
                </div>
              )}

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: `1px solid ${PAL.line}`,
                  fontSize: 12,
                  color: PAL.muted,
                }}
              >
                {lang === 'sv' ? k.benRefSv : k.benRefDe}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {dwCards.map((r) => (
                <div
                  key={r.fuel}
                  style={{
                    background: PAL.card,
                    border: `1.5px solid ${r.fuel === 'bev' ? PAL.accent : PAL.line}`,
                    borderRadius: direction === 'fintech' ? 18 : 12,
                    padding: 22,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: PAL.muted }}>
                    {lang === 'sv' ? 'Din nettokostnad / månad' : 'Deine Nettokosten / Monat'}
                  </div>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      fontStretch: direction === 'premium' ? '108%' : '100%',
                      letterSpacing: '-0.03em',
                      color: r.fuel === 'bev' ? PAL.good : PAL.ink,
                      marginBottom: 14,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtCurrency(r.netTax, k)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: PAL.muted,
                      borderTop: `1px solid ${PAL.line}`,
                      paddingTop: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>{lang === 'sv' ? k.benNameSv : k.benNameDe}</span>
                      <span style={{ fontWeight: 600, color: PAL.ink }}>{fmtCurrency(r.ben, k)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>{lang === 'sv' ? 'Per år netto' : 'Pro Jahr netto'}</span>
                      <span style={{ fontWeight: 600, color: PAL.ink }}>{fmtCurrency(r.yr, k)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="fw-calc-offer-grid">
            <div
              style={{
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: direction === 'fintech' ? 18 : 12,
                padding: 22,
              }}
            >
              <h1
                id="view-main-heading"
                tabIndex={-1}
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontStretch: direction === 'premium' ? '106%' : '100%',
                  margin: '0 0 14px',
                  outline: 'none',
                }}
              >
                {lang === 'sv' ? 'Granska leasingoffert' : 'Leasingangebot prüfen'}
              </h1>

              {(
                [
                  [
                    lang === 'sv' ? 'Bruttolistpris' : 'Bruttolistenpreis',
                    offerList,
                    (v: number) => setOfferList(v),
                  ],
                  [
                    lang === 'sv' ? 'Månadsavgift (brutto)' : 'Monatsrate (brutto)',
                    offerRate,
                    (v: number) => setOfferRate(v),
                  ],
                  [
                    lang === 'sv' ? 'Första förhöjd avgift' : 'Anzahlung / Sonderzahlung',
                    offerDown,
                    (v: number) => setOfferDown(v),
                  ],
                  [
                    lang === 'sv' ? 'Löptid (månader)' : 'Laufzeit (Monate)',
                    offerTerm,
                    (v: number) => setOfferTerm(Math.max(12, v)),
                  ],
                  [
                    lang === 'sv' ? 'Körsträcka / år' : 'Kilometer / Jahr',
                    offerKm,
                    (v: number) => setOfferKm(v),
                  ],
                ] as Array<[string, number, (v: number) => void]>
              ).map(([lbl, val, setter]) => (
                <label key={lbl} style={{ display: 'block', fontSize: 12, color: PAL.muted, marginBottom: 10 }}>
                  {lbl}
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => setter(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${PAL.line}`,
                      fontSize: 14,
                      fontWeight: 600,
                      background: PAL.inputBg,
                      color: PAL.ink,
                    }}
                  />
                </label>
              ))}
            </div>

            <div
              style={{
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: direction === 'fintech' ? 18 : 12,
                padding: 28,
              }}
            >
              <div style={{ fontSize: 12, color: PAL.muted, fontWeight: 600 }}>
                {lang === 'sv'
                  ? 'LEASINGFAKTOR (INKL. FÖRSTA FÖRHÖJD AVGIFT)'
                  : 'LEASINGFAKTOR (INKL. ANZAHLUNG)'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, margin: '6px 0 6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    fontStretch: direction === 'premium' ? '108%' : '100%',
                    letterSpacing: '-0.04em',
                    color: verdict.c,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {lf.toFixed(2).replace('.', ',')}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: verdict.c }}>{verdict.t}</span>
              </div>
              <p style={{ fontSize: 13, color: PAL.muted, margin: '0 0 20px' }}>{verdict.d}</p>

              <div
                style={{
                  height: 10,
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${PAL.good} 0%, ${PAL.good} 45%, ${PAL.warn} 70%, ${PAL.bad} 100%)`,
                  position: 'relative',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${gaugePct}%`,
                    top: -4,
                    width: 18,
                    height: 18,
                    borderRadius: 99,
                    background: PAL.selBg,
                    border: `3px solid ${PAL.card}`,
                    transform: 'translateX(-50%)',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: PAL.muted,
                  marginBottom: 22,
                }}
              >
                <span>0,3 {lang === 'sv' ? 'topp' : 'top'}</span>
                <span>0,75 {lang === 'sv' ? 'bra' : 'gut'}</span>
                <span>1,0 {lang === 'sv' ? 'ok' : 'ok'}</span>
                <span>1,2+ {lang === 'sv' ? 'dyrt' : 'teuer'}</span>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${PAL.line}`,
                  paddingTop: 14,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ color: PAL.muted }}>
                    {lang === 'sv'
                      ? 'Effektiv månadsavgift (med kontantinsats)'
                      : 'Effektivrate (mit Anzahlung)'}
                  </span>
                  <span style={{ fontWeight: 700 }}>{fmtCurrency(effRate, k)} /Mon.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ color: PAL.muted }}>
                    {lang === 'sv'
                      ? `Totala leasingbetalningar (${offerTerm} mån)`
                      : `Leasingzahlungen gesamt (${offerTerm} Mon.)`}
                  </span>
                  <span style={{ fontWeight: 700 }}>{fmtCurrency(effRate * offerTerm, k)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: PAL.bg, color: PAL.ink }}>
      {/* STICKY HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: PAL.headerBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${PAL.line}`,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* BRAND */}
          <button
            type="button"
            onClick={() => navigateWithTransition(() => setScreen('start'))}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: direction === 'fintech' ? 20 : 19,
                fontWeight: 800,
                fontStretch: direction === 'premium' ? '118%' : '100%',
                letterSpacing: direction === 'fintech' ? '-0.03em' : '-0.01em',
                color: PAL.ink,
              }}
            >
              {PAL.brandText}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: PAL.muted,
                letterSpacing: direction === 'premium' ? '0.06em' : '0.01em',
                textTransform: direction === 'premium' ? 'uppercase' : 'none',
              }}
            >
              {countryName}
            </span>
          </button>

          {/* NAV TABS */}
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(
              [
                ['start', 'Start'],
                ['list', lang === 'sv' ? 'Bilar' : 'Autos'],
                [
                  'compare',
                  `${lang === 'sv' ? 'Jämför' : 'Vergleich'}${compareIds.length ? ` (${compareIds.length})` : ''}`,
                ],
                ['calc', lang === 'sv' ? 'Kalkylator' : 'Rechner'],
              ] as Array<[ScreenId, string]>
            ).map(([id, label]) => {
              const active = screen === id || (screen === 'detail' && id === 'list');
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigateWithTransition(() => setScreen(id))}
                  style={{
                    padding: '7px 13px',
                    borderRadius: PAL.radiusBadge,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    background: active ? PAL.selBg : 'transparent',
                    color: active ? PAL.selFg : PAL.subInk,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* RIGHT CONTROLS */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Quick Situation Pill (opens light-dismissable <dialog closedby="any">) */}
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              style={{
                padding: '6px 12px',
                borderRadius: PAL.radiusBadge,
                border: `1px solid ${PAL.line}`,
                background: PAL.card,
                fontSize: 12,
                color: PAL.subInk,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{lang === 'sv' ? 'Situation:' : 'Situation:'}</span>
              <strong style={{ color: PAL.ink }}>
                {lang === 'sv' ? sitDef.titleSv : sitDef.titleDe}
              </strong>
              <span style={{ color: PAL.muted }}>· {(km / 1000).toFixed(0)}k km</span>
            </button>

            {/* Design Direction Switcher: Fintech (Light) vs Premium (Dark) */}
            <div
              style={{
                display: 'inline-flex',
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: PAL.radiusBadge,
                padding: 2,
              }}
              role="group"
              aria-label="Design Direction"
            >
              {(
                [
                  ['fintech', '☀️ Fintech'],
                  ['premium', '🌙 Premium'],
                ] as Array<[DesignDirection, string]>
              ).map(([dirId, dirLabel]) => (
                <button
                  key={dirId}
                  type="button"
                  onClick={() => setDirection(dirId)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: PAL.radiusBadge,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: direction === dirId ? PAL.selBg : 'transparent',
                    color: direction === dirId ? PAL.selFg : PAL.muted,
                  }}
                >
                  {dirLabel}
                </button>
              ))}
            </div>

            {/* Country Switcher: AT / DE / SE */}
            <div
              style={{
                display: 'inline-flex',
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: PAL.radiusBadge,
                padding: 2,
              }}
            >
              {(['AT', 'DE', 'SE'] as CountryCode[]).map((cc) => (
                <button
                  key={cc}
                  type="button"
                  onClick={() => {
                    setCountry(cc);
                    setMarg(null);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: PAL.radiusBadge,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    background: country === cc ? PAL.selBg : 'transparent',
                    color: country === cc ? PAL.selFg : PAL.muted,
                  }}
                >
                  {cc}
                </button>
              ))}
            </div>

            {/* Language Switcher: DE / SV */}
            <div
              style={{
                display: 'inline-flex',
                background: PAL.card,
                border: `1px solid ${PAL.line}`,
                borderRadius: PAL.radiusBadge,
                padding: 2,
              }}
            >
              {(['de', 'sv'] as Language[]).map((lCode) => (
                <button
                  key={lCode}
                  type="button"
                  onClick={() => setLang(lCode)}
                  style={{
                    padding: '5px 9px',
                    borderRadius: PAL.radiusBadge,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: lang === lCode ? PAL.accent : 'transparent',
                    color: lang === lCode ? PAL.accentFg : PAL.muted,
                  }}
                >
                  {lCode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '0 28px 96px' }}>
        {screen === 'start' && renderStartScreen()}
        {screen === 'list' && renderListScreen()}
        {screen === 'detail' && renderDetailScreen()}
        {screen === 'compare' && renderCompareScreen()}
        {screen === 'calc' && renderCalcScreen()}
      </main>

      {/* LIGHT-DISMISS QUICK SITUATION DIALOG (modern-web-guidance: light-dismiss-a-dialog, animate-to-from-top-layer, child-state-based-styling) */}
      <dialog
        ref={dialogRef}
        className="at-modal"
        closedby="any"
        onClick={handleDialogClick}
      >
        <div className="modal-inner" style={{ background: PAL.card, color: PAL.ink }}>
          <div className="modal-header" style={{ borderColor: PAL.line }}>
            <div>
              <strong style={{ fontSize: 18 }}>
                {lang === 'sv' ? 'Snabbval: Din skattesituation' : 'Schnellauswahl: Deine Situation'}
              </strong>
              <div style={{ fontSize: 12, color: PAL.muted }}>
                {lang === 'sv'
                  ? 'Ändrar direkt alla månadskostnader i hela verktyget'
                  : 'Aktualisiert sofort alle Monatskosten im Rechner'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => closeTopLayer(dialogRef.current)}
              style={{
                padding: '6px 12px',
                borderRadius: PAL.radiusBadge,
                border: `1px solid ${PAL.line}`,
                background: PAL.inputBg,
                color: PAL.ink,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {lang === 'sv' ? 'Stäng ✕' : 'Schließen ✕'}
            </button>
          </div>

          <div className="choice-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(Object.values(SITUATIONS) as Array<(typeof SITUATIONS)[SituationId]>).map((sItem) => {
              const checked = sit === sItem.id;
              return (
                <label
                  key={sItem.id}
                  className={`choice-pill ${checked ? 'is-active' : ''}`}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="quick-sit"
                      checked={checked}
                      onChange={() => setSit(sItem.id)}
                    />
                    <span>{lang === 'sv' ? sItem.titleSv : sItem.titleDe}</span>
                  </div>
                  <span style={{ fontSize: 12, color: PAL.muted, fontWeight: 400 }}>
                    {lang === 'sv' ? sItem.descSv : sItem.descDe}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </dialog>
    </div>
  );
};
