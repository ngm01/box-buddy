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
        <q-btn v-if="enableAI" @click="identifyImage" icon="image_search" label="AI Identify" />
      </q-card-section>

      <q-card-section v-if="previewText">
        <q-banner class="bg-green-2 q-pa-sm">Scanned Data: {{ previewText }}</q-banner>
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
import axios from 'axios'
import { useQuasar } from 'quasar'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner'
import { supabase } from '../utils/supabase'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useSubscription } from 'src/composables/useSubscription'
import { normalizeApiError } from 'src/utils/apiErrors'

const boxesStore = useBoxesStore()
const $q = useQuasar()

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

const { requireEntitlement, openPaywallModal, setUsageCounts, usage } = useSubscription()

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

const saveItem = async () => {
  if (!requireEntitlement({ feature: 'items', reason: 'You reached the item limit for your plan.' })) {
    return
  }

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
    setUsageCounts({ itemCountTotal: usage.value.item_count_total + 1 })
  }

  isOpen.value = false
  name.value = ''
  description.value = ''
  previewText.value = ''

  emit('item-added')
}

const cancel = () => {
  name.value = ''
  description.value = ''
  previewText.value = ''
}

defineExpose({ isOpen })
</script>

<style scoped>
.q-card {
  width: 400px;
  max-width: 90vw;
}
</style>
