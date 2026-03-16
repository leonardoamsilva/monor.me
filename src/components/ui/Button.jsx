function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover hover:shadow-[0_10px_24px_rgba(37,99,235,0.35)]',
    secondary: 'bg-transparent border border-border text-text hover:bg-surface-hover hover:shadow-[0_8px_18px_rgba(0,0,0,0.25)]',
    danger: 'bg-danger text-white hover:bg-red-600 hover:shadow-[0_10px_24px_rgba(239,68,68,0.35)]'
  }

  return (
    <button
      className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button;