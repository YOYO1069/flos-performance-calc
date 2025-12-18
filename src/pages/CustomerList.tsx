import { useState, useEffect } from 'react'
import { 
  Calendar, ChevronLeft, ChevronRight, User, Clock, 
  Check, X, Plus, Search, RefreshCw, Edit, Shield
} from 'lucide-react'
import { 
  type Employee, type TreatmentFeeSetting, type Appointment, type TreatmentExecutionRecord,
  getTreatmentFeeSettings, getFeeByPosition, getDailyAppointments, 
  getDailyExecutionRecords, addExecutionRecord, deleteExecutionRecord,
  updateExecutionRecord, getAllEmployees, setEditPermission
} from '../lib/supabase'

interface CustomerListProps {
  employee: Employee
  isAdmin?: boolean // 管理員權限
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

// 取得員工簡稱（用於標記）
// 如果有設定 shortname 則使用，否則用名字最後一個字
function getEmployeeShortName(name: string, shortname?: string): string {
  if (shortname) return shortname
  if (name.length <= 2) return name
  return name.slice(-1) // 取最後一個字
}

export default function CustomerList({ employee, isAdmin = false }: CustomerListProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [executions, setExecutions] = useState<TreatmentExecutionRecord[]>([])
  const [treatments, setTreatments] = useState<TreatmentFeeSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<Appointment | null>(null)
  const [showTreatmentModal, setShowTreatmentModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllRecords, setShowAllRecords] = useState(false) // 管理員查看所有記錄
  
  // 編輯功能相關 state
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [editingRecord, setEditingRecord] = useState<TreatmentExecutionRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedEditEmployee, setSelectedEditEmployee] = useState<string>('')
  const [selectedEditTreatment, setSelectedEditTreatment] = useState<string>('')
  
  // 檢查是否有編輯權限（管理員或被授權者）
  const canEdit = isAdmin || employee.can_edit_records

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const promises: Promise<any>[] = [
        getDailyAppointments(selectedDate),
        getDailyExecutionRecords(selectedDate),
        getTreatmentFeeSettings()
      ]
      
      // 如果有編輯權限，載入員工列表
      if (canEdit) {
        promises.push(getAllEmployees())
      }
      
      const results = await Promise.all(promises)
      setAppointments(results[0])
      setExecutions(results[1])
      setTreatments(results[2])
      
