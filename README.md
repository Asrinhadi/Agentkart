# Agentkart

Agentkart er en konseptdemo for styring og sikkerhetsoppfølging av KI-agenter. Løsningen sammenligner et godkjent agentregister med tekniske observasjoner og synliggjør skyggeagenter, manglende eierskap og andre kontrollavvik.

**[Åpne live-demoen](https://agentkart-one.vercel.app/)**

![Forhåndsvisning av Agentkart](public/agentkart-preview.png)

> Demoen bruker syntetiske eksempeldata. Importerte JSON-filer behandles lokalt i nettleseren og sendes ikke til en backend.

## Hovedfunksjoner

- Avstemming mellom godkjente og observerte KI-agenter
- Åtte kontrollregler for styring, sikkerhet og etterlevelse
- Prioriterte funn med alvorlighetsgrad, datagrunnlag og anbefalte tiltak
- Lokal JSON-import med streng Zod-validering
- Filtrering av agenter og avvik
- Styringsrapport som kan skrives ut eller lagres som PDF

## Teknologi

React · TypeScript · Vite · Tailwind CSS · React Router · Zod · Vitest

## Kjør lokalt

```bash
git clone https://github.com/Asrinhadi/Agentkart.git
cd Agentkart
npm install
npm run dev
```
