import { useEffect, useState } from 'react'
import { ArrowUpDown, Crosshair, Loader2, MapPin, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BikeAvailability from '@/components/BikeAvailability'
import DisruptionAlert from '@/components/DisruptionAlert'
import JourneySteps from '@/components/JourneySteps'
import { formatCo2, routeToSegments, saveTrajet } from '@/lib/carbon'
import { Leaf } from 'lucide-react'
import {
  PROFILE_LABELS,
  extractError,
  formatDistance,
  formatDuration,
  geocode,
  getDirections,
  getProfiles,
} from '@/lib/routing'

const DEBOUNCE_MS = 350

// --- Champ d'adresse avec autocomplétion ---
function AddressField({ id, label, placeholder, query, setQuery, point, setPoint, onError }) {
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    // Adresse déjà choisie et texte inchangé : inutile de rechercher.
    if (point && query === point.label) return
    if (query.trim().length < 3) {
      setSuggestions([])
      return
    }

    // AbortController + délai : on annule la requête précédente à chaque frappe,
    // ce qui évite qu'une réponse lente écrase une réponse plus récente.
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        setSuggestions(await geocode(query, { signal: controller.signal }))
      } catch (err) {
        const message = extractError(err, "Recherche d'adresse impossible.")
        if (message) onError(message)
      } finally {
        setSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, point, onError])

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            // Le texte a changé : l'ancienne coordonnée n'est plus valable.
            if (point) setPoint(null)
          }}
          className="h-11 w-full rounded-xl border border-border bg-input/60 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {/* Liste de suggestions */}
      {suggestions.length > 0 && !point && (
        <ul className="absolute top-full z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
          {suggestions.map((item, index) => (
            <li key={`${item.lat}-${item.lon}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  setPoint(item)
                  setQuery(item.label)
                  setSuggestions([])
                }}
                className="block w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-secondary"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// --- Panneau principal ---
export default function RoutePlanner({ userPosition, onRouteChange }) {
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [profile, setProfile] = useState('foot-walking')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Empreinte du trajet une fois démarré (Sprint 4).
  const [footprint, setFootprint] = useState(null)
  const [saving, setSaving] = useState(false)

  // Les modes viennent du serveur ; repli sur la liste locale si l'appel échoue.
  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch(() => setProfiles(Object.keys(PROFILE_LABELS)))
  }, [])

  // Utilise la géolocalisation de la carte comme point de départ.
  function useMyPosition() {
    if (!userPosition) return
    const [lat, lon] = userPosition
    const point = { label: 'Ma position', lat, lon }
    setFrom(point)
    setFromQuery(point.label)
  }

  // Inverse départ et arrivée.
  function swap() {
    setFrom(to)
    setTo(from)
    setFromQuery(toQuery)
    setToQuery(fromQuery)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!from || !to) {
      setError('Choisissez un départ et une arrivée dans les suggestions.')
      return
    }

    setLoading(true)
    setFootprint(null) // un nouveau calcul invalide l'empreinte précédente
    try {
      // L'API attend [longitude, latitude].
      const data = await getDirections([from.lon, from.lat], [to.lon, to.lat], profile)
      setResult(data)
      onRouteChange({ ...data, from, to })
    } catch (err) {
      const message = extractError(err, "Impossible de calculer l'itinéraire.")
      if (message) setError(message)
      setResult(null)
      onRouteChange(null)
    } finally {
      setLoading(false)
    }
  }

  // Enregistre le trajet choisi et affiche son empreinte carbone.
  async function handleStartJourney() {
    setError('')
    const segments = routeToSegments(result, profile)
    if (segments.length === 0) {
      setError("Ce trajet n'a pas de distance exploitable.")
      return
    }

    setSaving(true)
    try {
      setFootprint(await saveTrajet(segments))
    } catch (err) {
      const message = extractError(err, "Enregistrement du trajet impossible.")
      if (message) setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Navigation className="size-4 text-primary" aria-hidden="true" />
        Planifier un itinéraire
      </h2>

      {/* Perturbations. Pour un trajet en transport en commun, on connaît les
          lignes empruntées : l'alerte porte alors sur l'itinéraire lui-même.
          Sinon (trajets ORS), elle ne peut porter que sur les modes du profil. */}
      <div className="mb-3">
        {result?.route_disruptions_known ? (
          <DisruptionAlert
            routeDisruptions={result.journeys?.[0]?.disruptions || []}
            routeTotal={result.journeys?.[0]?.disruptions_total || 0}
            accessibilityTotal={result.journeys?.[0]?.accessibility_total || 0}
          />
        ) : (
          <DisruptionAlert />
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AddressField
          id="from"
          label="Départ"
          placeholder="Adresse de départ"
          query={fromQuery}
          setQuery={setFromQuery}
          point={from}
          setPoint={setFrom}
          onError={setError}
        />

        {/* Actions entre les deux champs */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={useMyPosition}
            disabled={!userPosition}
            className="flex items-center gap-1.5 text-xs font-medium text-primary transition hover:opacity-80 disabled:opacity-40"
          >
            <Crosshair className="size-3.5" aria-hidden="true" />
            Ma position
          </button>
          <button
            type="button"
            onClick={swap}
            aria-label="Inverser départ et arrivée"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ArrowUpDown className="size-4" aria-hidden="true" />
          </button>
        </div>

        <AddressField
          id="to"
          label="Arrivée"
          placeholder="Adresse d'arrivée"
          query={toQuery}
          setQuery={setToQuery}
          point={to}
          setPoint={setTo}
          onError={setError}
        />

        {/* Sélecteur de mode */}
        <div className="flex flex-wrap gap-1.5">
          {profiles.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setProfile(value)}
              className={
                profile === value
                  ? 'rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground'
                  : 'rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground'
              }
            >
              {PROFILE_LABELS[value] || value}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {loading ? 'Calcul…' : "Calculer l'itinéraire"}
        </Button>
      </form>

      {/* Résultat */}
      {result && (
        <div className="mt-3 flex items-center justify-around rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">{formatDistance(result.distance_m)}</p>
            <p className="text-[11px] text-muted-foreground">Distance</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-base font-semibold text-primary">{formatDuration(result.duration_s)}</p>
            <p className="text-[11px] text-muted-foreground">Durée</p>
          </div>
        </div>
      )}

      {/* Étapes détaillées, pour les trajets en transport en commun. */}
      {result?.journeys?.[0] && <JourneySteps journey={result.journeys[0]} />}

      {/* Démarrage du trajet : enregistre son empreinte carbone. */}
      {result && !footprint && (
        <Button
          onClick={handleStartJourney}
          disabled={saving}
          className="mt-3 h-11 w-full gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Leaf className="size-4" aria-hidden="true" />
          {saving ? 'Enregistrement…' : 'Démarrer le trajet'}
        </Button>
      )}

      {footprint && (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Leaf className="size-4 shrink-0" aria-hidden="true" />
            Trajet enregistré
          </p>
          <p className="mt-1.5 text-sm text-foreground">
            <span className="font-semibold">{formatCo2(footprint.co2_economise_g)}</span>{' '}
            de CO₂ économisés vs voiture
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Émis : {formatCo2(footprint.co2_emis_g)} sur{' '}
            {footprint.distance_km.toFixed(1).replace('.', ',')} km
          </p>
        </div>
      )}

      {/* Disponibilité des vélos : affichée uniquement pour un trajet à vélo,
          aux deux extrémités — les segments réellement concernés. */}
      {result && profile === 'cycling-regular' && (
        <div className="mt-3 flex flex-col gap-2">
          <BikeAvailability point={from} label="Vélos au départ" />
          <BikeAvailability point={to} label="Vélos à l'arrivée" />
        </div>
      )}
    </div>
  )
}
