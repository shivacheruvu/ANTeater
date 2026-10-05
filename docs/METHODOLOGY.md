# How the ANTeater score works

Every product gets a score from 0 to 100, built from three parts. The code is in
[`src/score.js`](../src/score.js) and the additive list is in
[`src/additives.js`](../src/additives.js).

| Part | Points | Source |
|---|---|---|
| Nutrition | 60 | The product's Nutri-Score grade: A = 60, B = 45, C = 30, D = 15, E = 0 |
| Additives | 30 | Start at 30, minus 12 per high-risk, 6 per moderate-risk and 2 per limited-risk additive (floor 0) |
| Organic | 10 | 10 if the product carries an organic certification |

Two more rules:

- **High-risk cap.** If a product contains any high-risk additive, the total is capped at 49, so it can never rate Good or Excellent.
- **Missing data is scaled, not punished.** If a part is unknown (for example, no Nutri-Score), the known parts are scaled up to 100. A product with neither a Nutri-Score nor an ingredient list gets no score.

| Score | Rating |
|---|---|
| 75–100 | Excellent |
| 50–74 | Good |
| 25–49 | Poor |
| 0–24 | Bad |

The 60/30/10 split follows the same broad weighting popular scanning apps use publicly. The thresholds,
penalties and additive tiers are this project's own and are open to change.

## Additive tiers

Tiers summarise public regulatory positions and published research. They are informational, not medical advice.

- **High:** banned or de-authorised by a major regulator, or linked to cancer by IARC through its main use (nitrites in processed meat, titanium dioxide, Red No. 3, BHA, potassium bromate).
- **Moderate:** carries a mandatory warning, is classified IARC Group 2B, or has repeated study signals that regulators are still reviewing (Southampton colours, sodium benzoate, aspartame, carrageenan, some emulsifiers and sweeteners).
- **Limited:** safe at normal intake, with caveats for heavy consumption or sensitive people (phosphates, MSG).
- **No known risk:** common, well-studied additives (citric acid, lecithins, pectin, vitamins C and E).
- Additives not in the list show as **Not rated** and carry no penalty.

## Sources

- EFSA: titanium dioxide (E171) safety assessment, 2021; phosphates (E338–E452) re-evaluation, 2019; carrageenan (E407) re-evaluation, 2018 — https://www.efsa.europa.eu
- IARC Monographs: processed meat (Vol. 114); aspartame (Vol. 134, 2023); BHA, 4-MEI and potassium bromate (Group 2B) — https://monographs.iarc.who.int
- US FDA: revocation of authorization for FD&C Red No. 3, January 2025 — https://www.fda.gov
- EU Regulation (EC) No 1333/2008, Annex V: warning label for six azo colours (the "Southampton colours")
- NutriNet-Santé cohort studies on emulsifiers and artificial sweeteners (BMJ 2022, BMJ 2023)
- Product data: [Open Food Facts](https://world.openfoodfacts.org), Open Database License; images CC BY-SA
