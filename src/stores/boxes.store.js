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

  // A box's URL is /boxes/:display_name/:box_name, so two of one owner's
  // boxes with the same name would share a URL and one couldn't be opened.
  // Callers show error.message next to the name field when code matches.
  const boxNameTakenError = (name) => {
    const error = new Error(`You already have a box named "${name}".`)
    error.code = 'BOX_NAME_TAKEN'
    return error
  }

  // Postgres unique_violation, from boxes_user_id_name_key
  // (202610280001_unique_box_name_per_owner.sql). It covers a duplicate
  // created between the check below and the write.
  const isUniqueViolation = (error) => error?.response?.data?.code === '23505'

  const assertBoxNameFree = async (userId, name, excludeId = null) => {
    let query = supabase
      .from('boxes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('name', name)
    if (excludeId) query = query.neq('id', excludeId)

    const { count, error } = await query
    if (error) throw error
    if (count) throw boxNameTakenError(name)
  }

  // Each fetch takes a number; only the newest may write `boxes`. Without
  // this, a slow earlier search that finishes after a later one would
  // replace the later one's results.
  let latestFetch = 0

  const fetchBoxes = async (searchTerm = '') => {
    const fetchId = ++latestFetch
    try {
      const params = new URLSearchParams()
      params.set('order', 'date_updated.desc.nullslast,created_time.desc.nullslast')

      if (searchTerm?.trim()) {
        const term = ilikeContains(searchTerm.trim())
        params.set('or', `(name.ilike.${term},description.ilike.${term})`)
      }

      const res = await apiClient.get(`${BOXES_URL}?${params.toString()}`)
      if (fetchId === latestFetch) boxes.value = res.data
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
    await assertBoxNameFree(user.id, boxData.name)

    // The URL needs only the owner's display name and the box name, both
    // known now, so it goes in the same insert: a box can't be left without one.
    const qr_code_url = `${qrBaseUrl}${getBoxPath(display_name, boxData.name)}`

    try {
      const res = await apiClient.post(BOXES_URL, {
        ...boxData,
        tags: normalizeTags(boxData.tags),
        user_id: user.id,
        display_name,
        qr_code_url,
      })
      return { ...res.data, qr_code_url }
    } catch (error) {
      if (isUniqueViolation(error)) throw boxNameTakenError(boxData.name)
      console.error('Error creating box:', error)
      throw error
    }
  }

  const updateBox = async (id, boxData) => {
    if ('name' in boxData) {
      await assertBoxNameFree(useAuthStore().user?.id, boxData.name, id)
    }

    try {
      const payload = 'tags' in boxData ? { ...boxData, tags: normalizeTags(boxData.tags) } : boxData
      const res = await apiClient.patch(boxByIdUrl(id), payload)
      return res.data
    } catch (error) {
      if (isUniqueViolation(error)) throw boxNameTakenError(boxData.name)
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
    // Drop any fetch still in flight, so it can't refill the list after sign-out.
    latestFetch++
    boxes.value = []
  }

  return { boxes, fetchBoxes, createBox, updateBox, deleteBox, getBoxAccessStatus, reset }
})
