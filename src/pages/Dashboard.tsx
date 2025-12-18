import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { 
  Calculator, Settings, Calendar, BarChart3, LogOut, 
  Plus, Minus, Trash2, Save, ChevronLeft, ChevronRight,
  User, Clock, Shield, Users, Edit, UserPlus, UserMinus, X, Check, AlertTriangle
} from 'lucide-react'
import { 
  type Employee, type TreatmentFeeSetting, type OperationFeeRecord, type TreatmentExecutionRecord,
  getTreatmentFeeSettings, getFeeByPosition, getOperationRecords, 
  addOperationRecord, deleteOperationRecord, getLoginRecords, type LoginRecord,
  getEmployeeExecutionRecords, getAllExecutionRecords, deleteLoginRecord,
  getAllEmployees, addEmployee, updateEmployee, deleteEmployee, setEditPermission,
  updateTreatmentPrice, addTreatment, deleteTreatment, setSubAdminRole
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

  // 檢查是否為管理員（使用 employee_id 或 role 判斷）
  const isAdmin = employee.employee_id === 'flosHBH012' || employee.role === 'admin'
  
  // 純管理員帳號（不參與操作費計算）- 只有 flosHBH012
  const isPureAdmin = employee.employee_id === 'flosHBH012'
  
  // 副管理者
  const isSubAdmin = employee.role === 'senior_supervisor'
  
  // 可以查看全體業績的人（管理員或副管理者）
  const canViewAllStats = isAdmin || isSubAdmin
  
  // 除錯資訊
  console.log('Dashboard - employee:', employee)
  console.log('Dashboard - employee_id:', employee.employee_id)
  console.log('Dashboard - isAdmin:', isAdmin)
  console.log('Dashboard - isPureAdmin:', isPureAdmin)
  console.log('Dashboard - isSubAdmin:', isSubAdmin)

  // 根據角色顯示不同的頁籤
  const tabs = isPureAdmin ? [
    // 純管理員只看管理功能
    { id: 'customers', label: '客人清單', icon: Users },
    { id: 'all-stats', label: '全體業績', icon: BarChart3 },
    { id: 'settings', label: '療程設定', icon: Settings },
    { id: 'admin', label: '管理中心', icon: Shield },
  ] : [
    // 一般員工、副管理者和其他管理員
    { id: 'customers', label: '客人清單', icon: Users },
    { id: 'daily', label: '每日紀錄', icon: Calendar },
    { id: 'stats', label: '我的業績', icon: BarChart3 },
    { id: 'settings', label: '療程設定', icon: Settings },
    // 副管理者和管理員都可以看全體業績
    ...(canViewAllStats ? [
      { id: 'all-stats', label: '全體業績', icon: BarChart3 },
    ] : []),
    // 只有管理員可以看管理中心
    ...(isAdmin ? [
      { id: 'admin', label: '管理中心', icon: Shield }
    ] : []),
  ]

  useEffect(() => {
    const path = location.pathname.split('/')[1]
    // 純管理員預設頁面是全體業績，一般員工預設是客人清單
    const defaultTab = isPureAdmin ? 'all-stats' : 'customers'
    setActiveTab(path || defaultTab)
  }, [location, isPureAdmin])

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
                <p className="text-xs text-blue-600">{isPureAdmin ? '管理員' : getPositionCategory(employee.position)}</p>
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
          <Route path="/" element={<CustomerList employee={employee} isAdmin={isAdmin} />} />
          <Route path="/customers" element={<CustomerList employee={employee} isAdmin={isAdmin} />} />
          <Route path="/daily" element={<DailyRecord employee={employee} />} />
          <Route path="/stats" element={<MyStats employee={employee} />} />
          <Route path="/settings" element={<TreatmentSettings employee={employee} />} />
          {(isAdmin || isSubAdmin) && <Route path="/all-stats" element={<AllStats />} />}
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
  const [executionRecords, setExecutionRecords] = useState<TreatmentExecutionRecord[]>([])
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
      const endDate = today.toISOString().split('T')[0]

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

      // 從客人清單的執行記錄表讀取
      const data = await getEmployeeExecutionRecords(employee.employee_id, startDate, endDate)
      setExecutionRecords(data)
    } catch (err) {
      console.error('載入記錄失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalFee = executionRecords.reduce((sum, r) => sum + (r.unit_fee || 0), 0)
  const totalItems = executionRecords.length

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
        ) : executionRecords.length === 0 ? (
          <p className="text-gray-500 text-center py-12">暫無記錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">日期</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">時間</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">客人</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">療程</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">金額</th>
                </tr>
              </thead>
              <tbody>
                {executionRecords.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {record.appointment_date}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {record.appointment_time}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm font-medium text-gray-800">{record.customer_name}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{record.treatment_name}</td>
                    <td className="py-3 px-2 text-sm text-right font-semibold text-blue-600">
                      NT$ {(record.unit_fee || 0).toLocaleString()}
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
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ beautician: 0, nurse: 0, consultant: 0 })
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTreatment, setNewTreatment] = useState({ name: '', beautician: 0, nurse: 0, consultant: 0 })

  // 檢查是否為管理員或副管理者
  const isAdmin = employee.employee_id === 'flosHBH012' || employee.role === 'admin'
  const isSubAdmin = employee.role === 'senior_supervisor'
  const canEditPrices = isAdmin || isSubAdmin

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

  // 開始編輯
  const handleStartEdit = (treatment: TreatmentFeeSetting) => {
    setEditingId(treatment.id)
    setEditForm({
      beautician: treatment.beautician_price,
      nurse: treatment.nurse_price,
      consultant: treatment.consultant_price
    })
  }

  // 儲存編輯
  const handleSaveEdit = async (treatmentId: string) => {
    setSaving(true)
    try {
      const success = await updateTreatmentPrice(treatmentId, {
        beautician_price: editForm.beautician,
        nurse_price: editForm.nurse,
        consultant_price: editForm.consultant
      })
      if (success) {
        setMessage('更新成功！')
        setEditingId(null)
        await loadTreatments()
      } else {
        setMessage('更新失敗')
      }
    } catch (err) {
      setMessage('更新失敗')
    } finally {
      setSaving(false)
    }
  }

  // 新增療程
  const handleAddTreatment = async () => {
    if (!newTreatment.name.trim()) {
      setMessage('請輸入療程名稱')
      return
    }
    setSaving(true)
    try {
      const success = await addTreatment({
        treatment_name: newTreatment.name,
        beautician_price: newTreatment.beautician,
        nurse_price: newTreatment.nurse,
        consultant_price: newTreatment.consultant
      })
      if (success) {
        setMessage('新增成功！')
        setShowAddModal(false)
        setNewTreatment({ name: '', beautician: 0, nurse: 0, consultant: 0 })
        await loadTreatments()
      } else {
        setMessage('新增失敗')
      }
    } catch (err) {
      setMessage('新增失敗')
    } finally {
      setSaving(false)
    }
  }

  // 刪除療程
  const handleDeleteTreatment = async (treatmentId: string, name: string) => {
    if (!confirm(`確定要刪除療程「${name}」嗎？`)) return
    try {
      const success = await deleteTreatment(treatmentId)
      if (success) {
        setMessage('已刪除')
        await loadTreatments()
      } else {
        setMessage('刪除失敗')
      }
    } catch (err) {
      setMessage('刪除失敗')
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
    <div className="space-y-6">
      {/* 訊息提示 */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('失敗') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
          <button onClick={() => setMessage('')} className="float-right">×</button>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">療程費用設定</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              您的計費類別：<span className="font-medium text-blue-600">{positionCategory}</span>
            </div>
            {canEditPrices && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
              >
                <Plus className="w-4 h-4" />
                新增療程
              </button>
            )}
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
                {canEditPrices && <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">操作</th>}
              </tr>
            </thead>
            <tbody>
              {treatments.map((treatment) => (
                <tr key={treatment.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{treatment.treatment_name}</td>
                  {editingId === treatment.id ? (
                    <>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          value={editForm.beautician}
                          onChange={(e) => setEditForm({...editForm, beautician: Number(e.target.value)})}
                          className="w-24 px-2 py-1 border rounded text-right"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          value={editForm.nurse}
                          onChange={(e) => setEditForm({...editForm, nurse: Number(e.target.value)})}
                          className="w-24 px-2 py-1 border rounded text-right"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          value={editForm.consultant}
                          onChange={(e) => setEditForm({...editForm, consultant: Number(e.target.value)})}
                          className="w-24 px-2 py-1 border rounded text-right"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(treatment.id)}
                            disabled={saving}
                            className="p-1 text-green-500 hover:bg-green-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`py-3 px-4 text-right ${positionCategory === '美容師' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                        NT$ {treatment.beautician_price}
                      </td>
                      <td className={`py-3 px-4 text-right ${positionCategory === '護理師' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                        NT$ {treatment.nurse_price}
                      </td>
                      <td className={`py-3 px-4 text-right ${positionCategory === '諮詢師' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                        NT$ {treatment.consultant_price}
                      </td>
                      {canEditPrices && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStartEdit(treatment)}
                              className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                              title="編輯價格"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteTreatment(treatment.id, treatment.treatment_name)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="刪除療程"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          * 藍色標示為您目前適用的費率
          {canEditPrices && ' · 點擊編輯按鈕可修改價格'}
        </p>
      </div>

      {/* 新增療程彈窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">新增療程</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">療程名稱</label>
                <input
                  type="text"
                  value={newTreatment.name}
                  onChange={(e) => setNewTreatment({...newTreatment, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="請輸入療程名稱"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">美容師</label>
                  <input
                    type="number"
                    value={newTreatment.beautician}
                    onChange={(e) => setNewTreatment({...newTreatment, beautician: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">護理師</label>
                  <input
                    type="number"
                    value={newTreatment.nurse}
                    onChange={(e) => setNewTreatment({...newTreatment, nurse: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">諮詢師</label>
                  <input
                    type="number"
                    value={newTreatment.consultant}
                    onChange={(e) => setNewTreatment({...newTreatment, consultant: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddTreatment}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '儲存中...' : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 全體業績統計頁面（管理員專屬）
function AllStats() {
  const [executionRecords, setExecutionRecords] = useState<TreatmentExecutionRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [period, selectedDate])

  const loadData = async () => {
    setLoading(true)
    try {
      let startDate: string
      let endDate: string = selectedDate

      if (period === 'day') {
        startDate = selectedDate
      } else if (period === 'week') {
        const date = new Date(selectedDate)
        date.setDate(date.getDate() - 7)
        startDate = date.toISOString().split('T')[0]
      } else {
        const date = new Date(selectedDate)
        date.setMonth(date.getMonth() - 1)
        startDate = date.toISOString().split('T')[0]
      }

      const [records, emps] = await Promise.all([
        getAllExecutionRecords(startDate, endDate),
        getAllEmployees()
      ])
      setExecutionRecords(records)
      setEmployees(emps)
    } catch (err) {
      console.error('載入失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  // 計算每位員工的總費用
  const employeeStats = employees.map(emp => {
    const empRecords = executionRecords.filter(r => r.employee_id === emp.employee_id)
    const totalFee = empRecords.reduce((sum, r) => sum + (r.unit_fee || 0), 0)
    const totalItems = empRecords.length
    return {
      ...emp,
      totalFee,
      totalItems,
      records: empRecords
    }
  }).filter(emp => emp.totalItems > 0).sort((a, b) => b.totalFee - a.totalFee)

  const grandTotal = employeeStats.reduce((sum, emp) => sum + emp.totalFee, 0)
  const grandItems = employeeStats.reduce((sum, emp) => sum + emp.totalItems, 0)

  return (
    <div className="space-y-6">
      {/* 總統計卡片 */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <p className="text-sm opacity-80">全體總操作費</p>
          <p className="text-3xl font-bold mt-1">NT$ {grandTotal.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">總執行項目數</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{grandItems}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">有業績員工數</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{employeeStats.length}</p>
        </div>
      </div>

      {/* 篩選器 */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {[
              { id: 'day', label: '當日' },
              { id: 'week', label: '本週' },
              { id: 'month', label: '本月' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as 'day' | 'week' | 'month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">結束日期：</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* 員工業績排行 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">員工業績排行</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : employeeStats.length === 0 ? (
          <p className="text-gray-500 text-center py-12">選定期間內無業績記錄</p>
        ) : (
          <div className="space-y-4">
            {employeeStats.map((emp, index) => (
              <div key={emp.employee_id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.position} · {emp.totalItems} 項</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-purple-600">NT$ {emp.totalFee.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      佔比 {grandTotal > 0 ? ((emp.totalFee / grandTotal) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                
                {/* 詳細記錄展開 */}
                <details className="mt-3">
                  <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                    查看詳細記錄
                  </summary>
                  <div className="mt-2 pl-11">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-gray-500">日期</th>
                          <th className="text-left py-2 text-gray-500">客人</th>
                          <th className="text-left py-2 text-gray-500">療程</th>
                          <th className="text-right py-2 text-gray-500">金額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emp.records.map((record) => (
                          <tr key={record.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-600">{record.appointment_date}</td>
                            <td className="py-2 text-gray-800">{record.customer_name}</td>
                            <td className="py-2 text-gray-700">{record.treatment_name}</td>
                            <td className="py-2 text-right text-purple-600">NT$ {(record.unit_fee || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 管理員登入記錄頁面
function AdminLoginRecords() {
  const [records, setRecords] = useState<LoginRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState<'login' | 'employees' | 'permissions'>('login')
  const [message, setMessage] = useState('')
  
  // 新增員工表單
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ employee_id: '', name: '', position: '諮詢師' })
  
  // 編輯員工表單
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editForm, setEditForm] = useState({ name: '', position: '' })

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
  
  const fetchEmployees = async () => {
    try {
      const data = await getAllEmployees()
      setEmployees(data)
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  useEffect(() => {
    fetchRecords()
    fetchEmployees()
  }, [])
  
  // 踢出功能（刪除登入記錄）
  const handleKickOut = async (recordId: string, employeeName: string) => {
    if (!confirm(`確定要刪除 ${employeeName} 的登入記錄嗎？`)) return
    
    const success = await deleteLoginRecord(recordId)
    if (success) {
      setMessage(`已刪除 ${employeeName} 的登入記錄`)
      fetchRecords()
    } else {
      setMessage('刪除失敗')
    }
  }
  
  // 新增員工
  const handleAddEmployee = async () => {
    if (!newEmployee.employee_id || !newEmployee.name) {
      setMessage('請填寫員工編號和姓名')
      return
    }
    
    const success = await addEmployee(newEmployee)
    if (success) {
      setMessage(`已新增員工 ${newEmployee.name}`)
      setShowAddEmployee(false)
      setNewEmployee({ employee_id: '', name: '', position: '諮詢師' })
      fetchEmployees()
    } else {
      setMessage('新增失敗，可能員工編號已存在')
    }
  }
  
  // 更新員工
  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return
    
    const success = await updateEmployee(editingEmployee.employee_id, {
      name: editForm.name,
      position: editForm.position
    })
    
    if (success) {
      setMessage(`已更新 ${editForm.name} 的資料`)
      setEditingEmployee(null)
      fetchEmployees()
    } else {
      setMessage('更新失敗')
    }
  }
  
  // 刪除員工
  const handleDeleteEmployee = async (emp: Employee) => {
    if (emp.role === 'admin') {
      setMessage('無法刪除管理員')
      return
    }
    if (!confirm(`確定要刪除員工 ${emp.name} 嗎？`)) return
    
    const success = await deleteEmployee(emp.employee_id)
    if (success) {
      setMessage(`已刪除員工 ${emp.name}`)
      fetchEmployees()
    } else {
      setMessage('刪除失敗')
    }
  }
  
  // 切換編輯權限
  const handleToggleEditPermission = async (emp: Employee) => {
    const success = await setEditPermission(emp.employee_id, !emp.can_edit_records)
    if (success) {
      setMessage(emp.can_edit_records ? `已取消 ${emp.name} 的編輯權限` : `已授權 ${emp.name} 編輯權限`)
      fetchEmployees()
    } else {
      setMessage('操作失敗')
    }
  }
  
  // 切換管理員權限
  const handleToggleAdminRole = async (emp: Employee) => {
    const newRole = emp.role === 'admin' ? 'user' : 'admin'
    const success = await updateEmployee(emp.employee_id, { role: newRole })
    if (success) {
      setMessage(newRole === 'admin' ? `已將 ${emp.name} 設為管理員` : `已取消 ${emp.name} 的管理員權限`)
      fetchEmployees()
    } else {
      setMessage('操作失敗')
    }
  }
  
  // 切換副管理者權限
  const handleToggleSubAdminRole = async (emp: Employee) => {
    const success = await setSubAdminRole(emp.employee_id, emp.role !== 'senior_supervisor')
    if (success) {
      setMessage(emp.role !== 'senior_supervisor' ? `已將 ${emp.name} 設為副管理者` : `已取消 ${emp.name} 的副管理者權限`)
      fetchEmployees()
    } else {
      setMessage('操作失敗')
    }
  }

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
  
  // 檢查是否為陌生人（登入記錄中沒有對應員工）
  const isStranger = (record: LoginRecord) => {
    return !employees.some(emp => emp.employee_id === record.employee_id)
  }

  return (
    <div className="space-y-6">
      {/* 頁籤切換 */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('login')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'login' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          登入記錄
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'employees' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          員工管理
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'permissions' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          權限管理
        </button>
      </div>
      
      {/* 訊息提示 */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('失敗') || message.includes('無法') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
          <button onClick={() => setMessage('')} className="float-right">×</button>
        </div>
      )}
      
      {/* 登入記錄頁籤 */}
      {activeTab === 'login' && (
        <>
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              登入記錄監控
            </h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <button onClick={fetchRecords} className="btn-primary">查詢</button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">登入記錄列表</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : records.length === 0 ? (
              <p className="text-gray-500 text-center py-8">尚無登入記錄</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">員工編號</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">姓名</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">登入時間</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">狀態</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className={`border-b hover:bg-gray-50 ${
                        isStranger(record) ? 'bg-red-50' : ''
                      }`}>
                        <td className="py-3 px-4 text-sm font-mono text-gray-700">{record.employee_id}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-800">{record.employee_name || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDateTime(record.login_time)}</td>
                        <td className="py-3 px-4">
                          {isStranger(record) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              陌生人
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              <Check className="w-3 h-3" />
                              正常
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleKickOut(record.id, record.employee_name || record.employee_id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="刪除記錄"
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
        </>
      )}
      
      {/* 員工管理頁籤 */}
      {activeTab === 'employees' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">員工管理</h2>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              新增員工
            </button>
          </div>
          
          {/* 新增員工表單 */}
          {showAddEmployee && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-3">新增員工</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="員工編號"
                  value={newEmployee.employee_id}
                  onChange={(e) => setNewEmployee({...newEmployee, employee_id: e.target.value})}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="姓名"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="px-3 py-2 border rounded-lg"
                />
                <select
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="諮詢師">諮詢師</option>
                  <option value="美容師">美容師</option>
                  <option value="護理師">護理師</option>
                  <option value="管理員">管理員</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={handleAddEmployee} className="btn-primary flex-1">確認</button>
                  <button onClick={() => setShowAddEmployee(false)} className="px-4 py-2 border rounded-lg">取消</button>
                </div>
              </div>
            </div>
          )}
          
          {/* 員工列表 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">員工編號</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">姓名</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">職稱</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">角色</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-700">{emp.employee_id}</td>
                    <td className="py-3 px-4">
                      {editingEmployee?.employee_id === emp.employee_id ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="px-2 py-1 border rounded w-full"
                        />
                      ) : (
                        <span className="text-sm text-gray-800">{emp.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingEmployee?.employee_id === emp.employee_id ? (
                        <select
                          value={editForm.position}
                          onChange={(e) => setEditForm({...editForm, position: e.target.value})}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="諮詢師">諮詢師</option>
                          <option value="美容師">美容師</option>
                          <option value="護理師">護理師</option>
                          <option value="管理員">管理員</option>
                        </select>
                      ) : (
                        <span className="text-sm text-gray-600">{emp.position}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {emp.role === 'admin' ? '管理員' : '一般員工'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {editingEmployee?.employee_id === emp.employee_id ? (
                          <>
                            <button
                              onClick={handleUpdateEmployee}
                              className="p-2 text-green-500 hover:bg-green-50 rounded"
                              title="儲存"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingEmployee(null)}
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                              title="取消"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingEmployee(emp)
                                setEditForm({ name: emp.name, position: emp.position })
                              }}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                              title="編輯"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {emp.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteEmployee(emp)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                                title="刪除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 權限管理頁籤 */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* 權限說明 */}
          <div className="card bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">權限說明</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>編輯權限</strong>：可以編輯客人清單上的療程執行記錄（修改執行者、療程項目）</p>
              <p>• <strong>副管理者</strong>：可以編輯療程價格設定 + 查看全體業績 + 自動擁有編輯權限</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">權限管理</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">員工</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">職稱</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">編輯權限</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">副管理者</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const isPureAdmin = emp.employee_id === 'flosHBH012'
                    const isAdminRole = emp.role === 'admin'
                    const isSubAdminRole = emp.role === 'senior_supervisor'
                    
                    // 主管理員不顯示在權限管理列表中
                    if (isPureAdmin) return null
                    
                    return (
                      <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                            <span className="text-xs text-gray-500">({emp.employee_id})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{emp.position}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleEditPermission(emp)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                              emp.can_edit_records || isAdminRole || isSubAdminRole
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            disabled={isPureAdmin || isAdminRole || isSubAdminRole}
                          >
                            {emp.can_edit_records || isAdminRole || isSubAdminRole ? '✓ 已授權' : '未授權'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleSubAdminRole(emp)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                              isSubAdminRole
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {isSubAdminRole ? '✓ 副管理者' : '設為副管理者'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
