import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api/httpClient'
import { Brand } from '../../shared/components/Brand'
import { Button } from '../../shared/components/Button'
import { PasswordInput } from '../../shared/components/PasswordInput'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { useToast } from '../../modules/toast/hooks/useToast'

export function LoginPage() {
  const { user, login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('admin@accountbm.local')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success('You are now signed in to AIMS.', 'Welcome back')
      const next = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(next, { replace: true })
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to sign in. Please try again.', 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-[minmax(360px,540px)_1fr] bg-white max-md:block max-md:bg-[#f4f5f1]">
      <section className="flex flex-col justify-center p-[clamp(42px,8vw,100px)] max-md:min-h-screen max-md:px-6 max-md:py-8">
        <div className="mb-14 max-md:mb-10"><Brand placement="login" tone="dark" /></div>
        <span className="text-[11px] font-medium tracking-[.13em] text-[#9b7043] uppercase">Secure workspace</span>
        <h1 className="mt-[7px] mb-[5px] font-display text-[clamp(30px,3vw,42px)] font-medium text-[#183137]">Welcome back</h1>
        <p className="mt-0 mb-[30px] leading-[1.6] text-[#70807d]">Sign in to manage your organization and accounting records.</p>
        <form className="grid gap-[18px]" onSubmit={submit}>
          <label className="grid gap-[7px] text-[13px] font-medium text-[#405653]">Email address<input className="w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-[11px] text-[#203236] outline-none focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)]" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <PasswordInput label="Password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Button className="mt-1.5 w-full" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</Button>
        </form>
      </section>
      <aside className="flex flex-col justify-center bg-[linear-gradient(145deg,rgba(19,42,47,.96),rgba(30,78,80,.91)),radial-gradient(circle_at_top_right,#d7b66d,transparent_45%)] p-[clamp(52px,8vw,110px)] text-[#eef3ed] max-md:hidden"><span className="text-xs font-medium tracking-[.12em] text-[#d7b66d] uppercase">Accounting controls</span><h2 className="my-4 max-w-[650px] font-display text-[clamp(34px,5vw,62px)] leading-[1.08] font-medium">Reliable books start with controlled access.</h2><p className="max-w-[570px] text-[17px] leading-[1.7] text-[#b9c8c6]">Role-based permissions keep financial duties clear and every administrative change traceable.</p></aside>
    </main>
  )
}
