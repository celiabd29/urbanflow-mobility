import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { NAV_HEIGHT } from '@/components/RouteSheet'

/**
 * Panneau bas affiché aux visiteurs non connectés (accès libre en consultation).
 *
 * La carte et les signalements restent consultables sans compte. Le calcul
 * d'itinéraire, l'enregistrement des trajets, le profil de mobilité et le bilan
 * carbone demandent en revanche une connexion : ce panneau l'explique et y mène.
 */
export default function GuestSheet({ height }) {
  return (
    <section
      aria-label="Accès libre en consultation"
      style={{ height, bottom: NAV_HEIGHT }}
      className="pointer-events-auto fixed inset-x-0 z-[1001] flex flex-col justify-center gap-3 rounded-t-[2rem] bg-white px-6 pb-5 pt-5 shadow-[0_-16px_40px_-20px_rgba(15,23,42,0.4)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/10">
          <MapPin className="size-5 text-[#0F7B58]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Vous explorez en visiteur
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Connectez-vous pour calculer un itinéraire, signaler un incident et
            suivre votre empreinte carbone.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          to="/login"
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#1D9E75] text-sm font-semibold text-white shadow-[0_16px_36px_-14px_rgba(29,158,117,0.9)] transition active:scale-[0.99]"
        >
          Se connecter
        </Link>
        <Link
          to="/register"
          className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300"
        >
          Créer un compte
        </Link>
      </div>
    </section>
  )
}
