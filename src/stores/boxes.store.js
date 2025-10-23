import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from './auth.store'

const authStore = useAuthStore()
const DOMAIN = process.env.DOMAIN
const API_BASE = `https://api.boxbuddy.io/boxes/`

export const useBoxesStore = defineStore('boxes', () => {
  const boxes = ref([])

  const authHeader = () => ({
    Authorization: `Bearer ${authStore.token || ''}`,
  })

  const fetchBoxes = async () => {
    try {
      console.log('auth header: ', authHeader())
      const res = await axios.get(API_BASE, { headers: authHeader() })
      boxes.value = res.data
    } catch (error) {
      console.error('Error fetching boxes:', error)
      throw error
    }
  }

  const createBox = async (boxData) => {
    const user = authStore.user
    if (!user) throw new Error('User not authenticated')

    // Get display_name from user metadata
    const display_name = user.user_metadata?.display_name
    console.log('display_name', display_name)
    if (!display_name) throw new Error('User display name not found')

    // First, insert the box into Supabase to get its ID
    let boxRes
    try {
      boxRes = await axios.post(
        API_BASE,
        {
          ...boxData,
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

    const boxUrl = `https://${DOMAIN}/boxes/${display_name}/${box.name}`
    console.log('boxUrl', boxUrl)

    try {
      await axios.patch(
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
      const res = await axios.patch(`${API_BASE}/?id=eq.${id}`, boxData, { headers: authHeader() })
      return res.data
    } catch (error) {
      console.error('Error updating box:', error)
      throw error
    }
  }

  const deleteBox = async (id) => {
    try {
      // eslint-disable-next-line no-unused-vars
      const res = await axios.delete(`${API_BASE}/?id=eq.${id}`, { headers: authHeader() })
      boxes.value = boxes.value.filter((box) => box.id !== id)
    } catch (error) {
      console.error('Error deleting box:', error)
      throw error
    }
  }

  return { boxes, fetchBoxes, createBox, updateBox, deleteBox }
})
