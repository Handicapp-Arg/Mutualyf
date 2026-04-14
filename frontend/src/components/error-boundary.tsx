import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-bold text-slate-600">
              Algo salió mal. Recargá la página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-corporate px-4 py-2 text-sm font-medium text-white hover:bg-corporate/90"
            >
              Recargar
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
