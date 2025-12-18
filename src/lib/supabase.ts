import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 預約系統的 Supabase 連接 (clzjdlykhjwrlksyjlfz)
const appointmentSupabaseUrl = 'https://clzjdlykhjwrlksyjlfz.supabase.co'
const appointmentSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsempkbHlraGp3cmxrc3lqbGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTM2ODAsImV4cCI6MjA3NTM2OTY4MH0.V6QAoh4N2aSF5CgDYfKTnY8cMQnDV3AYilj7TbpWJcU'

export const appointmentSupabase = createClient(appointmentSupabaseUrl, appointmentSupabaseAnonKey)

// 員工資料類型
export interface Employee {
  id: string
  employee_id: string
  name: string
  position: string
  password_hash: string
  nickname?: string      // 兩個字的暱稱
  shortname?: string     // 縮寫（唯一）
  nickname_set_at?: string // 暱稱設定時間
  role?: string          // 角色（admin/user）
  can_edit_records?: boolean // 是否有編輯權限
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
  operation_category: string  // 職位類別
  operation_item: string      // 療程名稱
  quantity: number
  unit_fee: number
  total_fee: number
  operation_date: string
  notes?: string
  created_at: string
  updated_at?: string
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
      password_hash: '',
      nickname: data.nickname || null,
      shortname: data.shortname || null,
      nickname_set_at: data.nickname_set_at || null,
      role: data.role || 'user',
      can_edit_records: data.can_edit_records || false
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


// 預約客人類型
export interface Appointment {
  id: number
  taiwan_date: string
  time_24h: string
  customer_name: string
  treatment_item: string
  consultant: string
  assistant: string
  attending_physician: string
  appointment_status: string
  notes: string
}

// 療程執行記錄類型
export interface TreatmentExecutionRecord {
  id: number
  appointment_id: number | null
  customer_name: string
  appointment_date: string
  appointment_time: string
  treatment_hint: string
  treatment_name: string
  employee_id: string
  employee_name: string
  employee_shortname?: string  // 員工縮寫（用於標記顯示）
  employee_position: string
  unit_fee: number
  created_at: string
  updated_at: string
}

// 取得當日預約客人清單 (從預約系統的 Supabase 取得)
export async function getDailyAppointments(date: string): Promise<Appointment[]> {
  // 從預約系統的 flos_appointments_v2 表查詢
  const { data, error } = await appointmentSupabase
    .from('flos_appointments_v2')
    .select('*')
    .eq('taiwan_date', date)
    .order('time_24h')
  
  if (error) {
    console.error('查詢預約失敗:', error)
    throw error
  }
  
  return (data || []).map((item: any) => ({
    id: item.id,
    taiwan_date: item.taiwan_date,
    time_24h: item.time_24h,
    customer_name: item.customer_name,
    treatment_item: item.treatment_item,
    consultant: item.consultant,
    assistant: item.assistant,
    attending_physician: item.attending_physician,
    appointment_status: item.appointment_status,
    notes: item.notes
  }))
}

// 取得當日療程執行記錄
export async function getDailyExecutionRecords(date: string): Promise<TreatmentExecutionRecord[]> {
  const { data, error } = await supabase
    .from('treatment_execution_records')
    .select('*')
    .eq('appointment_date', date)
    .order('appointment_time')
  
  if (error) throw error
  return data || []
}

// 取得員工當日療程執行記錄
export async function getEmployeeDailyExecutionRecords(employeeId: string, date: string): Promise<TreatmentExecutionRecord[]> {
  const { data, error } = await supabase
    .from('treatment_execution_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('appointment_date', date)
    .order('appointment_time')
  
  if (error) throw error
  return data || []
}

// 新增療程執行記錄
export async function addExecutionRecord(record: Omit<TreatmentExecutionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<TreatmentExecutionRecord> {
  const { data, error } = await supabase
    .from('treatment_execution_records')
    .insert(record)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 刪除療程執行記錄
export async function deleteExecutionRecord(id: number): Promise<void> {
  const { error } = await supabase
    .from('treatment_execution_records')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// 取得客人的所有執行記錄（用於顯示標記）
export async function getCustomerExecutionRecords(customerName: string, date: string): Promise<TreatmentExecutionRecord[]> {
  const { data, error } = await supabase
    .from('treatment_execution_records')
    .select('*')
    .eq('customer_name', customerName)
    .eq('appointment_date', date)
  
  if (error) throw error
  return data || []
}

// 計算員工當日總費用
export async function calculateEmployeeDailyFee(employeeId: string, date: string): Promise<number> {
  const records = await getEmployeeExecutionRecords(employeeId, date)
  return records.reduce((sum, record) => sum + (record.unit_fee || 0), 0)
}


// ==================== 暱稱設定相關函數 ====================

// 檢查縮寫是否已被使用
export async function checkShortnameExists(shortname: string, excludeEmployeeId?: string): Promise<boolean> {
  let query = supabase
    .from('users')
    .select('employee_id')
    .eq('shortname', shortname)
  
  if (excludeEmployeeId) {
    query = query.neq('employee_id', excludeEmployeeId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return (data && data.length > 0)
}

// 設定員工暱稱和縮寫
export async function setEmployeeNickname(
  employeeId: string, 
  nickname: string, 
  shortname: string
): Promise<{ success: boolean; error?: string }> {
  // 驗證暱稱長度
  if (nickname.length !== 2) {
    return { success: false, error: '暱稱必須是兩個字' }
  }
  
  // 驗證縮寫長度
  if (shortname.length < 1 || shortname.length > 3) {
    return { success: false, error: '縮寫必須是1-3個字' }
  }
  
  // 檢查縮寫是否已被使用
  const exists = await checkShortnameExists(shortname, employeeId)
  if (exists) {
    return { success: false, error: '此縮寫已被其他員工使用，請重新設定' }
  }
  
  // 更新員工資料
  const { error } = await supabase
    .from('users')
    .update({
      nickname,
      shortname,
      nickname_set_at: new Date().toISOString()
    })
    .eq('employee_id', employeeId)
  
  if (error) {
    console.error('設定暱稱失敗:', error)
    return { success: false, error: '設定失敗，請稍後再試' }
  }
  
  return { success: true }
}

// 驗證員工暱稱（第二階段登入）
export async function verifyEmployeeNickname(employeeId: string, nickname: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('nickname')
    .eq('employee_id', employeeId)
    .single()
  
  if (error || !data) return false
  return data.nickname === nickname
}

// 取得員工資料（不記錄登入）
export async function getEmployeeByIdWithoutLogin(employeeId: string): Promise<Employee | null> {
  const trimmedId = employeeId.trim()
  
  if (!trimmedId) return null
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('employee_id', trimmedId)
      .single()
    
    if (error || !data) return null
    
    return {
      id: data.id,
      employee_id: data.employee_id,
      name: data.name,
      position: data.position || '諮詢師',
      password_hash: '',
      nickname: data.nickname || null,
      shortname: data.shortname || null,
      nickname_set_at: data.nickname_set_at || null,
      role: data.role || 'user',
      can_edit_records: data.can_edit_records || false
    } as Employee
  } catch (err) {
    console.error('Get employee error:', err)
    return null
  }
}

// 完成登入（記錄登入時間）
export async function completeLogin(employee: Employee): Promise<void> {
  await recordLoginTime(employee.employee_id, employee.name)
}

// 更新執行記錄（管理員或有權限者可編輯）
export async function updateExecutionRecord(
  recordId: number,
  updates: {
    treatment_name?: string
    employee_id?: string
    employee_name?: string
    employee_shortname?: string
    employee_position?: string
    unit_fee?: number
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('treatment_execution_records')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
    
    if (error) {
      console.error('更新執行記錄失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('更新執行記錄錯誤:', err)
    return false
  }
}

// 取得所有員工列表（用於管理員選擇執行者）
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('查詢員工列表失敗:', error)
      return []
    }
    
    return (data || []).map(d => ({
      id: d.id,
      employee_id: d.employee_id,
      name: d.name,
      position: d.position || '諮詢師',
      password_hash: '',
      nickname: d.nickname || null,
      shortname: d.shortname || null,
      nickname_set_at: d.nickname_set_at || null,
      role: d.role || 'user',
      can_edit_records: d.can_edit_records || false
    })) as Employee[]
  } catch (err) {
    console.error('取得員工列表錯誤:', err)
    return []
  }
}

// 授權/取消編輯權限
export async function setEditPermission(employeeId: string, canEdit: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ can_edit_records: canEdit })
      .eq('employee_id', employeeId)
    
    if (error) {
      console.error('更新編輯權限失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('更新編輯權限錯誤:', err)
    return false
  }
}


// 取得員工的療程執行記錄（用於我的業績統計）
export async function getEmployeeExecutionRecords(
  employeeId: string, 
  startDate?: string, 
  endDate?: string
): Promise<TreatmentExecutionRecord[]> {
  try {
    let query = supabase
      .from('treatment_execution_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
    
    if (startDate) {
      query = query.gte('appointment_date', startDate)
    }
    if (endDate) {
      query = query.lte('appointment_date', endDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('查詢執行記錄失敗:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('取得執行記錄錯誤:', err)
    return []
  }
}

// 取得全體員工的療程執行記錄（用於管理員統計）
export async function getAllExecutionRecords(
  startDate?: string, 
  endDate?: string
): Promise<TreatmentExecutionRecord[]> {
  try {
    let query = supabase
      .from('treatment_execution_records')
      .select('*')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
    
    if (startDate) {
      query = query.gte('appointment_date', startDate)
    }
    if (endDate) {
      query = query.lte('appointment_date', endDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('查詢全體執行記錄失敗:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('取得全體執行記錄錯誤:', err)
    return []
  }
}

// 刪除登入記錄（踢出功能）
export async function deleteLoginRecord(recordId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('login_records')
      .delete()
      .eq('id', recordId)
    
    if (error) {
      console.error('刪除登入記錄失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('刪除登入記錄錯誤:', err)
    return false
  }
}

// 新增員工
export async function addEmployee(employee: {
  employee_id: string
  name: string
  position: string
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .insert({
        employee_id: employee.employee_id,
        name: employee.name,
        position: employee.position,
        role: 'user',
        can_edit_records: false
      })
    
    if (error) {
      console.error('新增員工失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('新增員工錯誤:', err)
    return false
  }
}

// 更新員工資料
export async function updateEmployee(employeeId: string, updates: {
  name?: string
  position?: string
  role?: string
  can_edit_records?: boolean
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('employee_id', employeeId)
    
    if (error) {
      console.error('更新員工失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('更新員工錯誤:', err)
    return false
  }
}

// 刪除員工
export async function deleteEmployee(employeeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('employee_id', employeeId)
    
    if (error) {
      console.error('刪除員工失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('刪除員工錯誤:', err)
    return false
  }
}


// 更新療程價格設定（管理員專用）
export async function updateTreatmentPrice(
  treatmentId: string,
  updates: {
    beautician_price?: number
    nurse_price?: number
    consultant_price?: number
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('treatment_fee_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', treatmentId)
    
    if (error) {
      console.error('更新療程價格失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('更新療程價格錯誤:', err)
    return false
  }
}

// 新增療程項目
export async function addTreatment(treatment: {
  treatment_name: string
  beautician_price: number
  nurse_price: number
  consultant_price: number
  category?: string
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('treatment_fee_settings')
      .insert({
        treatment_name: treatment.treatment_name,
        beautician_price: treatment.beautician_price,
        nurse_price: treatment.nurse_price,
        consultant_price: treatment.consultant_price,
        category: treatment.category || '一般',
        is_active: true
      })
    
    if (error) {
      console.error('新增療程失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('新增療程錯誤:', err)
    return false
  }
}

// 刪除療程項目（軟刪除）
export async function deleteTreatment(treatmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('treatment_fee_settings')
      .update({ is_active: false })
      .eq('id', treatmentId)
    
    if (error) {
      console.error('刪除療程失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('刪除療程錯誤:', err)
    return false
  }
}

// 設定副管理者角色
export async function setSubAdminRole(employeeId: string, isSubAdmin: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        role: isSubAdmin ? 'sub_admin' : 'user',
        can_edit_records: isSubAdmin // 副管理者自動有編輯權限
      })
      .eq('employee_id', employeeId)
    
    if (error) {
      console.error('設定副管理者失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('設定副管理者錯誤:', err)
    return false
  }
}
