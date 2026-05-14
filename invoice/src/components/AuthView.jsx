export default function AuthView({
  authLoading,
  authMode,
  loginEmail,
  loginPassword,
  loginError,
  isLoggingIn,
  signupFullName,
  signupOrgName,
  signupEmail,
  signupPassword,
  signupConfirmPassword,
  signupError,
  isSigningUp,
  setLoginEmail,
  setLoginPassword,
  setSignupFullName,
  setSignupOrgName,
  setSignupEmail,
  setSignupPassword,
  setSignupConfirmPassword,
  setAuthMode,
  onLogin,
  onSignup,
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
        <h1 className="font-display text-[2rem] font-normal text-text mb-2">
          {authMode === 'signup' ? 'Create Account' : 'Sign In'}
        </h1>
        <p className="text-text-2 text-[0.9rem] mb-5">Your organization invoices stay private to your login.</p>

        <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-bg3 border border-border">
          <button
            type="button"
            onClick={() => setAuthMode('signin')}
            className={`h-9 rounded-[9px] text-sm transition ${
              authMode === 'signin' ? 'bg-gold text-[#0e0e10] font-semibold' : 'text-text-2 hover:text-text'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`h-9 rounded-[9px] text-sm transition ${
              authMode === 'signup' ? 'bg-gold text-[#0e0e10] font-semibold' : 'text-text-2 hover:text-text'
            }`}
          >
            Sign Up
          </button>
        </div>

        {authMode === 'signup' ? (
          <form className="grid gap-3" onSubmit={onSignup}>
            <label className="grid gap-1.5">
              <span className="font-mono text-[0.67rem] uppercase tracking-[0.1em] text-text-3">Full Name</span>
              <input
                type="text"
                value={signupFullName}
                onChange={e => setSignupFullName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="h-[42px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 focus:outline-none focus:border-gold"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="font-mono text-[0.67rem] uppercase tracking-[0.1em] text-text-3">Organization</span>
              <input
                type="text"
                value={signupOrgName}
                onChange={e => setSignupOrgName(e.target.value)}
                placeholder="Example Pvt Ltd"
                autoComplete="organization"
                className="h-[42px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 focus:outline-none focus:border-gold"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="font-mono text-[0.67rem] uppercase tracking-[0.1em] text-text-3">Email</span>
              <input
                type="email"
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="h-[42px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 focus:outline-none focus:border-gold"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="font-mono text-[0.67rem] uppercase tracking-[0.1em] text-text-3">Password</span>
              <input
                type="password"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="h-[42px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 focus:outline-none focus:border-gold"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="font-mono text-[0.67rem] uppercase tracking-[0.1em] text-text-3">Confirm Password</span>
              <input
                type="password"
                value={signupConfirmPassword}
                onChange={e => setSignupConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="h-[42px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 focus:outline-none focus:border-gold"
              />
            </label>
            <button
              type="submit"
              className="w-full mt-3.5 px-3 py-3 border-none rounded-xl bg-gold text-[#0e0e10] font-body text-[0.88rem] font-semibold cursor-pointer tracking-[0.02em] transition-all duration-200 relative overflow-hidden hover:opacity-90 hover:-translate-y-px disabled:opacity-45 disabled:cursor-wait disabled:transform-none after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[450ms] hover:after:translate-x-full"
              disabled={isSigningUp}
            >
              {isSigningUp ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        ) : (
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
        )}

        {authMode === 'signup' && signupError && (
          <div className="mt-3 px-3.5 py-2.5 rounded-[10px] text-[0.82rem] bg-red-dim text-red border border-red/30 animate-slideIn">
            x {signupError}
          </div>
        )}
        {authMode === 'signin' && loginError && (
          <div className="mt-3 px-3.5 py-2.5 rounded-[10px] text-[0.82rem] bg-red-dim text-red border border-red/30 animate-slideIn">
            x {loginError}
          </div>
        )}
        {authMode === 'signin' && (
          <p className="mt-3.5 text-text-3 text-xs">Demo users: alpha.admin@demo.com / alpha123 and zen.admin@demo.com / zen123</p>
        )}
      </section>
    </main>
  )
}
