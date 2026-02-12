function Header({ onOpenCommand}) {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-border">
      <div className="text-x1 font-bold">monor<span className="text-accent">.me</span></div>
      <button
        onClick={onOpenCommand}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-muted text-sm hover:bg-surface-hover transition-colors cursor-pointer">
          <span>buscar...</span>
          <kbd className="px-1.5 py-0.5 bg-bg rounded text-xs">⌘K | Ctrl + k </kbd>
        </button>
    </header>
  )
}

export default Header;