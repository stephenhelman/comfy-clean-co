import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

function addressKey(address: string, city: string, zip: string) {
  return createHash('sha256').update(`${address}|${city}|${zip}`).digest('hex').slice(0, 32)
}

async function geocodeAddress(address: string, city: string, zip: string) {
  const query = encodeURIComponent(`${address}, ${city}, TX ${zip}`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ComfyCleanCo-Admin/1.0 (admin@comfycleanco.com)' },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null

  const data = await res.json()
  if (!data.length) return null

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

// POST /api/jobs/geocode — geocodes a list of addresses, returns lat/lng per job
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { addresses } = await req.json() as {
    addresses: { jobId: string; serviceAddress: string; serviceCity: string; serviceZip: string }[]
  }

  const results: Record<string, { lat: number; lng: number }> = {}

  for (const item of addresses) {
    const key = addressKey(item.serviceAddress, item.serviceCity, item.serviceZip)

    // Check cache
    const cached = await db.geocodedAddress.findUnique({ where: { addressKey: key } })
    if (cached) {
      results[item.jobId] = { lat: cached.lat, lng: cached.lng }
      continue
    }

    // Geocode
    try {
      const coords = await geocodeAddress(item.serviceAddress, item.serviceCity, item.serviceZip)
      if (coords) {
        await db.geocodedAddress.create({
          data: { addressKey: key, lat: coords.lat, lng: coords.lng },
        })
        results[item.jobId] = coords
      }
    } catch {
      // Silently omit on failure
    }

    // Nominatim rate limit — 1 req/sec
    await new Promise((r) => setTimeout(r, 1100))
  }

  return NextResponse.json(results)
}
