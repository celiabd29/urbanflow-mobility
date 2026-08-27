import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpDown, Crosshair, Loader2, MapPin } from 'lucide-react'
import { extractError, geocode } from '@/lib/routing'

const DEBOUNCE_MS = 350

// --- Champ d'adresse avec autocomplétion ---
function AddressField({ id, placeholder, query, setQuery, point, setPoint, onError }) {
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
    <div className="relative">
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
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
          className="h-12 w-full rounded-full bg-white py-2 pl-11 pr-10 text-sm font-medium text-slate-900 shadow-md outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-[#1D9E75]/40"
        />
        {searching && (
          <Loader2
            className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400"
            aria-hidden="true"
          />
        )}
      </div>

      {suggestions.length > 0 && !point && (
        <ul className="absolute top-full z-10 mt-1.5 max-h-52 w-full overflow-y-auto rounded-2xl bg-white py-1 shadow-xl">
          {suggestions.map((item, index) => (
            <li key={`${item.lat}-${item.lon}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  setPoint(item)
                  setQuery(item.label)
                  setSuggestions([])
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
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

/**
 * Zone 2 : recherche d'adresses, en surimpression de la carte.
 *
 * Deux visages selon l'état de l'écran. En saisie, les deux champs sont
 * dépliés ; une fois l'itinéraire calculé, seule la destination reste, sur une
 * seule ligne, comme sur la maquette écran 4 — la carte reprend la place.
 */
export default function SearchOverlay({
  phase,
  fromQuery,
  setFromQuery,
  toQuery,
  setToQuery,
  from,
  setFrom,
  to,
  setTo,
  userPosition,
  onError,
  onBack,
  onEdit,
}) {
  // Utilise la géolocalisation de la carte comme point de départ.
  function useMyPosition() {
    if (!userPosition) return
    const [lat, lon] = userPosition
    const point = { label: 'Ma position', lat, lon }
    setFrom(point)
    setFromQuery(point.label)
  }

  function swap() {
    setFrom(to)
    setTo(from)
    setFromQuery(toQuery)
    setToQuery(fromQuery)
  }

  if (phase === 'result') {
    return (
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Modifier l'itinéraire"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-slate-50"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-white px-4 text-left text-sm font-medium text-slate-700 shadow-md transition hover:bg-slate-50"
        >
          <span className="truncate">{to?.label || 'Destination'}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      <AddressField
        id="from"
        placeholder="Adresse de départ"
        query={fromQuery}
        setQuery={setFromQuery}
        point={from}
        setPoint={setFrom}
        onError={onError}
      />

      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={useMyPosition}
          disabled={!userPosition}
          className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-[#1D9E75] shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-40"
        >
          <Crosshair className="size-3.5" aria-hidden="true" />
          Ma position
        </button>
        <button
          type="button"
          onClick={swap}
          aria-label="Inverser départ et arrivée"
          className="flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-700"
        >
          <ArrowUpDown className="size-4" aria-hidden="true" />
        </button>
      </div>

      <AddressField
        id="to"
        placeholder="Adresse d'arrivée"
        query={toQuery}
        setQuery={setToQuery}
        point={to}
        setPoint={setTo}
        onError={onError}
      />
    </div>
  )
}
