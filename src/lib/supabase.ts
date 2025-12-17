import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 員工資料類型
export interface Employee {
  id: string
  employee_id: string
  name: string
  position: string
  password_hash: string
}

// 療程費用設定類型
export interface TreatmentFeeSetting {
  id: string
  treatment_name: string
  beautician_price: number
  nurse_price: number
  consultant_price: number
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 操作費用記錄類型
export interface OperationFeeRecord {
  id: string
  employee_id: string
  employee_name: string
  position: string
  treatment_name: string
  quantity: number
  unit_fee: number
  total_fee: number
  operation_date: string
  created_at: string
}

// 取得療程費用設定
export async function getTreatmentFeeSettings(): Promise<TreatmentFeeSetting[]> {
  const { data, error } = await supabase
    .from('treatment_fee_settings')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('treatment_name')
  
  if (error) throw error
  return data || []
}

// 根據職位取得費用
export function getFeeByPosition(treatment: TreatmentFeeSetting, position: string): number {
  const normalizedPosition = position.toLowerCase()
  
  if (normalizedPosition.includes('護理師') || normalizedPosition.includes('nurse')) {
    return Number(treatment.nurse_price) || 0
  } else if (normalizedPosition.includes('美容師') || normalizedPosition.includes('beautician')) {
    return Number(treatment.beautician_price) || 0
  } else {
    // 其他職位一律以諮詢師計費
    return Number(treatment.consultant_price) || 0
  }
}

// 取得員工操作記錄
export async function getOperationRecords(employeeId: string, startDate?: string, endDate?: string): Promise<OperationFeeRecord[]> {
  let query = supabase
    .from('operation_fee_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('operation_date', { ascending: false })
  
  if (startDate) {
    query = query.gte('operation_date', startDate)
  }
  if (endDate) {
    query = query.lte('operation_date', endDate)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// 新增操作記錄
export async function addOperationRecord(record: Omit<OperationFeeRecord, 'id' | 'created_at'>): Promise<OperationFeeRecord> {
  const { data, error } = await supabase
    .from('operation_fee_records')
    .insert(record)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 刪除操作記錄
export async function deleteOperationRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('operation_fee_records')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// 驗證員工登入
// 簡化登入：只需輸入員工編號即可登入
export async function verifyEmployee(employeeId: string): Promise<Employee | null> {
  const trimmedId = employeeId.trim()
  
  if (!trimmedId) {
    return null
  }
  
  try {
    // 查詢員工資料
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('employee_id', trimmedId)
      .single()
    
    if (error || !data) {
      return null
    }
    
    // 記錄登入時間
    await recordLoginTime(trimmedId, data.name)
    
    return {
      id: data.id,
      employee_id: data.employee_id,
      name: data.name,
      position: data.position || '諮詢師',
      password_hash: ''
    } as Employee
  } catch (err) {
    console.error('Login error:', err)
    return null
  }
}

// 登入記錄類型
export interface LoginRecord {
  id: string
  employee_id: string
  employee_name: string
  login_time: string
}

// 記錄登入時間
export async function recordLoginTime(employeeId: string, employeeName: string): Promise<void> {
  try {
    await supabase
      .from('login_records')
      .insert({
        employee_id: employeeId,
        employee_name: employeeName,
        login_time: new Date().toISOString()
      })
  } catch (err) {
    console.error('Failed to record login time:', err)
  }
}

// 取得登入記錄（管理員用）
export async function getLoginRecords(startDate?: string, endDate?: string): Promise<LoginRecord[]> {
  let query = supabase
    .from('login_records')
    .select('*')
    .order('login_time', { ascending: false })
    .limit(100)
  
  if (startDate) {
    query = query.gte('login_time', startDate)
  }
  if (endDate) {
    query = query.lte('login_time', endDate)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}
