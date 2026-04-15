async function handleSearch() {
    setLoading(true)
    setError('')
    setResults([])
    try {
      const params = new URLSearchParams({ country, type: partnerType, city })
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const savedIds = new Set(leads.map(l => l.google_place_id))
      setResults(data.results.map((r: SearchResult) => ({ ...r, saved: savedIds.has(r.google_place_id) })))
      if (data.results.length === 0) setError('Nenhum resultado encontrado. Tenta outra cidade.')
    } catch (e: any) {
      setError(e.message || 'Erro ao pesquisar')
    }
    setLoading(false)
  }
