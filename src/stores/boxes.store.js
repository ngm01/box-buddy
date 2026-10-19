import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from 'src/utils/apiClient'
import { useAuthStore } from './auth.store'
import { getQrBaseUrlOrThrow } from 'src/config/app.config'
import { supabase } from 'src/utils/supabase'
import { getBoxPath } from 'src/utils/boxQr'
import { ilikeContains } from 'src/utils/postgrest'

const API_BASE = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')
const BOXES_URL = `${API_BASE}/boxes/`

// apiClient attaches the bearer token and handles 401s (sign out, back to login).
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

  // PATCH and DELETE have always gone to `/boxes//?id=eq.<id>`. The gateway's
  // route config isn't in this repo, so the path is kept as the one known to
  // work rather than tidied to `/boxes/?id=...` unverified.
  const boxByIdUrl = (id) => `${BOXES_URL}/?id=eq.${id}`

  const fetchBoxes = async (searchTerm = '') => {
    try {
      const params = new URLSearchParams()
      params.set('order', 'date_updated.desc.nullslast,created_time.desc.nullslast')

      if (searchTerm?.trim()) {
        const term = ilikeContains(searchTerm.trim())
        params.set('or', `(name.ilike.${term},description.ilike.${term})`)
      }

      const res = await apiClient.get(`${BOXES_URL}?${params.toString()}`)
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

    // Fail before creating anything, rather than leave a box with no QR URL.
    const qrBaseUrl = getQrBaseUrlOrThrow()

    let boxRes
    try {
      boxRes = await apiClient.post(BOXES_URL, {
        ...boxData,
        tags: normalizeTags(boxData.tags),
        user_id: user.id,
        display_name,
      })
    } catch (error) {
      console.error('Error creating box:', error)
      throw error
    }

    const box = boxRes.data
    const boxUrl = `${qrBaseUrl}${getBoxPath(display_name, box.name)}`

    try {
      await apiClient.patch(boxByIdUrl(box.id), { qr_code_url: boxUrl })
    } catch (error) {
      console.error('Error updating box with QR code URL:', error)
    }

    return { ...box, qr_code_url: boxUrl }
  }

  const updateBox = async (id, boxData) => {
    try {
      const payload = 'tags' in boxData ? { ...boxData, tags: normalizeTags(boxData.tags) } : boxData
      const res = await apiClient.patch(boxByIdUrl(id), payload)
      return res.data
    } catch (error) {
      console.error('Error updating box:', error)
      throw error
    }
  }

  const deleteBox = async (id) => {
    try {
      await apiClient.delete(boxByIdUrl(id))
      boxes.value = boxes.value.filter((box) => box.id !== id)
    } catch (error) {
      console.error('Error deleting box:', error)
      throw error
    }
  }

  // Resolves a box URL's owner/name pair without leaking whether a private box exists.
  // Returns { status_code: 200 | 403 | 404, box_id }.
  const getBoxAccessStatus = async (displayName, boxName) => {
    const { data, error } = await supabase.rpc('get_box_access_status', {
      p_display_name: displayName,
      p_box_name: boxName,
    })

    if (error) throw error

    const access = Array.isArray(data) ? data[0] : data
    return access ?? { status_code: 404, box_id: null }
  }

  const reset = () => {
    boxes.value = []
  }

  return { boxes, fetchBoxes, createBox, updateBox, deleteBox, getBoxAccessStatus, reset }
})
