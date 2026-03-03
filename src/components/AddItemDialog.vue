<template>
  <q-dialog v-model="isOpen" @hide="resetDialog">
    <q-card class="q-pa-md add-item-card">
      <q-card-section>
        <div class="text-h6">Add Items</div>
        <div class="text-caption text-grey-7">
          Add a single item manually, or use AI to identify multiple items from one photo.
        </div>
      </q-card-section>

      <q-separator class="q-mb-md" />

      <q-card-section class="q-gutter-md">
        <q-input v-model="name" label="Item Name" outlined />
        <q-input v-model="description" label="Description" outlined type="textarea" />
        <q-input
          v-model="tags"
          label="Tags (comma-separated)"
          outlined
          hint="Example: pantry, fragile"
        />
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

      <q-card-section v-if="provisionalItems.length">
        <div class="text-subtitle1 q-mb-sm">Review AI-identified items</div>
        <q-list bordered separator>
          <q-item v-for="item in provisionalItems" :key="item.localId">
            <q-item-section avatar>
              <q-checkbox v-model="item.approved" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.name }}</q-item-label>
              <q-item-label caption>
                {{ item.description || 'No description provided by AI' }}
              </q-item-label>
              <q-item-label caption v-if="item.boundingBox">
                Region: {{ formatBoundingBox(item.boundingBox) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="provisionalItems.length">
        <div class="text-subtitle1 q-mb-sm">AI Identified Items</div>
        <q-list bordered separator>
          <q-item v-for="(item, index) in provisionalItems" :key="`${item.name}-${index}`">
            <q-item-section>
              <q-item-label>{{ item.name }}</q-item-label>
              <q-item-label caption>{{ item.description || 'No notes' }}</q-item-label>
              <q-item-label caption>
                Center: {{ item.coordinates?.x ?? 'n/a' }}, {{ item.coordinates?.y ?? 'n/a' }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
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
import { useItemsStore } from 'src/stores/items.store'

const itemsStore = useItemsStore()
// Dialog visibility
const isOpen = ref(false)

const props = defineProps({
  boxId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['item-added'])

const name = ref('')
const description = ref('')
const previewText = ref('')
const tags = ref('')
const enableAI = ref(true) // V2/Paid Feature

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
    identifyError.value = 'Could not capture image. You can upload a photo instead.'
  }
}

const triggerUpload = () => {
  uploadInput.value?.click()
}

const onFileSelected = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    aiImageDataUrl.value = typeof reader.result === 'string' ? reader.result : ''
    identifyError.value = ''
  }
  reader.onerror = () => {
    identifyError.value = 'Could not read the selected file.'
  }
  reader.readAsDataURL(file)
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

const scanBarcode = async () => {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: aiImageDataUrl.value,
        instructions: aiInstructions.value,
        boxId: props.boxId,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`)
    }

    const data = await response.json()
    provisionalItems.value = normalizeIdentifiedItems(data)

    if (!provisionalItems.value.length) {
      identifyError.value = 'AI did not return identifiable items for this photo.'
    }
  } catch (error) {
    console.error('AI identify error:', error)
    identifyError.value = 'Could not identify items from the photo. Please try again.'
  } finally {
    isIdentifying.value = false
  }
}

const identifyImage = async () => {
  if (!requireEntitlement({ feature: 'ai', reason: 'Monthly AI recognition limit reached.' })) {
    return
  }

  try {
    const imageData = await captureImage()
    if (!imageData) {
      throw new Error('Could not capture an image for AI recognition.')
    }

    const { data } = await axios.post('https://api.boxbuddy.io/ai/recognize', {
      image: imageData,
    })

    name.value = data?.label || name.value
    description.value = data?.description || description.value
    previewText.value = data?.label ? `AI identified: ${data.label}` : 'AI scan complete'
  } catch (error) {
    const normalized = normalizeApiError(error)

    if (normalized.action === 'open_paywall') {
      openPaywallModal(normalized.feature || 'ai', {
        reason: normalized.message,
        details: normalized.details,
      })
      return
    }

    $q.notify({ type: 'negative', message: normalized.message })
  }
}

// Function to save item through API gateway
const saveItem = async () => {
  try {
    await itemsStore.createItem({
      name: name.value,
      description: description.value,
      tags: tags.value,
      box_id: props.boxId,
    })
  } catch (error) {
    console.error('Error saving item:', error)
  }

  // close dialog and reset form
  isOpen.value = false
  name.value = ''
  description.value = ''
  tags.value = ''
  previewText.value = ''
  identifyError.value = ''
  lastIdentifyAction.value = null

    emit('item-added')
  } catch (error) {
    console.error('Error saving item:', error)
  } finally {
    isOpen.value = false
    name.value = ''
    description.value = ''
    previewText.value = ''
  }
}

const cancel = () => {
  name.value = ''
  description.value = ''
  previewText.value = ''
  tags.value = ''
}

defineExpose({ isOpen })
</script>

<style scoped>
.add-item-card {
  width: 680px;
  max-width: 95vw;
}

.ai-preview {
  max-height: 220px;
}
</style>
