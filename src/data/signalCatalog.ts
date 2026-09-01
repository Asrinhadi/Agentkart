import type { SignalCatalogEntry } from '../domain/types.ts';

export const SIGNAL_CATALOG: SignalCatalogEntry[] = [
  {
    type: 'dns_sni',
    label: 'DNS/SNI mot LLM-leverandører',
    proves: 'At noe snakker med et modell-API.',
    weakness: 'Ingen attribuering til hvem eller hvorfor.',
  },
  {
    type: 'proxy_log',
    label: 'Proxy- og brannmurlogg med brukerkontekst',
    proves: 'Kilde-IP, konto og volum knyttet til utgående trafikk.',
    weakness: 'Ser ikke kryptert innhold – krever TLS-inspeksjon.',
  },
  {
    type: 'identity_provider',
    label: 'Entra ID: apper, tjenesteprinsipaler, OAuth-samtykk',
    proves: 'Identitet og faktiske rettigheter i skyen.',
    weakness: 'Sier ingenting om identiteten faktisk brukes.',
  },
  {
    type: 'non_interactive_login',
    label: 'Ikke-interaktive innlogginger',
    proves: 'At identiteten faktisk brukes.',
    weakness: 'Mange falske positive fra vanlig automasjon.',
  },
  {
    type: 'saas_admin_api',
    label: 'SaaS-admin-API (Slack, GitHub Apps, Workspace)',
    proves: 'Tredjepartsagenter med tildelt scope.',
    weakness: 'Krever admin-tilgang per plattform.',
  },
  {
    type: 'edr_process',
    label: 'EDR / prosessinventar',
    proves: 'Lokale agenter, MCP-servere og IDE-verktøy.',
    weakness: 'Bare klienter med agent installert.',
  },
  {
    type: 'finance_invoice',
    label: 'Fakturaer og kortbruk i regnskap',
    proves: 'Skyggeabonnementer ingen har meldt inn.',
    weakness: 'Treg og grovkornet.',
  },
  {
    type: 'repo_scan',
    label: 'Kodeskann etter SDK-er, konfigurasjon og nøkkelreferanser',
    proves: 'Agenter under utvikling.',
    weakness: 'Fanger ikke det som faktisk kjører.',
  },
  {
    type: 'declared_registry',
    label: 'Godkjent register (ikke en teknisk kilde)',
    proves: 'Hva virksomheten mener er godkjent.',
    weakness: 'Sier ingenting om hva som faktisk kjører.',
  },
];
