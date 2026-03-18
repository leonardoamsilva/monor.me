import { useState, useEffect, useRef, useCallback, useMemo } from "react";

function CommandPalette({ isOpen, onClose, navigate }) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const optionRefs = useRef([]);

  const commands = useMemo(() => [
    {id: 1, name: "dashboard", description: "ir para o dashboard", action: () => navigate("/app")},
    {id: 2, name: "adicionar fii", description: "adicionar novo fundo", action: () => navigate("/app/carteira?focus=true")},
    {id: 3, name: "carteira", description: "abrir carteira", action: () => navigate("/app/carteira")},
    {id: 4, name: "proventos reais", description: "abrir proventos do mes", action: () => navigate("/app/proventos")},
    {id: 5, name: "simulador de aportes", description: "calculadora de aportes e alocação", action: () => navigate("/app/simulador-aportes")},
    {id: 7, name: "calculadora", description: "abrir calculadora de aportes", action: () => navigate("/app/simulador-aportes")},
    {id: 6, name: "configurações", description: "abrir configurações", action: () => navigate("/app/settings")},
  ], [navigate]);

  const filteredCommands = useMemo(
    () => {
      const term = search.toLowerCase();
      return commands.filter((cmd) => (`${cmd.name} ${cmd.description}`).toLowerCase().includes(term));
    },
    [commands, search]
  );

  const clampedSelectedIndex = filteredCommands.length === 0
    ? 0
    : Math.min(selectedIndex, filteredCommands.length - 1);

  const handleClose = useCallback(() => {
    setSearch("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || filteredCommands.length === 0) return;
    optionRefs.current[clampedSelectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [clampedSelectedIndex, filteredCommands.length, isOpen]);

  function handleInputKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      return;
    }

    if (e.key === "Enter" && filteredCommands.length > 0) {
      e.preventDefault();
      filteredCommands[clampedSelectedIndex].action();
      handleClose();
    }
  }

  if(!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        <input 
          type="text" 
          placeholder="digite um comando..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          onKeyDown={handleInputKeyDown}
          autoFocus 
          className="w-full px-4 py-4 bg-transparent text-text placeholder:text-muted border-b border-border focus:outline-none" 
        />
        <div className="max-h-64 overflow-y-auto">
          {filteredCommands.map((cmd, index) => (
            <button 
              key={cmd.id} 
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              onClick={() => { cmd.action(); handleClose(); }} 
              onMouseEnter = {() => setSelectedIndex(index)}
              className={` w-full px-4 py-3 flex flex-col items-start transition-colors cursor-pointer ${index === clampedSelectedIndex ? 'bg-surface-hover' : ''}`}
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