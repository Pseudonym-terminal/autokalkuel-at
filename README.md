# AUTOKALKÜL · AT 🇦🇹

Österrikisk motsvarighet till Bilkalkylen (tvåspråkig **Tyska 🇦🇹 / Svenska 🇸🇪**) för att hitta och jämföra bilar efter **verklig månadskostnad (TCO)** i Österrike.

## Funktioner

- **Alla 6 österrikiska innehavsformer**:
  - Privat kontantköp (*Privatkauf Bar*)
  - Privat billån (*Privatkauf Kredit*)
  - Privatleasing (*Privatleasing AT*)
  - **Ordination / Praxis / Enskild firma (EPU) – inkl. momsbefriad sjukvård (`§ 6 Abs. 1 Z 19 UStG` & `§ 22 EStG`)** samt **Eget österrikiskt GmbH (`23 % KöSt`)**
  - Tjänstebil (*Dienstwagen / Sachbezug*)
  - Löneväxling (*Gehaltsumwandlung auf Bruttogehalt*)
- **Österrikisk skatte- och regelmotor (2025/2026)**:
  - **NoVA (`§ 6 NoVAG 1991`)**: `(CO₂ − 94) / 5` med avdrag och malus (`0 %` för elbilar).
  - **Motorbezogene Versicherungssteuer (inkl. nya elbilsskatten fr.o.m. 1 april 2025)**: Beräknas på 30-minuters kontinuerlig effekt (*Nenndauerleistung*, fält `P.2`, minus 45 kW) och tjänstevikt (*Eigengewicht*, fält `G`, minus 900 kg).
  - **Sachbezug (`§ 4 Sachbezugswerteverordnung`)**: `0 %` förmånsskatt för `0 g/km` elbilar, `1,5 %` (`≤ 126 g/km`) eller `2,0 %`.
  - **PKW-Angemessenheitsgrenze / Luxustangente (`40.000 €`)**, **Vorsteuerabzug (`40.000 € / 80.000 €`)** och **20 % Öko-Investitionsfreibetrag (`§ 10 EStG`)**.
  - **Alla 9 österrikiska Bundesländer** med elnätspriser (E-Control) och ortsregister.
- **24 frilagda bilmodeller** på vit studiobakgrund med kompletta österrikiska listpriser och tekniska data.

## Kom igång lokalt

```bash
npm install
npm run dev
```

Bygg för produktion:

```bash
npm run build
```
