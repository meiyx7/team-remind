// utils/supabase.js
// Supabase 客户端封装 - 团队待办数据操作

const SUPABASE_URL = 'https://nrxlpnsotflmwcbdukfi.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_uNj3qfHqCW3HLoQJIxNeZg_irFOz6y8'

// 使用小程序版 Supabase 客户端
// 需要先在微信开发者工具中执行：工具 -> 构建 npm
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * 获取待办列表
 * @param {string} filter - 'all' | 'pending' | 'done'
 */
async function getTodos(filter = 'all') {
  let query = supabase.from('todos').select('*').order('created_at', { ascending: false })

  if (filter === 'pending') {
    query = query.eq('done', false)
  } else if (filter === 'done') {
    query = query.eq('done', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * 获取单个待办详情
 */
async function getTodoById(id) {
  const { data, error } = await supabase.from('todos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/**
 * 创建待办
 */
async function createTodo(todo) {
  const { data, error } = await supabase.from('todos').insert([{
    title: todo.title,
    description: todo.description || '',
    assignee: todo.assignee || '',
    due_date: todo.dueDate || null,
    priority: todo.priority || 'normal',
    done: false
  }])
  if (error) throw error
  return data
}

/**
 * 切换待办完成状态
 */
async function toggleTodo(id, done) {
  const { data, error } = await supabase.from('todos').update({ done }).eq('id', id)
  if (error) throw error
  return data
}

/**
 * 删除待办
 */
async function deleteTodo(id) {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw error
}

module.exports = {
  supabase,
  getTodos,
  getTodoById,
  createTodo,
  toggleTodo,
  deleteTodo
}
