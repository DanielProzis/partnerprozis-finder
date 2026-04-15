import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country')
  const type = searchParams.get('type')
  const city = searchParams.get('city') || ''

  if (!country || !type) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const queryMap: Record<string, string> = {
    gym: 'gym fitness center',
    personal_trainer: 'personal trainer fitness',
    nutrition_store: 'nutrition store supplements health food',
    fitness_studio: 'yoga pilates fitness studio',
    crossfit: 'crossfit box',
  }

  const countryNames: Record<string, string> = {
    PT: 'Portugal', ES: 'Spain', FR: 'France', DE: 'Germany', IT: 'Italy',
    GB: 'United Kingdom', NL: 'Netherlands', BE: 'Belgium', PL: 'Poland',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', IE: 'Ireland',
    AT: 'Austria', CH: 'Switzerland',
  }

  const textQuery = `${queryMap[type] || type} ${city} ${countryNames[country] || country}`

  try {
    const params = new URLSearchParams({
      query: textQuery,
      key: apiKey,
      language: 'pt',
      region: country.toLowerCase(),
    })

    const placesRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
    )

    const data = await placesRes.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ error: data.status, detail: data.error_message }, { status: 500 })
    }

    const places = data.results || []

    const results = await Promise.all(
      places.slice(0, 20).map(async (p: any) => {
        let phone = null
        let website = null
        try {
          const detailParams = new URLSearchParams({
            place_id: p.place_id,
            fields: 'formatted_phone_number,website',
            key: apiKey,
            language: 'pt',
          })
          const detailRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${detailParams}`
          )
          const detailData = await detailRes.json()
          if (detailData.result) {
            phone = detailData.result.formatted_phone_number || null
            website = detailData.result.website || null
          }
        } catch (e) {}

        return {
          google_place_id: p.place_id,
          name: p.name || '',
          address: p.formatted_address || '',
          city: city || extractCity(p.formatted_address),
          country,
          phone,
          website,
          rating: p.rating || null,
          type,
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function extractCity(address: string): string {
  if (!address) return ''
  const parts = address.split(',')
  return parts.length >= 2 ? parts[parts.length - 2].trim() : ''
}
