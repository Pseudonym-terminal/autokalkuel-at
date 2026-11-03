import { AustrianProfile, BodyType, Language, OwnershipForm, Powertrain } from '../types';

export const POWERTRAIN_LABELS: Record<
  Language,
  Record<Powertrain | 'all', string>
> = {
  de: {
    all: 'Alle Antriebe',
    bev: 'Elektro (BEV)',
    phev: 'Plug-in-Hybrid (PHEV)',
    hev: 'Vollhybrid (HEV)',
    petrol: 'Benzin (inkl. Mild-Hybrid)',
    diesel: 'Diesel',
  },
  sv: {
    all: 'Alla drivmedel',
    bev: 'El (BEV)',
    phev: 'Laddhybrid (PHEV)',
    hev: 'Elhybrid (HEV)',
    petrol: 'Bensin (inkl. mildhybrid)',
    diesel: 'Diesel',
  },
};

export const BODY_LABELS: Record<Language, Record<BodyType, string>> = {
  de: {
    suv: 'SUV & Crossover',
    hatchback: 'Kompakt / Schrägheck',
    estate: 'Kombi / Tourer',
    sedan: 'Limousine',
    coupe: 'Coupé',
    mpv: 'Familienvan',
    van: 'Kastenwagen',
  },
  sv: {
    suv: 'SUV',
    hatchback: 'Halvkombi',
    estate: 'Kombi',
    sedan: 'Sedan',
    coupe: 'Coupé',
    mpv: 'Familjebuss',
    van: 'Skåpbil',
  },
};

export const OWNERSHIP_FORM_LABELS: Record<
  Language,
  Record<OwnershipForm | 'all', string>
> = {
  de: {
    all: 'Günstigste Form für mich',
    privateCash: 'Barkauf',
    privateLoan: 'Autokredit',
    privateLease: 'Privatleasing',
    companyGmbh: 'Praxis / EPU / GmbH',
    benefitCar: 'Dienstwagen (Sachbezug)',
    salaryExchange: 'Gehaltsumwandlung',
  },
  sv: {
    all: 'Billigaste formen för mig',
    privateCash: 'Köpa kontant',
    privateLoan: 'Billån',
    privateLease: 'Privatleasing',
    companyGmbh: 'Verksamhet (Ordination / EPU / GmbH)',
    benefitCar: 'Tjänstebil (Sachbezug)',
    salaryExchange: 'Löneväxling (AT)',
  },
};

export function getOwnershipFormLabel(
  lang: Language,
  form: OwnershipForm | 'all',
  profile?: AustrianProfile
): string {
  if (form !== 'companyGmbh' || !profile) {
    return OWNERSHIP_FORM_LABELS[lang][form];
  }
  const isSole = profile.access.soleTrader && !profile.access.ownGmbh;
  const isVatExempt = Boolean(profile.vatExempt);

  if (lang === 'de') {
    if (isSole) {
      return isVatExempt
        ? 'Ordination / EPU (USt-befreit)'
        : 'Ordination / EPU (Betrieb)';
    }
    if (profile.access.ownGmbh) {
      return isVatExempt
        ? 'Eigene GmbH (USt-befreit)'
        : 'Über eigene GmbH';
    }
    return isVatExempt
      ? 'Ordination / Betrieb (USt-befreit)'
      : 'Ordination / EPU / GmbH';
  } else {
    if (isSole) {
      return isVatExempt
        ? 'Ordination / EPU (Momsbefriad)'
        : 'Ordination / EPU (Enskild firma)';
    }
    if (profile.access.ownGmbh) {
      return isVatExempt
        ? 'Eget GmbH (Momsbefriat)'
        : 'Via eget GmbH (AT)';
    }
    return isVatExempt
      ? 'Verksamhet / Sjukvård (Momsbefriad)'
      : 'Verksamhet (Ordination / GmbH)';
  }
}

export const DRIVE_LABELS: Record<
  Language,
  Record<'fwd' | 'rwd' | 'awd', string>
