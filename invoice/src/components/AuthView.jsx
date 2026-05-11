export default function AuthView({
  authLoading,
  loginEmail,
  loginPassword,
  loginError,
  isLoggingIn,
  setLoginEmail,
  setLoginPassword,
  onLogin,
}) {
  if (authLoading) {
    return (
      <main className="min-h-[80vh] grid place-items-center">
        <section className="w-full max-w-[440px] bg-bg2 border border-border rounded-[18px] p-[30px]">
          <h1 className="font-display text-[2rem] font-normal text-text mb-2">Loading Session...</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-[80vh] grid place-items-center">
      <section className="w-full max-w-[440px] bg-bg2 border border-border rounded-[18px] p-[30px]">
        <p className="font-mono text-[0.72rem] tracking-[0.18em] uppercase text-gold mb-1.5">Invoice Intelligence</p>
        <h1 className="font-display text-[2rem] font-normal text-text mb-2">Sign In</h1>
        <p className="text-text-2 text-[0.9rem] mb-5">Your organization invoices stay private to your login.</p>
        <form className="grid gap-3" onSubmit={onLogin}>
          <label className="grid gap-1.5">
            <span className="font-mono text-[0.67rem] uppercase tracking-[0.1em] text-text-3">Email</span>
            <input
              type="email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              placeholder="alpha.admin@demo.com"
              autoComplete="email"
              className="h-[42px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 focus:outline-none focus:border-gold"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="font-mono text-[0.67rem] uppercase tracking-[0.1em] text-text-3">Password</span>
            <input
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="h-[42px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 focus:outline-none focus:border-gold"
            />
          </label>
          <button 
            type="submit" 
            className="w-full mt-3.5 px-3 py-3 border-none rounded-xl bg-gold text-[#0e0e10] font-body text-[0.88rem] font-semibold cursor-pointer tracking-[0.02em] transition-all duration-200 relative overflow-hidden hover:opacity-90 hover:-translate-y-px disabled:opacity-45 disabled:cursor-wait disabled:transform-none after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[450ms] hover:after:translate-x-full"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        {loginError && <div className="mt-3 px-3.5 py-2.5 rounded-[10px] text-[0.82rem] bg-red-dim text-red border border-red/30 animate-slideIn">x {loginError}</div>}
        <p className="mt-3.5 text-text-3 text-xs">Demo users: alpha.admin@demo.com / alpha123 and zen.admin@demo.com / zen123</p>
      </section>
    </main>
  )
}
