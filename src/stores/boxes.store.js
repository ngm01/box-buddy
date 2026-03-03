import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import axios from 'axios'
import { useAuthStore } from './auth.store'

const DOMAIN = process.env.DOMAIN
const API_BASE = 'https://api.boxbuddy.io/boxes/'

export const useBoxesStore = defineStore('boxes', () => {
  const boxes = ref([])

  const authHeader = () => {
    const authStore = useAuthStore()
    return {
      Authorization: `Bearer ${unref(authStore.token) || ''}`,
    }
  }

  const fetchBoxes = async () => {
    try {
      const res = await axios.get(API_BASE, { headers: authHeader() })
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
    const boxUrl = `https://${DOMAIN}/boxes/${display_name}/${box.name}`

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
      await axios.delete(`${API_BASE}/?id=eq.${id}`, { headers: authHeader() })
      boxes.value = boxes.value.filter((box) => box.id !== id)
    } catch (error) {
      console.error('Error deleting box:', error)
      throw error
    }
  }

  return { boxes, fetchBoxes, createBox, updateBox, deleteBox }
})
