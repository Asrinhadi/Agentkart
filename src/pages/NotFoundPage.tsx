import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Siden finnes ikke</h1>
      <p className="mt-2 text-sm text-slate-600">
        Ruten du forsøkte å åpne er ikke registrert i Agentkart.
      </p>
      <Link
        to="/"
        className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline"
      >
        Gå til oversikten
      </Link>
    </div>
  );
}
