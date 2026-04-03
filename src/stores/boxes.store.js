import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import axios from 'axios'
import apiClient from 'src/utils/apiClient'
import { useAuthStore } from './auth.store'
import { getQrBaseUrlOrThrow } from 'src/config/app.config'

const authStore = useAuthStore()
const API_BASE = `https://api.boxbuddy.io/boxes/`

export const useBoxesStore = defineStore('boxes', () => {
  const boxes = ref([])

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

  const authHeader = () => ({
    Authorization: `Bearer ${unref(authStore.token) || ''}`,
  })

  const fetchBoxes = async (searchTerm = '') => {
    try {
      const params = new URLSearchParams()
      params.set('order', 'updated_at.desc.nullslast,created_at.desc.nullslast')

      if (searchTerm?.trim()) {
        const escaped = searchTerm.trim().replaceAll(',', '\\,')
        params.set('or', `(name.ilike.*${escaped}*,description.ilike.*${escaped}*)`)
      }

      const res = await axios.get(`${API_BASE}?${params.toString()}`, { headers: authHeader() })
      boxes.value = res.data
    } catch (error) {
      console.error('Error fetching boxes:', error)
      throw error
    }
  }

  const createBox = async (boxData) => {
    const authStore = useAuthStore()
    const user = authStore.user

    if (!user) throw new Error('User not authenticated')

    const display_name = user.user_metadata?.display_name
    if (!display_name) throw new Error('User display name not found')

    let boxRes
    try {
      boxRes = await apiClient.post(
        API_BASE,
        {
          ...boxData,
          tags: normalizeTags(boxData.tags),
          user_id: user.id,
          display_name,
        },
        { headers: authHeader() },
      )
    } catch (error) {
      console.error('Error creating box:', error)
      throw error
    }

    const box = boxRes.data
    const boxId = box.id
    console.log('boxId', boxId)

    const qrBaseUrl = getQrBaseUrlOrThrow()
    const boxUrl = `${qrBaseUrl}/boxes/${display_name}/${box.name}`
    console.log('boxUrl', boxUrl)

    try {
      await apiClient.patch(
        `${API_BASE}/?id=eq.${boxId}`,
        {
          qr_code_url: boxUrl,
        },
        { headers: authHeader() },
      )
    } catch (error) {
      console.error('Error updating box with QR code URL:', error)
    }

    return { ...box, qr_code_url: boxUrl }
  }

  const updateBox = async (id, boxData) => {
    try {
      const res = await apiClient.patch(`${API_BASE}/?id=eq.${id}`, boxData, { headers: authHeader() })
      return res.data
    } catch (error) {
      console.error('Error updating box:', error)
      throw error
    }
  }

  const deleteBox = async (id) => {
    try {
      // eslint-disable-next-line no-unused-vars
      const res = await apiClient.delete(`${API_BASE}/?id=eq.${id}`, { headers: authHeader() })
      boxes.value = boxes.value.filter((box) => box.id !== id)
    } catch (error) {
      console.error('Error deleting box:', error)
      throw error
    }
  }

  return { boxes, fetchBoxes, createBox, updateBox, deleteBox }
})
