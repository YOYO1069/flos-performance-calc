import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { 
  Calculator, Settings, Calendar, BarChart3, LogOut, 
  Plus, Minus, Trash2, Save, ChevronLeft, ChevronRight,
  User, Clock, Shield, Users
} from 'lucide-react'
import { 
  type Employee, type TreatmentFeeSetting, type OperationFeeRecord,
  getTreatmentFeeSettings, getFeeByPosition, getOperationRecords, 
  addOperationRecord, deleteOperationRecord, getLoginRecords, type LoginRecord
} from '../lib/supabase'
import CustomerList from './CustomerList'

interface DashboardProps {
  employee: Employee
  onLogout: () => void
}

// 計算職位類別
function getPositionCategory(position: string): string {
  const normalizedPosition = position.toLowerCase()
  if (normalizedPosition.includes('護理師') || normalizedPosition.includes('nurse')) {
    return '護理師'
  } else if (normalizedPosition.includes('美容師') || normalizedPosition.includes('beautician')) {
    return '美容師'
  } else {
    return '諮詢師'
  }
}

export default function Dashboard({ employee, onLogout }: DashboardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('daily')

  // 檢查是否為管理員
  const isAdmin = employee.employee_id === 'flosHBH012' || employee.position === '管理員'

  const tabs = [
    { id: 'customers', label: '客人清單', icon: Users },
    { id: 'daily', label: '每日紀錄', icon: Calendar },
    { id: 'stats', label: '我的業績', icon: BarChart3 },
    { id: 'settings', label: '療程設定', icon: Settings },
    ...(isAdmin ? [{ id: 'admin', label: '登入記錄', icon: Shield }] : []),
  ]

  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'daily'
    setActiveTab(path)
  }, [location])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    navigate(`/${tabId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">醫美績效計算</h1>
                <p className="text-xs text-gray-500">FLOS曜診所</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{employee.name}</p>
                <p className="text-xs text-blue-600">{getPositionCategory(employee.position)}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="登出"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b sticky top-[72px] z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<CustomerList employee={employee} />} />
          <Route path="/customers" element={<CustomerList employee={employee} />} />
          <Route path="/daily" element={<DailyRecord employee={employee} />} />
          <Route path="/stats" element={<MyStats employee={employee} />} />
          <Route path="/settings" element={<TreatmentSettings employee={employee} />} />
          {isAdmin && <Route path="/admin" element={<AdminLoginRecords />} />}
        </Routes>
      </main>
    </div>
  )
}

// 每日紀錄頁面
function DailyRecord({ employee }: { employee: Employee }) {
  const [treatments, setTreatments] = useState<TreatmentFeeSetting[]>([])
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadTreatments()
  }, [])

  const loadTreatments = async () => {
    try {
      const data = await getTreatmentFeeSettings()
      setTreatments(data)
    } catch (err) {
      console.error('載入療程失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const positionCategory = getPositionCategory(employee.position)

  const handleQuantityChange = (treatmentId: string, delta: number) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(treatmentId) || 0
      const newValue = Math.max(0, current + delta)
      if (newValue === 0) {
        newMap.delete(treatmentId)
      } else {
        newMap.set(treatmentId, newValue)
      }
      return newMap
    })
  }

  const getTotalFee = () => {
    let total = 0
    selectedItems.forEach((quantity, treatmentId) => {
      const treatment = treatments.find(t => t.id === treatmentId)
      if (treatment) {
        total += getFeeByPosition(treatment, employee.position) * quantity
      }
    })
    return total
  }

  const handleSave = async () => {
    if (selectedItems.size === 0) {
      setMessage('請先選擇療程項目')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      for (const [treatmentId, quantity] of selectedItems) {
        const treatment = treatments.find(t => t.id === treatmentId)
        if (treatment) {
          const unitFee = getFeeByPosition(treatment, employee.position)
          await addOperationRecord({
            employee_id: employee.employee_id,
            employee_name: employee.name,
            operation_category: getPositionCategory(employee.position),
            operation_item: treatment.treatment_name,
            quantity,
            unit_fee: unitFee,
            total_fee: unitFee * quantity,
            operation_date: selectedDate,
          })
        }
      }
      setMessage('儲存成功！')
      setSelectedItems(new Map())
    } catch (err) {
      setMessage('儲存失敗，請稍後再試')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* 左側：療程選擇 */}
      <div className="lg:col-span-2 space-y-6">
        {/* 日期選擇 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">選擇日期</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const date = new Date(selectedDate)
                  date.setDate(date.getDate() - 1)
                  setSelectedDate(date.toISOString().split('T')[0])
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
              <button
                onClick={() => {
                  const date = new Date(selectedDate)
                  date.setDate(date.getDate() + 1)
                  setSelectedDate(date.toISOString().split('T')[0])
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>計費類別：<span className="font-medium text-blue-600">{positionCategory}</span></span>
          </div>
        </div>

        {/* 療程列表 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">選擇療程</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {treatments.map((treatment) => {
              const fee = getFeeByPosition(treatment, employee.position)
              const quantity = selectedItems.get(treatment.id) || 0
              return (
                <div
                  key={treatment.id}
                  className={`treatment-card ${quantity > 0 ? 'selected' : ''}`}
                  onClick={() => {
                    if (quantity === 0) {
                      handleQuantityChange(treatment.id, 1)
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{treatment.treatment_name}</h3>
                      <p className="text-sm text-blue-600">NT$ {fee}</p>
                    </div>
                    {quantity > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuantityChange(treatment.id, -1)
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{quantity}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuantityChange(treatment.id, 1)
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 右側：計算結果 */}
      <div className="space-y-6">
        <div className="card sticky top-[140px]">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">當前計算</h2>
          
          {selectedItems.size === 0 ? (
            <p className="text-gray-500 text-center py-8">尚未選擇任何療程</p>
          ) : (
            <div className="space-y-3">
              {Array.from(selectedItems).map(([treatmentId, quantity]) => {
                const treatment = treatments.find(t => t.id === treatmentId)
                if (!treatment) return null
                const fee = getFeeByPosition(treatment, employee.position)
                return (
                  <div key={treatmentId} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium text-gray-800">{treatment.treatment_name}</p>
                      <p className="text-xs text-gray-500">NT$ {fee} × {quantity}</p>
                    </div>
                    <p className="font-semibold text-blue-600">NT$ {fee * quantity}</p>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">總計金額</span>
              <span className="text-2xl font-bold text-blue-600">NT$ {getTotalFee()}</span>
            </div>

            {message && (
              <p className={`text-sm mb-4 ${message.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || selectedItems.size === 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  儲存紀錄
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 我的業績頁面
function MyStats({ employee }: { employee: Employee }) {
  const [records, setRecords] = useState<OperationFeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')

  useEffect(() => {
    loadRecords()
  }, [period])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const today = new Date()
      let startDate: string

      if (period === 'day') {
        startDate = today.toISOString().split('T')[0]
      } else if (period === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        startDate = weekAgo.toISOString().split('T')[0]
      } else {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        startDate = monthAgo.toISOString().split('T')[0]
      }

      const data = await getOperationRecords(employee.employee_id, startDate)
      setRecords(data)
    } catch (err) {
      console.error('載入記錄失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此記錄嗎？')) return
    try {
      await deleteOperationRecord(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('刪除失敗:', err)
      alert('刪除失敗')
    }
  }

  const totalFee = records.reduce((sum, r) => sum + r.total_fee, 0)
  const totalItems = records.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <p className="text-sm opacity-80">總操作費</p>
          <p className="text-3xl font-bold mt-1">NT$ {totalFee.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">總項目數</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalItems}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">記錄筆數</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{records.length}</p>
        </div>
      </div>

      {/* 時間篩選 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">操作記錄</h2>
          <div className="flex gap-2">
            {[
              { id: 'day', label: '今日' },
              { id: 'week', label: '本週' },
              { id: 'month', label: '本月' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as 'day' | 'week' | 'month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : records.length === 0 ? (
          <p className="text-gray-500 text-center py-12">暫無記錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">日期</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">療程</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">數量</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">金額</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {record.operation_date}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm font-medium text-gray-800">{record.operation_item}</td>
                    <td className="py-3 px-2 text-sm text-center text-gray-600">{record.quantity}</td>
                    <td className="py-3 px-2 text-sm text-right font-semibold text-blue-600">
                      NT$ {record.total_fee.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// 療程設定頁面
function TreatmentSettings({ employee }: { employee: Employee }) {
  const [treatments, setTreatments] = useState<TreatmentFeeSetting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTreatments()
  }, [])

  const loadTreatments = async () => {
    try {
      const data = await getTreatmentFeeSettings()
      setTreatments(data)
    } catch (err) {
      console.error('載入療程失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const positionCategory = getPositionCategory(employee.position)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">療程費用設定</h2>
        <div className="text-sm text-gray-500">
          您的計費類別：<span className="font-medium text-blue-600">{positionCategory}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">療程名稱</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">美容師</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">護理師</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">諮詢師</th>
            </tr>
          </thead>
          <tbody>
            {treatments.map((treatment) => (
              <tr key={treatment.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-800">{treatment.treatment_name}</td>
                <td className={`py-3 px-4 text-right ${positionCategory === '美容師' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                  NT$ {treatment.beautician_price}
                </td>
                <td className={`py-3 px-4 text-right ${positionCategory === '護理師' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                  NT$ {treatment.nurse_price}
                </td>
                <td className={`py-3 px-4 text-right ${positionCategory === '諮詢師' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                  NT$ {treatment.consultant_price}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        * 藍色標示為您目前適用的費率
      </p>
    </div>
  )
}


// 管理員登入記錄頁面
function AdminLoginRecords() {
  const [records, setRecords] = useState<LoginRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const data = await getLoginRecords(
        startDate ? `${startDate}T00:00:00` : undefined,
        endDate ? `${endDate}T23:59:59` : undefined
      )
      setRecords(data)
    } catch (err) {
      console.error('Failed to fetch login records:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          登入記錄監控
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              結束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            onClick={fetchRecords}
            className="btn-primary flex items-center gap-2"
          >
            查詢
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          登入記錄列表
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">載入中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>尚無登入記錄</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    員工編號
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    姓名
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    登入時間
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-gray-700">
                        {record.employee_id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-800">
                          {record.employee_name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(record.login_time)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
