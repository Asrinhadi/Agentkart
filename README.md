# Agentkart

**Deklarert vs. observert.** Konseptdemo som synliggjør gapet mellom hva virksomheten har godkjent i registeret og hva tekniske kilder faktisk observerer om autonome agenter.

> Konseptdemo – funnene kommer fra importerte JSON-filer, ikke fra en aktiv skanning.

---

## Kjør lokalt

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run test:run   # 48 tester
npm run lint       # oxlint
npm run build      # produksjonsbygg til dist/
```

---

## Stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · React Router 7 · Zod 4 · Vitest · oxlint

Ingen backend. Ingen database. Ingen nettverkskall. Alt kjører i nettleseren.

---

## Hva den viser

- **8 kontrollregler (AK-R1…AK-R8):** skyggeagenter, manglende eier, ukontrollert skrivetilgang, uverifiserte MCP-servere, utdatert vurdering, motstridende metadata, manglende logging.
- **Reconciliation-motor** som matcher deklarert mot observert *deterministisk* (ingen fuzzy-sammenslåing).
- **Seks ruter:** oversikt, agentinventar, agentdetaljer, avvik, datakilder, kontrollregler.
- **Lokal JSON-import** (register + observasjoner) med streng Zod-validering.

---

## Sikkerhet

Bygget for å publiseres offentlig:

- Ingen `fetch`, `XHR`, `WebSocket`, telemetri eller eksterne CDN-er.
- Ingen `localStorage`, `sessionStorage` eller cookies for importert data.
- Ingen `dangerouslySetInnerHTML`, `eval` eller `Function`.
- Zod `.strict()`, 1 MB / 500-poster / lengdegrenser på all import.
- URL-er vises som tekst; kun `https:` blir klikkbar lenke med `rel="noopener noreferrer"`.
- Error boundary uten stack trace.
- Streng CSP i `vercel.json`: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` og Cross-Origin-*.

Full trusselmodell: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) · Se også [`SECURITY.md`](SECURITY.md).

---

## Struktur

```
src/
  app/         React-rot og global state
  components/  Delte UI-byggeklosser
  data/        Innebygde demodata
  domain/      Reconciliation + kontrollregler (rene funksjoner)
  layouts/     Toppfelt + meny
  pages/       Én komponent per rute
  schemas/     Zod-skjemaer
  services/    Lokal JSON-import
  test/        Vitest-oppsett
public/examples/   Eksempel-JSON for import
docs/              Threat model
```

---

## Videre til produksjon

Ikke en del av demoen, men den naturlige neste fasen:
SSO/OIDC · RBAC · backend · PostgreSQL · kryptering i transport og hvile · tenant-isolasjon · append-only revisjonslogg · secrets manager · sikre adaptere mot ekte datakilder.

---

## Lisens

Konseptdemo – ingen kunde- eller personopplysninger, kun fiktive eksempler.
