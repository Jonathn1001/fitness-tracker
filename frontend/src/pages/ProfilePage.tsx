import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/auth'

function decodeJwt(token: string): { email?: string; name?: string } | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function ProfilePage() {
  const { clearToken, accessToken } = useAuthStore((s) => ({ clearToken: s.clearToken, accessToken: s.accessToken }))
  const navigate = useNavigate()
  const profile = accessToken ? decodeJwt(accessToken) : null

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearToken()
    navigate('/login')
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>
      <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
        {profile && (
          <div>
            <p className="text-white font-semibold">{(profile as any).name ?? '—'}</p>
            <p className="text-gray-400 text-sm">{profile.email ?? '—'}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold rounded-xl py-3 text-sm"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}