      if (canEdit && results[3]) {
        setAllEmployees(results[3])
      }
    } catch (err) {
      console.error('載入資料失敗:', err)
      setMessage('載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const positionCategory = getPositionCategory(employee.position)

  // 取得客人的執行記錄標記
  const getCustomerExecutionMarks = (customerName: string) => {
    const customerExecutions = executions.filter(e => e.customer_name === customerName)
    return customerExecutions.map(e => ({
      id: e.id,
      treatment: e.treatment_name,
      executorName: getEmployeeShortName(e.employee_name, e.employee_shortname),
      isMe: e.employee_id === employee.employee_id,
      record: e // 保留完整記錄以便編輯
    }))
  }

  // 計算員工當日總費用
  const getMyDailyTotal = () => {
    return executions
      .filter(e => e.employee_id === employee.employee_id)
      .reduce((sum, e) => sum + (e.unit_fee || 0), 0)
  }

  // 處理選擇療程
  const handleSelectTreatment = async (treatment: TreatmentFeeSetting) => {
    if (!selectedCustomer) return
    
    setSaving(true)
    setMessage('')
    
    try {
      const unitFee = getFeeByPosition(treatment, employee.position)
      await addExecutionRecord({
        appointment_id: selectedCustomer.id,
        customer_name: selectedCustomer.customer_name,
        appointment_date: selectedDate,
        appointment_time: selectedCustomer.time_24h,
        treatment_hint: selectedCustomer.treatment_item || '',
        treatment_name: treatment.treatment_name,
        employee_id: employee.employee_id,
        employee_name: employee.name,
        employee_shortname: employee.shortname || employee.name.slice(-1), // 使用縮寫或名字最後一字
        employee_position: positionCategory,
        unit_fee: unitFee
      })
      
      setMessage('儲存成功！')
      setShowTreatmentModal(false)
      setSelectedCustomer(null)
      await loadData() // 重新載入資料
    } catch (err) {
      console.error('儲存失敗:', err)
      setMessage('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  // 刪除執行記錄
  const handleDeleteExecution = async (executionId: number) => {
    if (!confirm('確定要刪除此記錄嗎？')) return
    
    try {
      await deleteExecutionRecord(executionId)
      await loadData()
      setMessage('已刪除')
    } catch (err) {
      console.error('刪除失敗:', err)
      setMessage('刪除失敗')
    }
  }

  // 開始編輯執行記錄
  const handleStartEdit = (record: TreatmentExecutionRecord) => {
    setEditingRecord(record)
    setSelectedEditEmployee(record.employee_id)
    setSelectedEditTreatment(record.treatment_name)
    setShowEditModal(true)
  }

  // 儲存編輯
  const handleSaveEdit = async () => {
    if (!editingRecord || !selectedEditEmployee || !selectedEditTreatment) return
    
    setSaving(true)
    try {
      const selectedEmp = allEmployees.find(e => e.employee_id === selectedEditEmployee)
      const selectedTreat = treatments.find(t => t.treatment_name === selectedEditTreatment)
      
      if (!selectedEmp || !selectedTreat) {
        setMessage('請選擇有效的員工和療程')
        return
      }
      
      const posCategory = getPositionCategory(selectedEmp.position)
      const unitFee = getFeeByPosition(selectedTreat, selectedEmp.position)
      
      const success = await updateExecutionRecord(editingRecord.id, {
        treatment_name: selectedEditTreatment,
        employee_id: selectedEditEmployee,
        employee_name: selectedEmp.name,
        employee_shortname: selectedEmp.shortname || selectedEmp.name.slice(-1),
        employee_position: posCategory,
        unit_fee: unitFee
      })
      
      if (success) {
        setMessage('更新成功！')
        setShowEditModal(false)
        setEditingRecord(null)
        await loadData()
      } else {
        setMessage('更新失敗')
      }
    } catch (err) {
      console.error('更新失敗:', err)
      setMessage('更新失敗')
    } finally {
      setSaving(false)
    }
  }

  // 授權/取消編輯權限
  const handleTogglePermission = async (targetEmployee: Employee) => {
    const newPermission = !targetEmployee.can_edit_records
    const success = await setEditPermission(targetEmployee.employee_id, newPermission)
    
    if (success) {
      setMessage(newPermission ? `已授權 ${targetEmployee.name} 編輯權限` : `已取消 ${targetEmployee.name} 編輯權限`)
      // 重新載入員工列表
      const employees = await getAllEmployees()
      setAllEmployees(employees)
    } else {
      setMessage('操作失敗')
    }
  }

  // 過濾客人清單
  const filteredAppointments = appointments.filter(apt => 
    apt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (apt.treatment_item && apt.treatment_item.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 日期選擇和統計 */}
      <div className="grid md:grid-cols-2 gap-4">
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>計費類別：<span className="font-medium text-blue-600">{positionCategory}</span></span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              重新整理
            </button>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h3 className="text-sm opacity-80">我的當日操作費</h3>
          <p className="text-3xl font-bold mt-2">NT$ {getMyDailyTotal().toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-1">
            已執行 {executions.filter(e => e.employee_id === employee.employee_id).length} 項療程
          </p>
        </div>
      </div>

      {/* 搜尋 */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋客人姓名或療程..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* 訊息提示 */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 客人清單 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          當日客人清單 ({filteredAppointments.length} 位)
        </h2>
        
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>今日無預約客人</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((apt) => {
              const marks = getCustomerExecutionMarks(apt.customer_name)
              return (
                <div
                  key={apt.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{apt.time_24h}</span>
                        <h3 className="font-semibold text-gray-800">{apt.customer_name}</h3>
                      </div>
                      {apt.treatment_item && (
                        <p className="text-sm text-blue-600 mt-1">
                          療程提示：{apt.treatment_item}
                        </p>
                      )}
                      
                      {/* 執行標記 */}
                      {marks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {marks.map((mark, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                mark.isMe 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {mark.treatment}
                              <span className="font-medium">({mark.executorName})</span>
                              {/* 編輯按鈕 - 有權限者可見 */}
                              {canEdit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartEdit(mark.record)
                                  }}
                                  className="ml-1 p-0.5 hover:bg-white/50 rounded"
                                  title="編輯此記錄"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              )}
                              {/* 刪除按鈕 - 有權限者或本人可見 */}
                              {(canEdit || mark.isMe) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteExecution(mark.id)
                                  }}
                                  className="p-0.5 hover:bg-red-200 rounded text-red-500"
                                  title="刪除此記錄"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedCustomer(apt)
                        setShowTreatmentModal(true)
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      新增療程
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 執行記錄 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isAdmin && showAllRecords ? '所有執行記錄' : '我的執行記錄'}
          </h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowPermissionModal(true)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  權限管理
                </button>
                <button
                  onClick={() => setShowAllRecords(!showAllRecords)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                    showAllRecords 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showAllRecords ? '查看我的' : '查看全部'}
                </button>
              </>
            )}
          </div>
        </div>
        
        {(() => {
          const displayRecords = isAdmin && showAllRecords 
            ? executions 
            : executions.filter(e => e.employee_id === employee.employee_id)
          
          if (displayRecords.length === 0) {
            return <p className="text-gray-500 text-center py-4">尚無執行記錄</p>
          }
          
          return (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-sm text-gray-600">時間</th>
                    <th className="text-left py-2 px-2 text-sm text-gray-600">客人</th>
                    <th className="text-left py-2 px-2 text-sm text-gray-600">療程</th>
                    {isAdmin && showAllRecords && (
                      <th className="text-left py-2 px-2 text-sm text-gray-600">執行者</th>
                    )}
                    <th className="text-right py-2 px-2 text-sm text-gray-600">費用</th>
                    <th className="text-center py-2 px-2 text-sm text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRecords.map((exec) => (
                    <tr key={exec.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 text-sm text-gray-600">{exec.appointment_time}</td>
                      <td className="py-2 px-2 text-sm font-medium">{exec.customer_name}</td>
                      <td className="py-2 px-2 text-sm">{exec.treatment_name}</td>
                      {isAdmin && showAllRecords && (
                        <td className="py-2 px-2 text-sm text-purple-600">{exec.employee_name}</td>
                      )}
                      <td className="py-2 px-2 text-sm text-right text-blue-600 font-medium">
                        NT$ {exec.unit_fee}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 編輯按鈕 - 只有有權限者可見 */}
                          {canEdit && (
                            <button
                              onClick={() => handleStartEdit(exec)}
                              className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                              title="編輯記錄"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {/* 刪除按鈕 */}
                          {(canEdit || exec.employee_id === employee.employee_id) && (
                            <button
                              onClick={() => handleDeleteExecution(exec.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="刪除記錄"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* 管理員統計 */}
              {isAdmin && showAllRecords && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">當日總統計</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {Object.entries(
                      executions.reduce((acc, e) => {
                        acc[e.employee_name] = (acc[e.employee_name] || 0) + (e.unit_fee || 0)
                        return acc
                      }, {} as Record<string, number>)
                    ).map(([name, total]) => (
                      <div key={name} className="bg-white p-2 rounded border">
                        <span className="text-gray-600">{name}</span>
                        <span className="float-right font-medium text-purple-600">NT$ {total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* 療程選擇彈窗 */}
      {showTreatmentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">選擇療程</h3>
                  <p className="text-sm text-gray-500">
                    客人：{selectedCustomer.customer_name} | 
                    計費類別：{positionCategory}
                  </p>
                  {selectedCustomer.treatment_item && (
                    <p className="text-sm text-blue-600 mt-1">
                      療程提示：{selectedCustomer.treatment_item}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowTreatmentModal(false)
                    setSelectedCustomer(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid sm:grid-cols-2 gap-3">
                {treatments.map((treatment) => {
                  const fee = getFeeByPosition(treatment, employee.position)
                  return (
                    <button
                      key={treatment.id}
                      onClick={() => handleSelectTreatment(treatment)}
                      disabled={saving}
                      className="text-left p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                    >
                      <h4 className="font-medium text-gray-800">{treatment.treatment_name}</h4>
                      <p className="text-sm text-blue-600">NT$ {fee}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編輯執行記錄彈窗 */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">編輯執行記錄</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingRecord(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                客人：{editingRecord.customer_name} | 時間：{editingRecord.appointment_time}
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* 選擇執行者 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">執行者</label>
                <select
                  value={selectedEditEmployee}
                  onChange={(e) => setSelectedEditEmployee(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇員工</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 選擇療程 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">療程</label>
                <select
                  value={selectedEditTreatment}
                  onChange={(e) => setSelectedEditTreatment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇療程</option>
                  {treatments.map((t) => (
                    <option key={t.treatment_name} value={t.treatment_name}>
                      {t.treatment_name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 預覽費用 */}
              {selectedEditEmployee && selectedEditTreatment && (() => {
                const emp = allEmployees.find(e => e.employee_id === selectedEditEmployee)
                const treat = treatments.find(t => t.treatment_name === selectedEditTreatment)
                if (emp && treat) {
                  const fee = getFeeByPosition(treat, emp.position)
                  return (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        預計操作費：<span className="font-bold">NT$ {fee}</span>
                        <span className="text-xs text-blue-500 ml-2">({getPositionCategory(emp.position)})</span>
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingRecord(null)
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !selectedEditEmployee || !selectedEditTreatment}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 權限管理彈窗 - 僅管理員可見 */}
      {showPermissionModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">編輯權限管理</h3>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                授權員工編輯客人清單上的操作費註記
              </p>
            </div>
            
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-2">
                {allEmployees
                  .filter(emp => emp.role !== 'admin') // 不顯示管理員
                  .map((emp) => (
                    <div
                      key={emp.employee_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-sm text-gray-500">{emp.position}</p>
                      </div>
                      <button
                        onClick={() => handleTogglePermission(emp)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          emp.can_edit_records
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {emp.can_edit_records ? '✓ 已授權' : '未授權'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