> = {
  de: {
    fwd: 'Vorderrad (FWD)',
    rwd: 'Hinterrad (RWD)',
    awd: 'Allrad (AWD / 4x4)',
  },
  sv: {
    fwd: 'Framhjulsdrift',
    rwd: 'Bakhjulsdrift',
    awd: 'Fyrhjulsdrift (AWD)',
  },
};

export const UI_TEXT = {
  de: {
    brandSubtitle: 'Österreichischer Vollkostenrechner · Stand 2026',
    navFindCar: 'Auto finden',
    navTaxGuide: 'Österreich-Steuerregeln',
    navCompare: 'Vergleich',
    mySituation: 'Meine Situation',
    heroKicker: 'VOLLKOSTENRECHNER ÖSTERREICH · INKL. NOVA, SACHBEZUG & E-AUTO-STEUER',
    heroTitle: 'Auto finden nach echten Monatskosten',
    heroLead:
      'Was kostet dich das Auto wirklich im Monat – alles eingerechnet? Vergleiche Barkauf, Kredit, Privatleasing, eigene GmbH und Dienstwagen nach österreichischem Steuerrecht.',
    viewAs: 'Ansicht:',
    viewCards: 'Karten',
    viewTable: 'Tabelle',
    situationBannerTitle: 'Deine Situation & Annahmen für Österreich',
    situationBannerHint:
      'Alle Beträge aktualisieren sich sofort. Deine Eingaben bleiben lokal in deinem Browser gespeichert.',
    presetLabel: 'Schnellprofil wählen:',
    kmPerYearLabel: 'Wie viel fährst du pro Jahr?',
    kmPerYearAffect:
      'Beeinflusst Ladestrom/Treibstoff, Wertverlust, Mehrkilometer, Versicherung und Service.',
    businessKmLabel: 'Davon berufliche Kilometer (Dienstreisen)',
    businessKmHint:
      'Für Dienstreisen mit dem Privatauto gibt es in Österreich 0,50 €/km steuerfreies amtliches Kilometergeld. Beim Dienstwagen gilt bis 6.000 km Privatfahrt der halbe Sachbezug.',
    bundeslandLabel: 'Bundesland & Strom-Netzgebiet',
    municipalityLabel: 'Ort oder Bezirk (optional)',
    municipalityPlaceholder: 'z. B. Wien, Linz, Graz, Innsbruck …',
    bundeslandAffect:
      'Steuert das regionale Strom-Netzentgelt (E-Control SNE-V), die Versicherungsprämie und das Parkpickerl.',
    taxBracketLabel: 'Dein Einkommensteuer-Grenzsteuersatz (AT)',
    accessLabel: 'Wie kannst du ein Auto beziehen?',
    accessPrivate: 'Privat (Barkauf, Kredit, Privatleasing)',
    accessAlways: 'immer aktiv',
    accessSoleTrader:
      'Ich habe eine Ordination / Praxis / Einzelunternehmen (Freiberufler / EPU – keine GmbH, ESt-Abzug)',
    accessGmbh: 'Ich habe eine eigene GmbH (23 % KöSt)',
    vatStatusLabel: 'Umsatzsteuer-Status (Vorsteuerabzug):',
    vatExemptYes:
      'Unecht USt-befreit – z. B. Ärzt:in / Heilbehandlung (§ 6 Abs 1 Z 19 UStG → 0 € Vorsteuerabzug, Brutto-Kosten absetzbar)',
    vatExemptNo:
      'Umsatzsteuerpflichtig (20 % Vorsteuerabzug bei 0 g/km E-Autos bis 40.000 €)',
    accessBenefit: 'Arbeitgeber bietet Dienstwagen (0 % Sachbezug für E-Autos)',
    accessSalaryExchange:
      'Arbeitgeber bietet Gehaltsumwandlung (Bruttogehaltsverzicht)',
    gmbhChannelLabel: 'GmbH-Entnahmekanal:',
    gmbhChannelSalary: 'Geschäftsführerbezug (ESt)',
    gmbhChannelDividend: 'Gewinnausschüttung (23 % KöSt + 27,5 % KESt)',
    holdingLabel: 'Wie lange behältst du das Auto?',
    yearsUnit: 'Jahre',
    chargingLabel: 'Kannst du zuhause laden (Wallbox / Garage)?',
    chargingYes: 'Ja, Heimladen möglich',
    chargingNo: 'Nein, nur öffentlich (AC/DC)',
    vignetteLabel: 'ASFINAG Jahresvignette (103,80 €/Jahr) einrechnen',
    filterMaxMonthly: 'Darf höchstens kosten, €/Monat',
    filterMaxPrice: 'Maximaler Listenpreis, €',
    filterNoLimit: 'Kein Limit',
    filterPowertrain: 'Antrieb',
    filterBody: 'Karosserie',
    filterBodyHelp: 'Wähle eine oder mehrere. Ohne Auswahl werden alle Karosserien gezeigt.',
    filterMinRange: 'Mindestens elektrische Reichweite (WLTP), km',
    filterForm: 'Erwerbsform',
    filterSearchQuery: 'Marke oder Modell suchen',
    filterCurrentOnly: 'Nur aktuelle österreichische Listenpreise',
    filterIncludeStale: 'Auch zuletzt bekannte Listenpreise einbeziehen',
    filterIncludeUnknownRange: 'Auch Verbrenner/Hybride ohne E-Reichweite zeigen',
    resetFilters: 'Filter zurücksetzen',
    costsYou: 'Kostet dich',
    perMonth: '€/Monat',
    spanLabel: 'Wahrscheinliche Spanne',
    showCalculation: 'Kalkulation & Details',
    compareAdd: '+ Vergleichen',
    compareAdded: '✓ Im Vergleich',
    moreVersions: 'weitere Versionen dieses Modells',
    backToSearch: '← Zurück zur Übersicht',
    waterfallTitle: 'Monatlicher Kosten-Wasserfall (Österreich)',
    waterfallHint: 'Klicke auf einen Balken, um die exakte österreichische Steuerformel & Quelle zu öffnen.',
    tornadoTitle: 'Was wirkt am stärksten? (Sensitivitätsanalyse)',
    tornadoHint: 'Auswirkung auf deine monatlichen Nettokosten in €/Monat:',
    buyOrLeaseTitle: 'Kaufen oder Privatleasen in Österreich?',
    traceTitle: 'Warum dieser Wert? · Formel & Rechtsgrundlage',
    closeLabel: 'Schließen',
  },
  sv: {
    brandSubtitle: 'Österrikiska Bilkalkylen · Regler & priser 2026',
    navFindCar: 'Hitta bil (AT)',
    navTaxGuide: 'Österrikes bilskatter',
    navCompare: 'Jämför',
    mySituation: 'Min situation (AT)',
    heroKicker: 'TOTALKOSTNAD I ÖSTERRIKE · INKL. NOVA, SACHBEZUG & NY ELBILSSKATT',
    heroTitle: 'Hitta bil i Österrike efter månadskostnad',
    heroLead:
      'Vad kostar bilen dig per månad i Österrike, allt inräknat? Jämför kontantköp, billån, privatleasing, eget GmbH och tjänstebil (Dienstwagen) med österrikiska skatteregler.',
    viewAs: 'Visa som:',
    viewCards: 'Kort',
    viewTable: 'Tabell',
    situationBannerTitle: 'Din situation och dina antaganden i Österrike',
    situationBannerHint:
      'Siffrorna uppdateras direkt. Svaren sparas bara lokalt i din webbläsare.',
    presetLabel: 'Välj snabbprofil:',
    kmPerYearLabel: 'Hur långt kör du per år? (km/år)',
    kmPerYearAffect:
      'Påverkar el/drivmedel, värdeminskning, övermil, försäkring och service.',
    businessKmLabel: 'Varav tjänstekörning (km/år)',
    businessKmHint:
      'För tjänsteresor med privat bil ger Österrike 0,50 €/km skattefritt (Kilometergeld). För tjänstebil ger ≤ 6 000 privat-km/år halverat förmånsvärde (halber Sachbezug).',
    bundeslandLabel: 'Förbundsland (Bundesland) & elnätsområde',
    municipalityLabel: 'Stad eller distrikt (valfritt)',
    municipalityPlaceholder: 't.ex. Wien, Linz, Graz, Innsbruck …',
    bundeslandAffect:
      'Styr elnätsavgiften (Netzentgelt via E-Control), försäkringsregion och parkering.',
    taxBracketLabel: 'Din österrikiska marginalskatt (Grenzsteuersatz)',
    accessLabel: 'Hur kan du skaffa bil i Österrike?',
    accessPrivate: 'Privat (Köpa kontant, billån, privatleasing)',
    accessAlways: 'alltid',
    accessSoleTrader:
      'Jag har egen mottagning / firma / Freiberufler (Ordination / EPU – ej GmbH, avdrag mot ESt)',
    accessGmbh: 'Jag har eget österrikiskt GmbH (23 % bolagsskatt KöSt)',
    vatStatusLabel: 'Momsstatus i verksamheten (Vorsteuerabzug):',
    vatExemptYes:
      'Ingen moms / Sjukvård (§ 6 Abs 1 Z 19 UStG – 0 € momsavdrag, kostnader inkl. moms dras av mot skatt)',
    vatExemptNo:
      'Momspliktig verksamhet (20 % momsavdrag på elbil upp till 40 000 €)',
    accessBenefit: 'Arbetsgivaren erbjuder tjänstebil / Dienstwagen (0 % förmånsskatt för elbil)',
    accessSalaryExchange:
      'Arbetsgivaren erbjuder löneväxling (Gehaltsumwandlung på bruttolön)',
    gmbhChannelLabel: 'Uttagskanal ur GmbH:',
    gmbhChannelSalary: 'Lön / Geschäftsführerbezug (ESt)',
    gmbhChannelDividend: 'Utdelning (23 % KöSt + 27,5 % KESt)',
    holdingLabel: 'Hur länge behåller du bilen?',
    yearsUnit: 'år',
    chargingLabel: 'Kan du ladda hemma (laddbox / garage)?',
    chargingYes: 'Ja, hemmaladdning',
    chargingNo: 'Nej, bara publikt (AC/DC)',
    vignetteLabel: 'Inkludera ASFINAG motorvägsvignett (103,80 €/år)',
    filterMaxMonthly: 'Får kosta högst, €/mån',
    filterMaxPrice: 'Högsta listpris, €',
    filterNoLimit: 'Ingen gräns',
    filterPowertrain: 'Drivmedel',
    filterBody: 'Kaross',
    filterBodyHelp: 'Välj en eller flera. Utan val visas alla karosser.',
    filterMinRange: 'Minst elektrisk räckvidd (WLTP), km',
    filterForm: 'Sätt att få bilen',
    filterSearchQuery: 'Sök märke eller modell',
    filterCurrentOnly: 'Bara aktuella österrikiska listpriser',
    filterIncludeStale: 'Visa även versioner med senast kända listpriser',
    filterIncludeUnknownRange: 'Visa även bensin-/dieselbilar utan elräckvidd',
    resetFilters: 'Rensa filter',
    costsYou: 'Kostar dig',
    perMonth: '€/mån',
    spanLabel: 'Troligt spann',
    showCalculation: 'Visa kalkylen',
    compareAdd: '+ Jämför',
    compareAdded: '✓ I Jämför',
    moreVersions: 'versioner till av modellen',
    backToSearch: '← Tillbaka till Hitta bil',
    waterfallTitle: 'Månadskostnadens vattenfall (Österrike)',
    waterfallHint: 'Klicka på en stapel för att se exakt österrikisk skatteformel, indata och lagkälla.',
    tornadoTitle: 'Vad påverkar mest? (Känslighetsanalys)',
    tornadoHint: 'Effekt på din månadskostnad netto i €/mån:',
    buyOrLeaseTitle: 'Köpa eller privatleasa i Österrike?',
    traceTitle: 'Varför denna siffra? · Formel & lagstöd',
    closeLabel: 'Stäng',
  },
};
