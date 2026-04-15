'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SearchResult, Lead, PARTNER_TYPES, EUROPEAN_COUNTRIES, PartnerType } from '@/lib/types'
import * as XLSX from 'xlsx'

type Tab = 'search' | 'leads'

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  to_contact: { label: 'A contactar', badge: 'badge-blue' },
  contacted: { label: 'Contactado', badge: 'badge-yellow' },
  partner: { label: 'Parceiro', badge: 'badge-green' },
  not_interested: { label: 'Sem interesse', badge: 'badge-gray' },
}

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('search')
  const [country, setCountry] = useState('PT')
  const [partnerType, setPartnerType] = useState<PartnerType>('gym')
  const [city, setCity] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState('')
  const [user, setUser] = useState<any>(null)
  const [leadsFilter, setLeadsFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUser(data.user)
    })
    fetchLeads()
  }, [])

  async function getAuthHeader() {
    const { data } = await supabase.auth.getSession()
    return `Bearer ${data.session?.access_token}`
  }

  async function fetchLeads() {
    const auth = await getAuthHeader()
    const res = await fetch('/api/leads', { headers: { Authorization: auth } })
    const data = await res.json()
    if (data.leads) setLeads(data.leads)
  }

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
    } catch (e: any) {
      setError(e.message || 'Erro ao pesquisar')
    }
    setLoading(false)
  }

  async function saveLead(result: SearchResult) {
    setSaving(result.google_place_id)
    const auth = await getAuthHeader()
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(result),
    })
    await fetchLeads()
    setResults(prev => prev.map(r =>
      r.google_place_id === result.google_place_id ? { ...r, saved: true } : r
    ))
    setSaving(null)
  }

  async function updateLead(id: string, updates: Partial<Lead>) {
    const auth = await getAuthHeader()
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id, ...updates }),
    })
    await fetchLeads()
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, ...updates } : null)
  }

  async function deleteLead(id: string) {
    const auth = await getAuthHeader()
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE', headers: { Authorization: auth } })
    await fetchLeads()
    setSelectedLead(null)
  }

  function exportToExcel() {
    const data = leads.map(l => ({
      Nome: l.name, Tipo: PARTNER_TYPES[l.type as PartnerType]?.label || l.type,
      País: l.country, Cidade: l.city, Morada: l.address,
      Telefone: l.phone || '', Email: l.email || '', Website: l.website || '',
      Instagram: l.instagram || '', Facebook: l.facebook || '',
      Avaliação: l.rating || '', Status: STATUS_LABELS[l.status]?.label || l.status,
      Notas: l.notes || '', 'Data Adicionado': new Date(l.created_at).toLocaleDateString('pt-PT'),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, `partner-finder-leads-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const filteredLeads = leadsFilter === 'all' ? leads : leads.filter(l => l.status === leadsFilter)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 16
          }}>P</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Partner Finder</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</span>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => { supabase.auth.signOut(); router.push('/login') }}>
            Sair
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4, width: 'fit-content' }}>
          {([['search', '🔍 Pesquisar'], ['leads', `📋 Leads (${leads.length})`]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as Tab)} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-muted)',
              border: 'none'
            }}>{label}</button>
          ))}
        </div>

        {tab === 'search' && (
          <div>
            {/* Search filters */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>País</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{
                    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                    border: '1.5px solid var(--border)', background: 'var(--bg)'
                  }}>
                    {EUROPEAN_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Tipo de Parceiro</label>
                  <select value={partnerType} onChange={e => setPartnerType(e.target.value as PartnerType)} style={{
                    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                    border: '1.5px solid var(--border)', background: 'var(--bg)'
                  }}>
                    {Object.entries(PARTNER_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Cidade (opcional)</label>
                  <input value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Lisboa, Porto, Madrid..."
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                      border: '1.5px solid var(--border)', background: 'var(--bg)'
                    }}
                  />
                </div>
              </div>
              <button className="btn-primary" onClick={handleSearch} disabled={loading} style={{ minWidth: 140 }}>
                {loading ? '⏳ A pesquisar...' : '🔍 Pesquisar'}
              </button>
              {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>⚠️ {error}</p>}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {results.length} resultados encontrados
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {results.map(r => (
                    <div key={r.google_place_id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, background: 'var(--accent-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0
                      }}>
                        {PARTNER_TYPES[r.type as PartnerType]?.emoji || '🏢'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{r.name}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.address}</p>
                          </div>
                          {r.rating && (
                            <span className="badge badge-yellow" style={{ flexShrink: 0 }}>
                              ⭐ {r.rating}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          {r.phone && <a href={`tel:${r.phone}`} style={{ fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>📞 {r.phone}</a>}
                          {r.website && <a href={r.website} target="_blank" style={{ fontSize: 13, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 4 }}>🌐 Website</a>}
                          <div style={{ flex: 1 }} />
                          <button
                            onClick={() => !r.saved && saveLead(r)}
                            disabled={r.saved || saving === r.google_place_id}
                            style={{
                              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                              background: r.saved ? 'var(--accent-light)' : 'var(--accent)',
                              color: r.saved ? 'var(--accent)' : 'white',
                              border: r.saved ? '1px solid var(--accent)' : 'none',
                              cursor: r.saved ? 'default' : 'pointer',
                            }}>
                            {saving === r.google_place_id ? '...' : r.saved ? '✓ Guardado' : '+ Guardar Lead'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && results.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ fontSize: 16, fontWeight: 500 }}>Escolhe um país e tipo de parceiro para começar</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>Os resultados aparecerão aqui com telefones, websites e avaliações</p>
              </div>
            )}
          </div>
        )}

        {tab === 'leads' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'to_contact', 'contacted', 'partner', 'not_interested'] as const).map(s => (
                  <button key={s} onClick={() => setLeadsFilter(s)} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: leadsFilter === s ? 'var(--text)' : 'var(--surface)',
                    color: leadsFilter === s ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border)'
                  }}>
                    {s === 'all' ? `Todos (${leads.length})` : STATUS_LABELS[s]?.label}
                  </button>
                ))}
              </div>
              <button className="btn-secondary" onClick={exportToExcel} style={{ fontSize: 13 }}>
                📥 Exportar Excel
              </button>
            </div>

            {filteredLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <p style={{ fontSize: 16, fontWeight: 500 }}>Sem leads aqui</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>Vai a Pesquisar e guarda parceiros para os veres aqui</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: selectedLead ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {filteredLeads.map(lead => (
                    <div key={lead.id} className="card" onClick={() => { setSelectedLead(lead); setNotes(lead.notes || '') }}
                      style={{
                        padding: '1rem 1.25rem', cursor: 'pointer',
                        border: selectedLead?.id === lead.id ? '1.5px solid var(--accent)' : '1px solid var(--border)'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 8, background: 'var(--accent-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, flexShrink: 0
                        }}>
                          {PARTNER_TYPES[lead.type as PartnerType]?.emoji || '🏢'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</p>
                              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.city}, {lead.country}</p>
                            </div>
                            <span className={`badge ${STATUS_LABELS[lead.status]?.badge || 'badge-gray'}`} style={{ flexShrink: 0 }}>
                              {STATUS_LABELS[lead.status]?.label || lead.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                            {lead.phone && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📞 {lead.phone}</span>}
                            {lead.website && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🌐 Website</span>}
                            {lead.rating && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⭐ {lead.rating}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedLead && (
                  <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: 76 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600 }}>{selectedLead.name}</h3>
                      <button onClick={() => setSelectedLead(null)} style={{
                        background: 'none', color: 'var(--text-muted)', fontSize: 18, padding: 0
                      }}>×</button>
                    </div>

                    <div style={{ display: 'grid', gap: 8, marginBottom: '1rem', fontSize: 13 }}>
                      {selectedLead.address && <p style={{ color: 'var(--text-muted)' }}>📍 {selectedLead.address}</p>}
                      {selectedLead.phone && <a href={`tel:${selectedLead.phone}`} style={{ color: 'var(--accent)' }}>📞 {selectedLead.phone}</a>}
                      {selectedLead.email && <a href={`mailto:${selectedLead.email}`} style={{ color: 'var(--accent)' }}>✉️ {selectedLead.email}</a>}
                      {selectedLead.website && <a href={selectedLead.website} target="_blank" style={{ color: 'var(--info)' }}>🌐 {selectedLead.website}</a>}
                      {selectedLead.instagram && <a href={`https://instagram.com/${selectedLead.instagram}`} target="_blank" style={{ color: '#C13584' }}>📸 @{selectedLead.instagram}</a>}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>STATUS</label>
                      <select value={selectedLead.status}
                        onChange={e => { updateLead(selectedLead.id, { status: e.target.value as any }) }}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8,
                          border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14
                        }}>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l.label}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>NOTAS</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Adiciona notas sobre este contacto..."
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 8, height: 100,
                          border: '1.5px solid var(--border)', background: 'var(--bg)',
                          resize: 'vertical', fontSize: 14
                        }} />
                      <button className="btn-primary" onClick={() => updateLead(selectedLead.id, { notes })}
                        style={{ marginTop: 8, width: '100%', padding: '8px' }}>
                        Guardar notas
                      </button>
                    </div>

                    <button onClick={() => deleteLead(selectedLead.id)} style={{
                      width: '100%', padding: '8px', borderRadius: 8, fontSize: 13,
                      background: 'var(--danger-light)', color: 'var(--danger)',
                      border: '1px solid #f5c6c4'
                    }}>
                      🗑️ Remover lead
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
