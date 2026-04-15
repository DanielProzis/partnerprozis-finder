import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country')
  const type = searchParams.get('type')
  const city = searchParams.get('city') || ''

  if (!country || !type) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const apiKey = process.env.FOURSQUARE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const categoryMap: Record<string, string> = {
    gym: '18008,18010,18011',
    personal_trainer: '18010',
    nutrition_store: '17069,17070',
    fitness_studio: '18008,18011,18012',
    crossfit: '18010',
  }

  const countryNames: Record<string, string> = {
    PT: 'Portugal', ES: 'Spain', FR: 'France', DE: 'Germany', IT: 'Italy',
    GB: 'United Kingdom', NL: 'Netherlands', BE: 'Belgium', PL: 'Poland',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', IE: 'Ireland',
    AT: 'Austria', CH: 'Switzerland',
  }

  const near = city
    ? `${city}, ${countryNames[country] || country}`
    : countryNames[country] || country

  const categories = categoryMap[type] || '18008'

  try {
    const params = new URLSearchParams({
      query: type === 'nutrition_store' ? 'nutrition supplements health food' : 'fitness gym',
      near,
      categories,
      limit: '20',
      fields: 'name,location,tel,website,social_media,rating,categories',
    })

    const res = await fetch(
      `https://api.foursquare.com/v3/places/search?${params}`,
      {
        headers: {
          Authorization: apiKey,
          Accept: 'application/json',
        },
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Foursquare error:', err)
      return NextResponse.json({ error: 'Erro na pesquisa' }, { status: 500 })
    }

    const data = await res.json()
    const places = data.results || []

    const results = places.map((p: any) => ({
      google_place_id: `fsq_${p.fsq_id}`,
      name: p.name || '',
      address: [
        p.location?.address,
        p.location?.postcode,
        p.location?.locality,
      ].filter(Boolean).join(', '),
      city: p.location?.locality || city || '',
      country,
      phone: p.tel || null,
      website: p.website || null,
      email: null,
      instagram: p.social_media?.instagram || null,
      facebook: p.social_media?.facebook || null,
      rating: p.rating ? Math.round(p.rating * 10) / 10 : null,
      type,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
