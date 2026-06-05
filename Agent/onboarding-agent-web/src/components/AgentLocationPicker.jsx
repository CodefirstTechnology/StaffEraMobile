import { useEffect, useState } from 'react'
import { getPlaceDetails, reverseGeocode, searchPlaces } from '../lib/geo'

const DEFAULT = { latitude: 19.076, longitude: 72.8777 }

function inputClass() {
  return 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
}

export function AgentLocationPicker({ value, onChange, label = 'Agency location', required }) {
  const [query, setQuery] = useState(value?.address || '')
  const [predictions, setPredictions] = useState([])
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [anchor, setAnchor] = useState({
    latitude: value?.latitude ?? DEFAULT.latitude,
    longitude: value?.longitude ?? DEFAULT.longitude,
  })

  useEffect(() => {
    if (value?.address) setQuery(value.address)
  }, [value?.address])

  useEffect(() => {
    if (!query.trim() || query === value?.address) {
      setPredictions([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchPlaces(query, anchor)
        setPredictions(results)
      } catch {
        setPredictions([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, anchor.latitude, anchor.longitude, value?.address])

  const apply = (location) => {
    onChange(location)
    setQuery(location.address)
    setPredictions([])
    setAnchor({ latitude: location.latitude, longitude: location.longitude })
  }

  const pick = async (placeId) => {
    setResolving(true)
    try {
      apply(await getPlaceDetails(placeId))
    } catch (e) {
      window.alert(e.response?.data?.message || 'Could not load place details')
    } finally {
      setResolving(false)
    }
  }

  const useGps = () => {
    if (!navigator.geolocation) {
      window.alert('Geolocation is not supported in this browser')
      return
    }
    setResolving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          apply(
            await reverseGeocode(pos.coords.latitude, pos.coords.longitude),
          )
        } catch (e) {
          window.alert(e.response?.data?.message || 'Could not read your location')
        } finally {
          setResolving(false)
        }
      },
      () => {
        setResolving(false)
        window.alert('Location permission denied')
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <div className="flex gap-2">
        <input
          className={inputClass()}
          placeholder="Search office, area, or landmark"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          onClick={useGps}
          disabled={resolving}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
        >
          📍 GPS
        </button>
      </div>
      {(searching || resolving) && (
        <p className="text-xs text-subtext">Loading…</p>
      )}
      {predictions.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white text-sm shadow-sm">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-primary/5"
                onClick={() => pick(p.placeId)}
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value?.address && value.latitude != null && value.longitude != null ? (
        <p className="text-xs text-subtext">
          Selected: {value.address}
          {value.city ? ` · ${value.city}` : ''}
        </p>
      ) : (
        <p className="text-xs text-subtext">Pick a location from search or GPS (required).</p>
      )}
    </div>
  )
}
