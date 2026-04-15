'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Conta criada! Verifica o teu email para confirmar.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52, height: 52, background: 'var(--accent)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 1rem', color: 'white', fontWeight: 700
          }}>P</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Partner Finder</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Encontra parceiros fitness em toda a Europa
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{
            display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius)',
            padding: 4, marginBottom: '1.5rem', gap: 4
          }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                border: mode === m ? '1px solid var(--border)' : 'none',
                boxShadow: mode === m ? 'var(--shadow)' : 'none',
              }}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="tu@empresa.com"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                  border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 15
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                  border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 15
                }}
              />
            </div>

            {message && (
              <p style={{
                padding: '10px 14px', borderRadius: 'var(--radius)',
                background: message.includes('criada') ? 'var(--accent-light)' : 'var(--danger-light)',
                color: message.includes('criada') ? 'var(--accent)' : 'var(--danger)',
                fontSize: 13
              }}>{message}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
