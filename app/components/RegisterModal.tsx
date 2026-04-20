'use client'

import { useState } from 'react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { supabase, type UserProfile } from '@/lib/supabase'

type Props = {
  walletAddress: string
  onClose: () => void
  onSuccess: (profile: UserProfile) => void
}

const COUNTRIES = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panama' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'US', name: 'United States' },
  { code: 'ES', name: 'Spain' },
  { code: 'OTHER', name: 'Other' },
]

export function RegisterModal({ walletAddress, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '',
    x_username: '',
    telegram_handle: '',
    country_code: '',
  })
  const [whatsapp, setWhatsapp] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) return setError('Name is required.')
    if (whatsapp && !isValidPhoneNumber(whatsapp)) return setError('Enter a valid WhatsApp number with country code.')

    setLoading(true)
    const payload: UserProfile = {
      wallet_address: walletAddress.toLowerCase(),
      name: form.name.trim(),
      x_username: form.x_username.replace(/^@/, '').trim() || null,
      telegram_handle: form.telegram_handle.replace(/^@/, '').trim() || null,
      whatsapp: whatsapp ?? null,
      country_code: form.country_code || null,
      registered_at: new Date().toISOString(),
    }

    const { error: dbError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'wallet_address' })

    setLoading(false)
    if (dbError) return setError(dbError.message)
    onSuccess(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold">Register your profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Name *</label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Your name"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Country */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Country</label>
            <select
              value={form.country_code}
              onChange={set('country_code')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600"
            >
              <option value="">Select country…</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* X / Twitter */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">X (Twitter)</label>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 gap-2 focus-within:border-blue-600">
              <span className="text-gray-500 text-sm">@</span>
              <input
                value={form.x_username}
                onChange={set('x_username')}
                placeholder="username"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Telegram */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Telegram</label>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 gap-2 focus-within:border-blue-600">
              <span className="text-gray-500 text-sm">@</span>
              <input
                value={form.telegram_handle}
                onChange={set('telegram_handle')}
                placeholder="username"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">WhatsApp</label>
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus-within:border-blue-600 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-white [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder-gray-600 [&_.PhoneInputCountrySelect]:bg-gray-800 [&_.PhoneInputCountrySelect]:text-white [&_.PhoneInputCountrySelect]:outline-none [&_.PhoneInputCountrySelectArrow]:text-gray-400">
              <PhoneInput
                placeholder="Phone with country code"
                value={whatsapp}
                onChange={setWhatsapp}
                defaultCountry="CO"
                international
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors mt-1"
          >
            {loading ? 'Saving…' : 'Save profile'}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Only name is required. Your wallet address is used as your identity.
          </p>
        </form>
      </div>
    </div>
  )
}
