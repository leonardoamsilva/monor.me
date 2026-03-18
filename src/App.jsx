import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Header from './components/layout/Header'
import CommandPalette from './components/layout/CommandPalette'
import PageTransition from './components/layout/PageTransition'
import Carteira from './pages/Carteira'
import ProventosReais from './pages/ProventosReais'
import SimuladorAportes from './pages/SimuladorAportes'
import Landing from './pages/Landing'
import Login from './pages/Login'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'

function FullscreenStatus({ title, message }) {
  return (
    <div className='min-h-screen bg-bg text-text flex items-center justify-center px-4'>
      <div className='w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center'>
        <h1 className='text-xl font-semibold'>{title}</h1>
        {message ? <p className='mt-2 text-sm text-muted'>{message}</p> : null}
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isSupabaseConfigured } = useAuth();

  if (isLoading) {
    return <FullscreenStatus title='validando sessao...' message='aguarde um instante.' />;
  }

  if (!isSupabaseConfigured) {
    return (
      <Navigate
        to='/login'
        replace
        state={{ from: location, reason: 'supabase-not-configured' }}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace state={{ from: location }} />;
  }

  return children;
}

function PublicOnly({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullscreenStatus title='carregando...' message='checando sessao atual.' />;
  }

  if (isAuthenticated) {
    return <Navigate to='/app' replace />;
  }

  return children;
}

function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullscreenStatus title='carregando...' message='checando sessao atual.' />;
  }

  if (isAuthenticated) {
    return <Navigate to='/app' replace />;
  }

  return <Landing />;
}

function ProductApp() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

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
      <Header
        onOpenCommand={() => setCommandOpen(true)}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
      <PageTransition>
        {(location) => (
          <Routes location={location}>
            <Route index element={<Dashboard />} />
            <Route path='carteira' element={<Carteira />} />
            <Route path='proventos' element={<ProventosReais />} />
            <Route path='simulador-aportes' element={<SimuladorAportes />} />
            <Route path='calculadora' element={<Navigate to='/app/simulador-aportes' replace />} />
            <Route path='settings' element={<Settings />} />
            <Route path='*' element={<Navigate to='/app' replace />} />
          </Routes>
        )}
      </PageTransition>
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} navigate={navigate} />
    </>
  )
}

function AppContent() {
  return (
    <Routes>
      <Route path='/' element={<HomeRoute />} />
      <Route
        path='/login'
        element={(
          <PublicOnly>
            <Login />
          </PublicOnly>
        )}
      />
      <Route
        path='/app/*'
        element={(
          <RequireAuth>
            <ProductApp />
          </RequireAuth>
        )}
      />

      <Route path='/carteira' element={<Navigate to='/app/carteira' replace />} />
      <Route path='/proventos' element={<Navigate to='/app/proventos' replace />} />
      <Route path='/simulador-aportes' element={<Navigate to='/app/simulador-aportes' replace />} />
      <Route path='/calculadora' element={<Navigate to='/app/simulador-aportes' replace />} />
      <Route path='/settings' element={<Navigate to='/app/settings' replace />} />

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App;
