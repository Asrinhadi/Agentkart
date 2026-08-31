# Trusselmodell – Agentkart (konseptdemo)

Dette dokumentet beskriver trusselmodellen for **den statiske konseptdemoen** Agentkart. En reell produksjonsløsning krever en egen, mer omfattende trusselmodell som ikke er dekket her.

## 1. Verdier som skal beskyttes

- **Brukerens sesjon i nettleseren.** Selv om demoen ikke behandler reelle personopplysninger, vil et brudd (f.eks. XSS) kunne bli utnyttet mot en fremtidig integrert versjon.
- **Rykte og troverdighet.** Feilaktig gjengivelse av importert innhold, eller en imitasjon av godkjenninger, kan skade tilliten til konseptet og til de personer/organisasjoner som viser det frem.
- **Integritet i importert innhold.** Brukeren skal kunne stole på at det som vises samsvarer med det som ble lastet inn.

## 2. Tillitsgrenser

| Fra                                   | Til                                   | Antakelse                                 |
| ------------------------------------- | ------------------------------------- | ----------------------------------------- |
| Brukerens filsystem                   | Nettleseren (via File API)            | Bruker kontrollerer filinnholdet.         |
| Nettleseren                           | Statisk hostede filer (HTML/JS/CSS)   | Distribusjon er signert av utgiver.       |
| Nettleseren                           | Eksterne tjenester                    | **Ingen kall skal skje.**                 |
| Nettleseren                           | Nettleserens persistente lagre        | **Ingen import lagres persistent.**       |

## 3. Trusler og tiltak

### 3.1 Ondsinnede eller feilformaterte JSON-filer

**Trussel.** En bruker – eller noen som gir en fil til brukeren – forsøker å utnytte parseren, gjøre appen ustabil, eller lure kontrollreglene.

**Tiltak.**

- Filstørrelse maksimalt 1 MB.
- Filendelse `.json` kreves; MIME-type sjekkes når kjent.
- `JSON.parse` med try/catch.
- Zod `.strict()`-skjemaer avviser ukjente felter og feil typer.
- Maks 500 poster og maks lengde per tekstfelt.
- ISO 8601-datoer valideres.

### 3.2 XSS

**Trussel.** Importerte tekststrenger inneholder HTML eller JavaScript og gjengis som markup.

**Tiltak.**

- All rendering går gjennom React, som escaper tekst.
- Ingen `dangerouslySetInnerHTML`, ingen `innerHTML`.
- Ingen `eval`, `Function`, eller dynamisk laster kode fra importert innhold.
- URL-er vises som tekst; kun `https:` blir klikkbare lenker med `rel="noopener noreferrer"`.
- CSP i `vercel.json` begrenser hva som kan lastes, inklusive `default-src 'self'` og `object-src 'none'`.

### 3.3 Minne-/DoS-angrep gjennom store filer

**Trussel.** En stor fil får nettleseren til å henge eller krasje.

**Tiltak.**

- Størrelsesbegrensning før lesing.
- Antallsbegrensning på poster og elementer i arrays.
- Ingen rekursive datastrukturer aksepteres av skjemaet.

### 3.4 Datalekkasje

**Trussel.** Innhold sendes utilsiktet til tredjepart.

**Tiltak.**

- Ingen `fetch` / `XHR` / WebSockets bygget inn i appen.
- CSP `connect-src 'self'` blokkerer eksterne HTTP-kall.
- Ingen skript eller stiler fra CDN.
- Ingen eksterne fonter eller bilder.
- Ingen analyseverktøy eller telemetri.

### 3.5 Avhengighetsrisiko

**Trussel.** En sårbarhet i en pakke rammer applikasjonen.

**Tiltak.**

- Avhengighetsflaten holdes minimal (React, React Router, Zod, Lucide, Tailwind, testverktøy).
- `npm audit --omit=dev` kan kjøres for overvåking.
- Ingen dynamisk henting av avhengigheter i runtime.

### 3.6 Misvisende eller falske observasjoner

**Trussel.** Noen produserer en fil som får appen til å påstå at ekte agenter er «i orden» eller «kritiske».

**Tiltak i demoen.**

- Grensesnittet er tydelig på at data kommer fra **importerte** observasjoner.
- Ingen påstand om at det er utført en reell nettverksskanning.
- Provenance (kilde, tid, confidence) vises for hver observasjon.
- Reglene er transparente og forklarer hvorfor et avvik oppstod.

### 3.7 Feilaktig sammenkobling av agenter

**Trussel.** Reconciliation slår sammen to ulike agenter til én, eller motsatt splitter en enkelt agent i to.

**Tiltak.**

- Kun eksakte, deterministiske matching-regler brukes.
- Ved tvetydige treff slås poster **ikke** sammen; de merkes «Må bekreftes».
- Ingen fuzzy matching.

## 4. Restrisiko

- Falske observasjoner som ligner ekte agenter kan ikke oppdages uten uavhengig verifisering.
- En bruker med kontroll over distribusjonen kan naturligvis endre applikasjonens oppførsel.
- Nettleser- eller OS-sårbarheter er utenfor demoens kontroll.

## 5. Forskjellen mellom demo og produksjon

Denne demoen fokuserer på **konseptet** og **frontendens sikkerhetsvalg**. En reell produksjonsversjon vil kreve:

- SSO/OIDC og RBAC.
- Backend som holder sensitive integrasjoner og hemmeligheter.
- Kryptert lagring, tenant-isolasjon og revisjonslogg.
- Køer og sandboxing for tunge analyser.
- Retention- og minimeringspolicyer.
- Egen trusselmodell og penetrasjonstest før idriftsettelse.

Ingen av disse tiltakene er implementert i demoen.
