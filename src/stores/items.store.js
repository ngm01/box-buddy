import { defineStore } from 'pinia'
import { supabase } from 'src/utils/supabase'

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean)
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  return []
}

export const useItemsStore = defineStore('items', () => {
  const fetchItemsByBox = async (boxId, searchTerm = '') => {
    let query = supabase
      .from('items')
      .select('*')
      .eq('box_id', boxId)
      .order('date_updated', { ascending: false, nullsFirst: false })
      .order('created_time', { ascending: false, nullsFirst: false })

    if (searchTerm?.trim()) {
      const term = searchTerm.trim()
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  const createItem = async (itemData) => {
    const { data, error } = await supabase
      .from('items')
      .insert({ ...itemData, tags: normalizeTags(itemData.tags) })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const updateItem = async (itemId, itemData) => {
    const { data, error } = await supabase
      .from('items')
      .update({ ...itemData, tags: normalizeTags(itemData.tags) })
      .eq('id', itemId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const deleteItem = async (itemId) => {
    const { error } = await supabase.from('items').delete().eq('id', itemId)
    if (error) throw error
  }

  return { fetchItemsByBox, createItem, updateItem, deleteItem }
})
