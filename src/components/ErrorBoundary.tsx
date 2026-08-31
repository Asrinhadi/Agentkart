import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Ingen sensitiv informasjon logges her.
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="mx-auto my-16 max-w-xl rounded-lg border border-red-200 bg-white p-6 text-slate-900 shadow"
        >
          <h1 className="text-lg font-semibold text-red-700">Noe gikk galt</h1>
          <p className="mt-2 text-sm">
            Det oppstod en uventet feil i grensesnittet. Innholdet du så ble ikke sendt ut av
            nettleseren.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Prøv å laste inn på nytt
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
