function Card({ title, value, info }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <p className="text-muted text-sm flex items-center gap-2">
        <span>{title}</span>
        {info && (
          <span className="relative group inline-flex">
            <button
              type="button"
              className="w-4 h-4 rounded-full border border-border text-xs text-muted cursor-pointer transition-all duration-200 ease-out hover:text-text hover:border-accent hover:scale-110 hover:animate-pulse hover:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
              aria-label="informacao adicional"
            >
              i
            </button>
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 w-64 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 z-20">
              {info}
            </span>
          </span>
        )}
      </p>
      <strong className="text-2xl text-text">{value}</strong>
    </div>
  )
}

export default Card;