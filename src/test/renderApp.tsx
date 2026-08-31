import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AgentkartProvider } from '../app/AgentkartContext.tsx';
import { DEMO_NOW } from '../data/demoData.ts';

interface Options {
  initialEntries?: string[];
}

export function renderWithProviders(ui: ReactNode, options: Options = {}) {
  return render(
    <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>
      <AgentkartProvider now={DEMO_NOW}>{ui}</AgentkartProvider>
    </MemoryRouter>,
  );
}
