import { defineStore } from 'pinia'
import { supabase } from 'src/utils/supabase'
import { ilikeContains } from 'src/utils/postgrest'

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
      const term = ilikeContains(searchTerm.trim())
      query = query.or(`name.ilike.${term},description.ilike.${term}`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Returns { [boxId]: itemCount }. PostgREST caps every response (1,000 rows
  // by default), so a single request undercounts once the boxes hold more
  // items than that. Page through until the exact total has been read; the
  // order keeps pages from overlapping.
  const countItemsByBox = async (boxIds) => {
    const counts = {}
    if (!boxIds.length) return counts

    let total = Infinity
    let from = 0
    while (from < total) {
      const { data, count, error } = await supabase
        .from('items')
        .select('box_id', { count: 'exact' })
        .in('box_id', boxIds)
        .order('id')
        .range(from, from + 999)
      if (error) throw error
      if (!data.length) break

      for (const row of data) counts[row.box_id] = (counts[row.box_id] || 0) + 1
      total = count ?? 0
      from += data.length
    }
    return counts
  }

  // One request, so PostgREST inserts every row in a single statement:
  // either all items are saved or none are, and a retry can't duplicate.
  const createItems = async (itemsData) => {
    const { data, error } = await supabase
      .from('items')
      .insert(itemsData.map((item) => ({ ...item, tags: normalizeTags(item.tags) })))
      .select()
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

  return { fetchItemsByBox, countItemsByBox, createItems, updateItem, deleteItem }
})
