<template>
  <q-dialog v-model="isOpen">
    <q-card class="q-pa-md">
      <q-card-section>
        <div class="text-h6">Add Item</div>
      </q-card-section>

      <q-card-section>
        <q-input v-model="name" label="Item Name" outlined />
        <q-input v-model="description" label="Description" outlined type="textarea" />
      </q-card-section>

      <q-card-section class="row justify-center q-gutter-md">
        <q-btn @click="scanText" :disable="isIdentifyInFlight" icon="camera_alt" label="Scan Text" />
        <q-btn @click="scanBarcode" :disable="isIdentifyInFlight" icon="qr_code_scanner" label="Scan Barcode" />
        <q-btn
          v-if="enableAI"
          @click="identifyImage"
          :disable="isIdentifyInFlight"
          :loading="isIdentifyInFlight"
          icon="image_search"
          label="AI Identify"
        />
      </q-card-section>

      <q-card-section v-if="identifyStatusMessage">
        <q-banner class="bg-blue-2 q-pa-sm">{{ identifyStatusMessage }}</q-banner>
      </q-card-section>

      <q-card-section v-if="identifyError">
        <q-banner class="bg-red-2 q-pa-sm row items-center justify-between">
          <span>{{ identifyError }}</span>
          <q-btn flat dense color="negative" label="Retry" @click="retryIdentify" :disable="isIdentifyInFlight" />
        </q-banner>
      </q-card-section>

      <q-card-section v-if="previewText">
        <q-banner class="bg-green-2 q-pa-sm">Scanned Data: {{ previewText }}</q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="cancel" v-close-popup />
        <q-btn color="primary" @click="saveItem" label="Save" :disable="isIdentifyInFlight" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner'
import { supabase } from '../utils/supabase'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useAuthStore } from 'src/stores/auth.store'

const boxesStore = useBoxesStore()
const authStore = useAuthStore()
const API_BASE = 'https://api.boxbuddy.io'

// Dialog visibility
const isOpen = ref(false)
const props = defineProps({
  boxId: {
    type: String,
    required: true,
  },
})
const emit = defineEmits(['item-added'])

// Form inputs
const name = ref('')
const description = ref('')
const previewText = ref('')
const enableAI = ref(true) // V2/Paid Feature

const isUploading = ref(false)
const isIdentifying = ref(false)
const identifyError = ref('')
const lastIdentifyAction = ref(null)

const isIdentifyInFlight = computed(() => isUploading.value || isIdentifying.value)

const identifyStatusMessage = computed(() => {
  if (isUploading.value) return 'Uploading image...'
  if (isIdentifying.value) return 'Identifying image...'
  return ''
})

const runImageIdentifyWorkflow = async ({ mode }) => {
  identifyError.value = ''
  lastIdentifyAction.value = mode

  const imageData = await captureImage()
  if (!imageData) {
    identifyError.value = 'Unable to capture image. Please try again.'
    return
  }

  const token = authStore.token
  if (!token) {
    identifyError.value = 'You must be signed in to identify an image.'
    return
  }

  const imageBytes = base64ToBytes(imageData)

  try {
    isUploading.value = true
    const presignResponse = await fetch(`${API_BASE}/uploads/presign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!presignResponse.ok) {
      throw new Error(`Upload prepare failed with status ${presignResponse.status}`)
    }

    const presignPayload = await presignResponse.json()
    const uploadUrl = presignPayload?.uploadUrl
    const key = presignPayload?.key

    if (!uploadUrl || !key) {
      throw new Error('Upload prepare response missing upload URL or key')
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: imageBytes,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Image upload failed with status ${uploadResponse.status}`)
    }

    isUploading.value = false
    isIdentifying.value = true

    const identifyResponse = await fetch(`${API_BASE}/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key }),
    })

    if (!identifyResponse.ok) {
      throw new Error(`Identify failed with status ${identifyResponse.status}`)
    }

    const identifyPayload = await identifyResponse.json()
    const detectedText =
      identifyPayload?.text || identifyPayload?.description || identifyPayload?.result || ''

    if (detectedText) {
      previewText.value = detectedText
      description.value = detectedText
      if (mode === 'identify') {
        name.value = detectedText
      }
    } else {
      previewText.value = 'No text detected'
    }
  } catch (error) {
    console.error('Image identify workflow failed:', error)
    identifyError.value =
      'Image processing failed. Check your connection and try again. Your photo was not saved.'
  } finally {
    isUploading.value = false
    isIdentifying.value = false
  }
}

// Function to scan text via server-side OCR workflow
const scanText = async () => {
  if (isIdentifyInFlight.value) return
  await runImageIdentifyWorkflow({ mode: 'scan' })
}

const identifyImage = async () => {
  if (isIdentifyInFlight.value) return
  await runImageIdentifyWorkflow({ mode: 'identify' })
}

const retryIdentify = async () => {
  if (!lastIdentifyAction.value || isIdentifyInFlight.value) return
  await runImageIdentifyWorkflow({ mode: lastIdentifyAction.value })
}

const captureImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    })

    if (image.base64String) {
      return `data:image/jpeg;base64,${image.base64String}`
    }

    throw new Error('No image captured')
  } catch (error) {
    console.error('Error capturing image:', error)
    return null
  }
}

const base64ToBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1] || ''
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

// Function to scan barcode using Capacitor
const scanBarcode = async () => {
  try {
    await CapacitorBarcodeScanner.checkPermission({ force: true })
    CapacitorBarcodeScanner.hideBackground()
    const result = await CapacitorBarcodeScanner.startScan()

    if (result.hasContent) {
      name.value = result.content
      previewText.value = `Barcode: ${result.content}`
    }
  } catch (error) {
    console.error('Barcode Scan Error:', error)
  }
}

// Function to save item to Supabase
const saveItem = async () => {
  const { data: itemData, error } = await supabase
    .from('items')
    .insert([{ name: name.value, description: description.value, box_id: props.boxId }])
    .select('id')
  if (error) {
    console.error('Error saving item:', error)
  } else {
    const itemId = itemData[0].id
    const { data: boxData } = await supabase.from('boxes').select('*').eq('id', props.boxId)
    if (boxData) {
      await boxesStore.updateBox(props.boxId, {
        ...boxData[0],
        items: [...boxData[0].items, itemId],
      })
    }
  }
  // close dialog and reset form
  isOpen.value = false
  name.value = ''
  description.value = ''
  previewText.value = ''
  identifyError.value = ''
  lastIdentifyAction.value = null

  emit('item-added')
}

const cancel = () => {
  name.value = ''
  description.value = ''
  previewText.value = ''
  identifyError.value = ''
  lastIdentifyAction.value = null
}

// Expose `isOpen` to be controlled from the parent component
defineExpose({ isOpen })
</script>

<style scoped>
.q-card {
  width: 400px;
  max-width: 90vw;
}
</style>
