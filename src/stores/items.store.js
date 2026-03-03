import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'
import axios from 'axios'

const API_BASE = 'https://api.boxbuddy.io/items/'

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
  const authStore = useAuthStore()

  const authHeader = () => ({
    Authorization: `Bearer ${authStore.token || ''}`,
  })

  const fetchItemsByBox = async (boxId, searchTerm = '') => {
    try {
      const params = new URLSearchParams()
      params.set('box_id', `eq.${boxId}`)
      params.set('order', 'updated_at.desc.nullslast,created_at.desc.nullslast')

      if (searchTerm?.trim()) {
        const escaped = searchTerm.trim().replaceAll(',', '\\,')
        params.set('or', `(name.ilike.*${escaped}*,description.ilike.*${escaped}*)`)
      }

      const res = await axios.get(`${API_BASE}?${params.toString()}`, { headers: authHeader() })
      return res.data || []
    } catch (error) {
      console.error('Error fetching items:', error)
      throw error
    }
  }

  const createItem = async (itemData) => {
    try {
      const payload = {
        ...itemData,
        tags: normalizeTags(itemData.tags),
      }
      const res = await axios.post(API_BASE, payload, { headers: authHeader() })
      return res.data
    } catch (error) {
      console.error('Error creating item:', error)
      throw error
    }
  }

  const updateItem = async (itemId, itemData) => {
    try {
      const payload = {
        ...itemData,
        tags: normalizeTags(itemData.tags),
      }
      const res = await axios.patch(`${API_BASE}?id=eq.${itemId}`, payload, { headers: authHeader() })
      return res.data
    } catch (error) {
      console.error('Error updating item:', error)
      throw error
    }
  }

  const deleteItem = async (itemId) => {
    try {
      await axios.delete(`${API_BASE}?id=eq.${itemId}`, { headers: authHeader() })
    } catch (error) {
      console.error('Error deleting item:', error)
      throw error
    }
  }

  return { fetchItemsByBox, createItem, updateItem, deleteItem }
})
