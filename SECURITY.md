# Sikkerhet

Agentkart er en **statisk konseptdemo** som kjører fullt og helt i brukerens nettleser. Den har verken backend, brukerinnlogging eller kobling til reelle datakilder. Sikkerhetsmodellen tar hensyn til dette.

## Trusselomfang

- Ondsinnede eller feilformaterte JSON-filer som lastes opp av bruker.
- Cross-site scripting (XSS) via importert innhold eller URL-er.
- Overbelastning av nettleseren gjennom store filer eller massevis av poster (minne/DoS).
- Datalekkasje til tredjepart via nettverkskall.
- Klientside-avhengigheter med kjente sårbarheter.
- Misvisende innhold som forsøker å utgi seg for å være noe annet (falsk innlogging, imitasjon av virksomhetens systemer).

## Beskyttelsestiltak i demoen

- **Ingen dataoverføring.** Ingen `fetch`, `XHR`, WebSockets, telemetri eller analyseverktøy.
- **Ingen persistens.** Ingen bruk av `localStorage`, `sessionStorage` eller cookies for importerte data.
- **Streng validering.** Zod-skjemaer med `.strict()` avviser ukjente felter. Antalls- og lengdegrenser hindrer misbruk av store filer.
- **Filsjekk.** Filstørrelse, filendelse og MIME-type kontrolleres før parsing.
- **Sikker rendering.** Ingen `dangerouslySetInnerHTML`, ingen `eval`, ingen `Function`, ingen dynamisk kodekjøring.
- **Trygg URL-håndtering.** Importerede URL-er vises som tekst med mindre protokollen er eksplisitt `https:`. Eksterne lenker bruker `rel="noopener noreferrer"`.
- **Error boundary.** Uventede feil vises som en trygg melding uten stack trace.
- **Sikkerhetsheadere** definert i `vercel.json`, inkludert CSP med `frame-ancestors 'none'`.
- **Minimal avhengighetsflate.** Kun de bibliotekene demoen faktisk trenger.

## Hva demoen ikke beskytter mot

- Manipulasjon av kildekoden av personer med skrivetilgang til distribusjonen.
- Sårbarheter i grunnleggende nettleser eller operativsystem.
- Falske observasjoner som ligner ekte agenter – demoen kan ikke gjenkjenne dette uten mer kontekst.

En reell produksjonsversjon må ha egne sikkerhetstiltak som ikke er implementert her (SSO, RBAC, revisjonslogg, secrets manager, kryptering i hvile med mer). Se `docs/THREAT_MODEL.md` og README-avsnittet «Videreutvikling».

## Rapportering av sårbarheter

Fordi dette er en pedagogisk demo tas eventuelle sårbarhetsfunn imot som issues, uten formelt CVE-løp.
