import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country')
  const type = searchParams.get('type')
  const city = searchParams.get('city') || ''

  if (!country || !type) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const tagMap: Record<string, string> = {
    gym: 'leisure=fitness_centre',
    personal_trainer: 'sport=fitness',
    nutrition_store: 'shop=nutrition_supplements',
    fitness_studio: 'leisure=dance',
    crossfit: 'leisure=fitness_centre',
  }

  const nameMap: Record<string, string> = {
    gym: 'gym|fitness|ginásio|health club',
    personal_trainer: 'personal trainer|fitness coach',
    nutrition_store: 'nutrition|supplement|nutri|health food',
    fitness_studio: 'yoga|pilates|studio',
    crossfit: 'crossfit|cross fit',
  }

  const countryCodeMap: Record<string, string> = {
    PT: 'PT', ES: 'ES', FR: 'FR', DE: 'DE', IT: 'IT',
    GB: 'GB', NL: 'NL', BE: 'BE', PL: 'PL', SE: 'SE',
    NO: 'NO', DK: 'DK', FI: 'FI', IE: 'IE', AT: 'AT', CH: 'CH',
  }

  const tag = tagMap[type] || 'leisure=fitness_centre'
  const [tagKey, tagValue] = tag.split('=')
  const areaQuery = city
    ? `area["name"~"${city}",i]["boundary"="administrative"]->.searchArea;`
    : `area["ISO3166-1"="${countryCodeMap[country] || country}"]->.searchArea;`

  const query = `[out:json][timeout:25];${areaQuery}(node["${tagKey}"="${tagValue}"](area.searchArea);way["${tagKey}"="${tagValue}"](area.searchArea);node["name"~"${nameMap[type]}",i](area.searchArea););out center 20;`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PartnerFinder/1.0',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!overpassRes.ok) {
      const text = await overpassRes.text()
      console.error('Overpass response:', overpassRes.status, text.slice(0, 200))
      return NextResponse.json({ error: `Overpass error: ${overpassRes.status}` }, { status: 500 })
    }

    const data = await overpassRes.json()
    const elements = data.elements || []

    const seen = new Set<string>()
    const results = elements
      .filter((el: any) => el.tags?.name)
      .filter((el: any) => {
        const key = el.tags.name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 20)
      .map((el: any) => {
        const tags = el.tags || {}
        const address = [
          tags['addr:street'],
          tags['addr:housenumber'],
          tags['addr:postcode'],
          tags['addr:city'],
        ].filter(Boolean).join(', ')

        return {
          google_place_id: `osm_${el.type}_${el.id}`,
          name: tags.name || '',
          address: address || '',
          city: tags['addr:city'] || city || '',
          country,
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || null,
          email: tags.email || tags['contact:email'] || null,
          instagram: tags['contact:instagram'] || null,
          facebook: tags['contact:facebook'] || null,
          rating: null,
          type,
        }
      })

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Search error:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}
