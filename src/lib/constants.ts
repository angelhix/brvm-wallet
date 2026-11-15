export const APP_NAME = "Kauri";
export const APP_VERSION = "1.0.0";
export const APP_TAGLINE = "Ton solde n'est pas ta performance.";

export const SECTORS = [
  "Services financiers",
  "Télécommunications",
  "Consommation de base",
  "Consommation discrétionnaire",
  "Industriels",
  "Énergie",
  "Services publics",
] as const;

export const SECTOR_COLORS: Record<string, string> = {
  "Services financiers": "var(--chart-1)",
  "Télécommunications": "var(--chart-2)",
  "Consommation de base": "var(--chart-3)",
  "Consommation discrétionnaire": "var(--chart-4)",
  Industriels: "var(--chart-5)",
  "Énergie": "var(--chart-6)",
  "Services publics": "var(--chart-7)",
  "Liquidité": "var(--muted-foreground)",
};

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)"];

/** Indicative IRVM withholding rates on listed-share dividends, editable on every entry. */
export const IRVM_RATES: Record<string, number> = {
  "Côte d'Ivoire": 0.1,
  "Sénégal": 0.1,
  "Burkina Faso": 0.125,
  "Bénin": 0.1,
  "Mali": 0.1,
  "Niger": 0.1,
  "Togo": 0.03,
  "Guinée-Bissau": 0.1,
};

export const TX_TYPES = [
  { value: "acquisition", label: "Acquisition" },
  { value: "cession", label: "Cession" },
  { value: "depot", label: "Dépôt" },
  { value: "retrait", label: "Retrait" },
  { value: "dividende", label: "Dividende" },
  { value: "frais", label: "Frais" },
] as const;

export const TX_LABEL: Record<string, string> = Object.fromEntries(TX_TYPES.map((t) => [t.value, t.label]));

export const INDEX_LABELS: Record<string, string> = {
  BRVMC: "BRVM Composite",
  BRVM30: "BRVM 30",
  BRVMPR: "BRVM Prestige",
};

export const DISCLAIMER =
  "Kauri est un service indépendant, sans lien avec la BRVM. Les informations affichées ne constituent pas un conseil en investissement ; les performances passées ne préjugent pas des performances futures.";

export const DEMO_DATA_NOTICE =
  "Cours de démonstration : les données de marché affichées sont illustratives tant que la source officielle n'est pas branchée.";
