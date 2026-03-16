function Header({ onOpenCommand, onSignOut, signingOut = false }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-border">
      <div className="text-xl font-bold">monor<span className="text-accent">.me</span></div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-muted text-sm hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <span>buscar...</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 bg-bg rounded text-xs">⌘K | Ctrl + k </kbd>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="px-3 py-1.5 border border-border rounded-lg text-sm text-muted hover:bg-surface-hover hover:text-text transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signingOut ? 'saindo...' : 'sair'}
        </button>
      </div>
    </header>
  )
}

export default Header;