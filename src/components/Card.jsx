function Card({ title, value }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <p className="text-muted text-sm">{title}</p>
      <strong className="text-2xl text-text">{value}</strong>
    </div>
  )
}

export default Card;