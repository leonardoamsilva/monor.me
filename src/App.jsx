import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Header from './components/layout/Header'
import CommandPalette from './components/layout/CommandPalette'
import Carteira from './pages/Carteira'

function AppContent() {
  const [commandOpen, setCommandOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e) {
      if((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  },[])

  return (
    <>
    <Header onOpenCommand={() => setCommandOpen(true)} />
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/carteira' element={<Carteira />} />
        <Route path='/settings' element={<Settings />} />
      </Routes>
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} navigate={navigate} />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App;
