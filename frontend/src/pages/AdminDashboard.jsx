import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Leaf,
  Loader2,
  Route as RouteIcon,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { MODE_PRESENTATION, formatCo2 } from '@/lib/carbon'
import { extractError } from '@/lib/routing'
import {
  deleteAdminUser,
  getAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '@/lib/admin'
import BottomNav from '@/components/BottomNav'

/** "2026-08-27T14:57:00Z" -> "27 août 2026" */
function formatDate(value) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function displayName(user) {
  return (
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getAdminUsers({ signal: controller.signal })
      .then((data) => setUsers(data.users || []))
      .catch((err) => {
        if (err?.response?.status === 403) {
          // Compte non-admin : cet écran ne le concerne pas.
          navigate('/', { replace: true })
          return
        }
        const message = extractError(err, 'Administration indisponible.')
        if (message) setError(message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [navigate])

  // Remplace un utilisateur dans la liste après une action.
  function replaceUser(updated) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
  }

  async function toggle(user, field) {
    setError('')
    setBusyId(user.id)
    try {
      const updated = await updateAdminUser(user.id, { [field]: !user[field] })
      replaceUser(updated)
      if (expandedId === user.id) setDetail(updated)
    } catch (err) {
      setError(extractError(err, 'Action impossible.'))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(user) {
    setError('')
    setBusyId(user.id)
    try {
      await deleteAdminUser(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      if (expandedId === user.id) setExpandedId(null)
    } catch (err) {
      setError(extractError(err, 'Suppression impossible.'))
    } finally {
      setBusyId(null)
      setConfirmDelete(null)
    }
  }

  async function openDetail(user) {
    if (expandedId === user.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(user.id)
    setDetail(null)
    setDetailLoading(true)
    try {
      setDetail(await getAdminUser(user.id))
    } catch {
      // Le détail est un complément : en cas d'échec, la carte reste utilisable.
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <header className="rounded-b-[2rem] bg-[#0f3d2e] px-5 pb-8 pt-14 text-white shadow-[0_20px_44px_-24px_rgba(15,61,46,0.9)]">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Link
            to="/profil"
            aria-label="Retour au profil"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Administration</h1>
            <p className="text-sm text-white/70">
              {users.length} compte{users.length > 1 ? 's' : ''} enregistré
              {users.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 pb-28">
        {loading && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-slate-400" aria-hidden="true" />
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <ul className="mt-5 flex flex-col gap-3">
          {users.map((user) => {
            const expanded = expandedId === user.id
            const busy = busyId === user.id
            return (
              <li
                key={user.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                {/* Identité + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-sm font-semibold text-white">
                      {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {displayName(user)}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {user.is_staff && (
                      <span className="flex items-center gap-1 rounded-full bg-[#0F7B58]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0F7B58]">
                        <Shield className="size-3" aria-hidden="true" />
                        {user.is_superuser ? 'Super-admin' : 'Admin'}
                      </span>
                    )}
                    {!user.is_active && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Suspendu
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <RouteIcon className="size-3.5 text-[#0F7B58]" aria-hidden="true" />
                    {user.trips_count} trajet{user.trips_count > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Leaf className="size-3.5 text-[#0F7B58]" aria-hidden="true" />
                    {formatCo2(user.co2_saved_g)} CO₂
                  </span>
                  <span>inscrit le {formatDate(user.date_joined)}</span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(user, 'is_active')}
                    className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {user.is_active ? (
                      <>
                        <UserX className="size-3.5" aria-hidden="true" /> Suspendre
                      </>
                    ) : (
                      <>
                        <UserCheck className="size-3.5" aria-hidden="true" /> Réactiver
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(user, 'is_staff')}
                    className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {user.is_staff ? (
                      <>
                        <ShieldOff className="size-3.5" aria-hidden="true" /> Retirer admin
                      </>
                    ) : (
                      <>
                        <Shield className="size-3.5" aria-hidden="true" /> Passer admin
                      </>
                    )}
                  </button>

                  {confirmDelete === user.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(user)}
                        className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {busy && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
                        Confirmer
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmDelete(user.id)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" /> Supprimer
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openDetail(user)}
                    aria-expanded={expanded}
                    className="ml-auto flex items-center gap-1 text-xs font-medium text-[#0F7B58]"
                  >
                    Habitudes
                    {expanded ? (
                      <ChevronUp className="size-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Détail : habitudes de déplacement + derniers trajets */}
                {expanded && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    {detailLoading || !detail ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden="true" />
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-slate-700">
                          Habitudes de déplacement
                        </p>
                        {detail.par_mode.length === 0 ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Aucun trajet enregistré.
                          </p>
                        ) : (
                          <ul className="mt-1.5 flex flex-col gap-1">
                            {detail.par_mode.map((m) => (
                              <li
                                key={m.mode}
                                className="flex items-center justify-between text-xs text-slate-600"
                              >
                                <span>{MODE_PRESENTATION[m.mode]?.label || m.mode}</span>
                                <span className="text-slate-500">
                                  {m.distance_km.toFixed(1).replace('.', ',')} km ·{' '}
                                  {formatCo2(m.co2_g)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <p className="mt-3 text-xs font-semibold text-slate-700">
                          Total : {formatCo2(detail.co2_saved_g)} CO₂ économisés sur{' '}
                          {detail.distance_km.toFixed(1).replace('.', ',')} km
                        </p>

                        {detail.recent_trips.length > 0 && (
                          <>
                            <p className="mt-3 text-xs font-semibold text-slate-700">
                              Derniers trajets
                            </p>
                            <ul className="mt-1.5 flex flex-col gap-1">
                              {detail.recent_trips.map((t) => (
                                <li key={t.id} className="text-xs text-slate-600">
                                  <span className="text-slate-400">
                                    {formatDate(t.date_trajet)} ·{' '}
                                  </span>
                                  {(t.depart || 'Départ') + ' → ' + (t.arrivee || 'Arrivée')}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <BottomNav />
    </div>
  )
}
