import { defineStore } from 'pinia'
import { unref } from 'vue'
import axios from 'axios'
import { useAuthStore } from './auth.store'

const API_BASE = 'https://api.boxbuddy.io/items/'

export const useItemsStore = defineStore('items', () => {
  const authHeader = () => {
    const authStore = useAuthStore()
    return {
      Authorization: `Bearer ${unref(authStore.token) || ''}`,
    }
  }

  const createItem = async (itemData) => {
    const res = await axios.post(API_BASE, itemData, { headers: authHeader() })
    return res.data
  }

  const updateItem = async (id, itemData) => {
    const res = await axios.patch(`${API_BASE}?id=eq.${id}`, itemData, { headers: authHeader() })
    return res.data
  }

  const deleteItem = async (id) => {
    await axios.delete(`${API_BASE}?id=eq.${id}`, { headers: authHeader() })
  }

  return { createItem, updateItem, deleteItem }
})
