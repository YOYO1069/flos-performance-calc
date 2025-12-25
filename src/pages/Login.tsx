import { useState, useEffect } from 'react'
import { Calculator, LogIn, AlertCircle, User, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { 
  getEmployeeByIdWithoutLogin, 
  setEmployeeNickname, 
  verifyEmployeeNickname,
  completeLogin,
  type Employee 
} from '../lib/supabase'

interface LoginProps {
  onLogin: (employee: Employee) => void
}

type LoginStep = 'employee_id' | 'setup_nickname' | 'verify_nickname'

export default function Login({ onLogin }: LoginProps) {
  const [step, setStep] = useState<LoginStep>('employee_id')
  const [employeeId, setEmployeeId] = useState('')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [nickname, setNickname] = useState('')
  const [shortname, setShortname] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 檢查是否有記住的登入狀態
  useEffect(() => {
    const rememberedEmployeeId = localStorage.getItem('remembered_employee_id')
    const rememberedExpiry = localStorage.getItem('remembered_expiry')
    
    if (rememberedEmployeeId && rememberedExpiry) {
      const expiry = new Date(rememberedExpiry)
      if (expiry > new Date()) {
        // 自動填入員工編號
        setEmployeeId(rememberedEmployeeId)
      } else {
        // 過期了，清除記住狀態
        localStorage.removeItem('remembered_employee_id')
        localStorage.removeItem('remembered_expiry')
      }
    }
  }, [])

  // 第一步：驗證員工編號
  const handleEmployeeIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const emp = await getEmployeeByIdWithoutLogin(employeeId)
      if (emp) {
        setEmployee(emp)
        
        // 檢查是否已設定暱稱
        if (emp.nickname && emp.shortname) {
          // 已設定暱稱，進入驗證步驟
          setStep('verify_nickname')
        } else {
          // 未設定暱稱，進入設定步驟
          // 預設用員工姓名的前兩個字作為暱稱
          const defaultNickname = emp.name.slice(0, 2)
          setNickname(defaultNickname)
          // 預設用員工姓名的最後一個字作為縮寫
          const defaultShortname = emp.name.slice(-1)
          setShortname(defaultShortname)
          setStep('setup_nickname')
        }
      } else {
        setError('員工編號不存在，請確認後再試')
      }
    } catch (err) {
      setError('驗證失敗，請稍後再試')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 第二步（首次）：設定暱稱
  const handleSetupNickname = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // 驗證暱稱
    if (nickname.trim().length === 0) {
      setError('暱稱不能為空')
      return
    }
    
    // 驗證縮寫
    if (shortname.length < 1 || shortname.length > 3) {
      setError('縮寫必須是1-3個字')
      return
    }
    
    setLoading(true)

    try {
      const result = await setEmployeeNickname(employee!.employee_id, nickname, shortname)
      
      if (result.success) {
        // 更新員工資料
        const updatedEmployee = {
          ...employee!,
          nickname,
          shortname,
          nickname_set_at: new Date().toISOString()
        }
        
        // 記錄登入
        await completeLogin(updatedEmployee)
        
        // 如果勾選記住我，儲存一個月
        if (rememberMe) {
          const expiry = new Date()
          expiry.setMonth(expiry.getMonth() + 1)
          localStorage.setItem('remembered_employee_id', employee!.employee_id)
          localStorage.setItem('remembered_expiry', expiry.toISOString())
        }
        
        onLogin(updatedEmployee)
      } else {
        setError(result.error || '設定失敗')
      }
    } catch (err) {
      setError('設定失敗，請稍後再試')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 第二步（已設定）：驗證暱稱
  const handleVerifyNickname = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const isValid = await verifyEmployeeNickname(employee!.employee_id, nickname)
      
      if (isValid) {
        // 記錄登入
        await completeLogin(employee!)
        
        // 如果勾選記住我，儲存一個月
        if (rememberMe) {
          const expiry = new Date()
          expiry.setMonth(expiry.getMonth() + 1)
          localStorage.setItem('remembered_employee_id', employee!.employee_id)
          localStorage.setItem('remembered_expiry', expiry.toISOString())
        }
        
        onLogin(employee!)
      } else {
        setError('暱稱不正確，請重新輸入')
      }
    } catch (err) {
      setError('驗證失敗，請稍後再試')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 返回上一步
  const handleBack = () => {
    setStep('employee_id')
    setEmployee(null)
    setNickname('')
    setShortname('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-4">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">醫美績效計算</h1>
          
          {/* 步驟指示器 */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'employee_id' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
            }`}>
              {step === 'employee_id' ? '1' : <Check className="w-4 h-4" />}
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step !== 'employee_id' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
          
          <p className="text-gray-500 mt-3">
            {step === 'employee_id' && '請輸入您的員工編號'}
            {step === 'setup_nickname' && '首次登入，請設定您的暱稱'}
            {step === 'verify_nickname' && `歡迎回來，${employee?.name}`}
          </p>
        </div>

        {/* 第一步：員工編號 */}
        {step === 'employee_id' && (
          <form onSubmit={handleEmployeeIdSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                員工編號
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="input-field"
                placeholder="請輸入員工編號"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  下一步
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 第二步（首次）：設定暱稱 */}
        {step === 'setup_nickname' && (
          <form onSubmit={handleSetupNickname} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <User className="w-5 h-5" />
                <span className="font-medium">{employee?.name}</span>
                <span className="text-blue-500 text-sm">({employee?.position})</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                暱稱 <span className="text-gray-400 text-xs">（必須是兩個字）</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 2))}
                className="input-field"
                placeholder="例如：小明"
                maxLength={2}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                縮寫 <span className="text-gray-400 text-xs">（1-3個字，用於標記）</span>
              </label>
              <input
                type="text"
                value={shortname}
                onChange={(e) => setShortname(e.target.value.slice(0, 3))}
                className="input-field"
                placeholder="例如：明"
                maxLength={3}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                縮寫會顯示在療程執行標記中，例如：清粉刺({shortname || '縮寫'})
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600">
                記住我（維持登入一個月）
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                返回
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    確認設定
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 第二步（已設定）：驗證暱稱 */}
        {step === 'verify_nickname' && (
          <form onSubmit={handleVerifyNickname} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <User className="w-5 h-5" />
                <span className="font-medium">{employee?.name}</span>
                <span className="text-blue-500 text-sm">({employee?.position})</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                請輸入您的暱稱
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 2))}
                className="input-field"
                placeholder="請輸入兩個字的暱稱"
                maxLength={2}
                required
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe2"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <label htmlFor="rememberMe2" className="text-sm text-gray-600">
                記住我（維持登入一個月）
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                返回
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    登入
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-gray-400 text-sm mt-6">
          FLOS曜診所 員工績效管理系統
        </p>
      </div>
    </div>
  )
}
