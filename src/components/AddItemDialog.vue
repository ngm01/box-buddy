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
        <q-btn @click="scanText" icon="camera_alt" label="Scan Text" />
        <q-btn @click="scanBarcode" icon="qr_code_scanner" label="Scan Barcode" />
        <q-btn v-if="enableAI" @click="captureAiPhoto" icon="photo_camera" label="Take Photo" />
        <q-btn v-if="enableAI" @click="identifyImage" icon="image_search" label="AI Identify" />
      </q-card-section>

      <q-card-section v-if="enableAI">
        <q-file
          outlined
          accept="image/*"
          label="Upload image for AI identify"
          @update:model-value="onImageSelected"
        />
      </q-card-section>

      <q-card-section v-if="aiImageDataUrl">
        <q-img :src="aiImageDataUrl" style="max-height: 200px" contain />
      </q-card-section>

      <q-card-section v-if="previewText">
        <q-banner class="bg-green-2 q-pa-sm">Scanned Data: {{ previewText }}</q-banner>
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
        <q-btn color="primary" @click="saveItem" label="Save" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner'
import { useAuthStore } from 'src/stores/auth.store'

const authStore = useAuthStore()
const apiBase = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')
const presignEndpoint = `${apiBase}/uploads/presign`
const identifyEndpoint = `${apiBase}/identify`
const itemsEndpoint = `${apiBase}/items`

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
const enableAI = ref(true)
const aiImageDataUrl = ref('')
const selectedFile = ref(null)
const provisionalItems = ref([])

const scanText = async () => {
  try {
    const imageData = await captureImage()
    if (!imageData) {
      throw new Error('Failed to capture image')
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageData.split(',')[1],
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
              },
            ],
          },
        ],
      }),
    })

    const json = await response.json()
    const text = json.responses?.[0]?.fullTextAnnotation?.pages?.[0]?.blocks || []

    if (text) {
      previewText.value = text
      description.value = text
    } else {
      previewText.value = 'No text detected'
    }
  } catch (error) {
    console.error('Error scanning text:', error)
    previewText.value = 'Error scanning text'
  }
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

const onImageSelected = async (file) => {
  if (!file) {
    selectedFile.value = null
    aiImageDataUrl.value = ''
    return
  }

  selectedFile.value = file
  aiImageDataUrl.value = await fileToDataUrl(file)
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const base64ToBlob = async (base64String, mimeType = 'image/jpeg') => {
  const binary = atob(base64String)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

const captureAiPhoto = async () => {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    })

    if (!photo.base64String) {
      throw new Error('No image data returned from camera')
    }

    const mimeType = photo.format ? `image/${photo.format}` : 'image/jpeg'
    const blob = await base64ToBlob(photo.base64String, mimeType)
    const fileName = `capture-${Date.now()}.${photo.format || 'jpg'}`
    selectedFile.value = new File([blob], fileName, { type: mimeType })
    aiImageDataUrl.value = `data:${mimeType};base64,${photo.base64String}`
  } catch (error) {
    console.error('AI photo capture failed:', error)
    previewText.value = 'Unable to capture photo'
  }
}

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

const normalizeIdentifiedItems = (payload) => {
  const objects = Array.isArray(payload?.objects) ? payload.objects : []
  return objects.map((object) => ({
    name: object?.label || 'Unlabeled item',
    description: object?.notes || '',
    coordinates: object?.coordinates || null,
    confidence: object?.confidence_0_1,
  }))
}

const identifyImage = async () => {
  if (!selectedFile.value) {
    previewText.value = 'Please upload or capture an image first'
    return
  }

  if (!authStore.token) {
    previewText.value = 'You must be signed in to use AI identify'
    return
  }

  try {
    previewText.value = 'Uploading image for identification...'

    const presignResponse = await fetch(presignEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        contentType: selectedFile.value.type || 'application/octet-stream',
        originalName: selectedFile.value.name || `upload-${Date.now()}`,
      }),
    })

    if (!presignResponse.ok) {
      throw new Error(`Presign failed (${presignResponse.status})`)
    }

    const { uploadUrl, key } = await presignResponse.json()
    if (!uploadUrl || !key) {
      throw new Error('Presign response missing uploadUrl/key')
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': selectedFile.value.type || 'application/octet-stream',
      },
      body: selectedFile.value,
    })

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed (${uploadResponse.status})`)
    }

    const identifyResponse = await fetch(identifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ key }),
    })

    if (!identifyResponse.ok) {
      throw new Error(`Identify failed (${identifyResponse.status})`)
    }

    const identifyPayload = await identifyResponse.json()
    provisionalItems.value = normalizeIdentifiedItems(identifyPayload)

    if (provisionalItems.value.length > 0) {
      name.value = provisionalItems.value[0].name || name.value
      description.value = provisionalItems.value[0].description || description.value
    }

    previewText.value = `Identified ${provisionalItems.value.length} object(s)`
  } catch (error) {
    console.error('AI identify error:', error)
    previewText.value = 'AI identify failed'
  }
}

const saveItem = async () => {
  if (!authStore.token) {
    previewText.value = 'You must be signed in to save items'
    return
  }

  try {
    const response = await fetch(itemsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        name: name.value,
        description: description.value,
        box_id: props.boxId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to save item (${response.status})`)
    }

    isOpen.value = false
    name.value = ''
    description.value = ''
    previewText.value = ''
    aiImageDataUrl.value = ''
    selectedFile.value = null
    provisionalItems.value = []

    emit('item-added')
  } catch (error) {
    console.error('Error saving item:', error)
    previewText.value = 'Failed to save item'
  }
}

const cancel = () => {
  name.value = ''
  description.value = ''
  previewText.value = ''
  aiImageDataUrl.value = ''
  selectedFile.value = null
  provisionalItems.value = []
}

defineExpose({ isOpen })
</script>

<style scoped>
.q-card {
  width: 400px;
  max-width: 90vw;
}
</style>
