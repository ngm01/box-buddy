import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../utils/supabase'
// import QRCode from 'qrcode'

import { useAuthStore } from './auth.store'
const authStore = useAuthStore()
const DOMAIN = process.env.DOMAIN

export const useBoxesStore = defineStore('boxes', () => {
  const boxes = ref([])

  const fetchBoxes = async () => {
    const user = authStore.user
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase.from('boxes').select('*').eq('user_id', user.id)

    if (error) throw error
    //console.log('boxes fetched:', data)
    boxes.value = data
  }

  const createBox = async (boxData) => {
    const user = authStore.user
    if (!user) throw new Error('User not authenticated')

    // Get display_name from user metadata
    const display_name = user.user_metadata?.display_name
    console.log('display_name', display_name)
    if (!display_name) throw new Error('User display name not found')

    // First, insert the box into Supabase to get its ID
    const { data, error } = await supabase
      .from('boxes')
      .insert([{ ...boxData, user_id: user.id, display_name }])
      .select('*')
      .single()
    console.log('box store createBox data', data)

    if (error) throw error

    const boxId = data.id
    const boxUrl = `https://${DOMAIN}/boxes/${data.display_name}/${data.name}`
    console.log('boxUrl', boxUrl)

    // const QRCodeOpts = {
    //   errorCorrectionLevel: 'H',
    //   type: 'image/jpeg',
    //   quality: 0.3,
    //   margin: 1,
    //   color: {
    //     dark: '#010599FF',
    //     light: '#FFBF60FF',
    //   },
    // }
    //
    // // Generate QR Code as a Blob
    // const qrCodeData = await QRCode.toDataURL(boxUrl, QRCodeOpts)
    // console.log('qrCodeData', qrCodeData)
    // // Upload QR Code to Supabase Storage
    // const qrUrl = await uploadQRCodeToDb(boxId, qrCodeData)
    // console.log('QR Code URL:', qrUrl)

    // Update the box with the QR code URL
    try {
      await supabase.from('boxes').update({ qr_code_url: boxUrl }).eq('id', boxId)
    } catch (error) {
      console.error('Error updating box with QR code URL:', error)
    }

    return { ...data, qr_code_url: boxUrl }
  }

  /*
  const uploadQRCodeToDb = async (boxId, qrCodeData) => {
    // Refresh authentication session before making the request
    // const { refreshData, refreshError } = await supabase.auth.refreshSession()
    // if (refreshError) {
    //   console.error('Session refresh failed:', refreshError.message)
    //   throw new Error('Session refresh failed. Please log in again.')
    // }

    // console.log('Session refreshed:', refreshData)

    const user = authStore.user
    if (!user) throw new Error('User not authenticated')
    console.log('user.role:', user.role)

    const fileName = `qr_${boxId}.png`
    const { data, error } = await supabase.storage.from('qr-codes').upload(fileName, qrCodeData, {
      contentType: 'image/png',
    })

    if (error) throw error
    if (data) {
      console.log('QR Code uploaded successfully:', data)
    }

    // Get public URL
    const storageData = supabase.storage.from('qr-codes').getPublicUrl(fileName)
    return storageData.data.publicUrl
  }
    */

  const updateBox = async (id, boxData) => {
    const user = authStore.user
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase.from('boxes').update(boxData).eq('id', id)
    if (error) throw error
    return data
  }

  const deleteBox = async (id) => {
    const user = authStore.user
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase.from('boxes').delete().eq('id', id)

    if (error) throw error
    return data
  }

  return { boxes, fetchBoxes, createBox, updateBox, deleteBox }
})
