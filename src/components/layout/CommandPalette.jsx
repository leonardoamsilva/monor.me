import { useState, useEffect } from "react";

function CommandPalette({ isOpen, onClose, navigate }) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {id: 1, name: "dashboard", description: "ir para o dashboard", action: () => navigate("/")},
    {id: 2, name: "adicionar fii", description: "adicionar novo fundo", action: () => console.log("add fii")},
    {id: 3, name: "carteira", description: "abrir carteira", action: () => navigate("/carteira")},
    {id: 4, name: "configurações", description: "abrir configurações", action: () => navigate("/settings")},
  ]

  const filteredCommands = commands.filter(cmd => cmd.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function handleKeyDown(e) {
      if(e.key === "Escape") {
        onClose();
      }

      if(e.key === "ArrowDown"){
        e.preventDefault();
        setSelectedIndex(prev => prev < filteredCommands.length - 1 ? prev + 1 : prev);
      }

      if(e.key === "ArrowUp"){
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
      }

      if(e.key === "Enter" && filteredCommands.length > 0) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }

    if(isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredCommands, selectedIndex]);

  useEffect(() => {
    if(!isOpen){ 
      setSearch(""); 
      setSelectedIndex(0)
    };
  }, [isOpen]);

  if(!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        <input 
          type="text" 
          placeholder="digite um comando..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          autoFocus 
          className="w-full px-4 py-4 bg-transparent text-text placeholder:text-muted border-b border-border focus:outline-none" 
        />
        <div className="max-h-64 overflow-y-auto">
          {filteredCommands.map((cmd, index) => (
            <button 
              key={cmd.id} 
              onClick={() => { cmd.action(); onClose(); }} 
              onMouseEnter = {() => setSelectedIndex(index)}
              className={` w-full px-4 py-3 flex flex-col items-start transition-colors cursor-pointer ${index === selectedIndex ? 'bg-surface-hover' : ''}`}
            >
              <span className="text-text">{cmd.name}</span>
              <span className="text-muted text-sm">{cmd.description}</span>
            </button>
          ))}
          {filteredCommands.length === 0 && (
            <div className="px-4 py-3 text-muted">nenhum comando encontrado</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette;