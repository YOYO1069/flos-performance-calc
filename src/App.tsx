import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import type { Employee } from './lib/supabase'

function App() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 從 localStorage 讀取登入狀態
    const savedEmployee = localStorage.getItem('employee')
    if (savedEmployee) {
      setEmployee(JSON.parse(savedEmployee))
    }
    setLoading(false)
  }, [])

  const handleLogin = (emp: Employee) => {
    setEmployee(emp)
    localStorage.setItem('employee', JSON.stringify(emp))
  }

  const handleLogout = () => {
    setEmployee(null)
    localStorage.removeItem('employee')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            employee ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/*" 
          element={
            employee ? <Dashboard employee={employee} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
