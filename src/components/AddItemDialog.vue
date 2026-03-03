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
        <q-input v-model="description" label="Description" outlined type="textarea" autogrow />

        <div class="row justify-end">
          <q-btn color="primary" outline label="Add Manual Item to Queue" @click="queueManualItem" />
        </div>

        <q-banner v-if="queuedManualItems.length" rounded class="bg-blue-1 text-blue-10">
          {{ queuedManualItems.length }} manual item{{ queuedManualItems.length === 1 ? '' : 's' }} queued
          for save.
        </q-banner>
      </q-card-section>

      <q-separator class="q-my-md" />

      <q-card-section>
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-subtitle1">AI Identify</div>
          <q-btn
            color="secondary"
            icon="image_search"
            label="AI Identify"
            :loading="isIdentifying"
            :disable="isIdentifying || !aiImageDataUrl"
            @click="identifyImage"
          />
        </div>

        <div class="row q-gutter-sm q-mb-md">
          <q-btn outline icon="photo_camera" label="Take Photo" @click="captureImage" />
          <q-btn outline icon="upload_file" label="Upload Photo" @click="triggerUpload" />
          <input
            ref="uploadInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFileSelected"
          />
        </div>

        <q-input
          v-model="aiInstructions"
          outlined
          autogrow
          type="textarea"
          label="Additional instructions for AI (optional)"
          hint="Example: Ignore packaging and only list individual tools"
        />

        <q-img
          v-if="aiImageDataUrl"
          :src="aiImageDataUrl"
          fit="contain"
          class="q-mt-md rounded-borders ai-preview"
        />

        <q-banner v-if="identifyError" class="bg-red-1 text-red-9 q-mt-md" rounded>
          {{ identifyError }}
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
        <q-btn
          color="primary"
          :disable="!hasAnythingToSave"
          :loading="isSaving"
          @click="saveItems"
          label="Save Approved Items"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { supabase } from '../utils/supabase'
import { useBoxesStore } from 'src/stores/boxes.store'

const boxesStore = useBoxesStore()
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
const queuedManualItems = ref([])

const uploadInput = ref(null)
const aiImageDataUrl = ref('')
const aiInstructions = ref('')
const isIdentifying = ref(false)
const identifyError = ref('')

const provisionalItems = ref([])
const isSaving = ref(false)

const hasApprovedAiItems = computed(() => provisionalItems.value.some((item) => item.approved))
const hasAnythingToSave = computed(
  () => queuedManualItems.value.length > 0 || hasApprovedAiItems.value,
)

const queueManualItem = () => {
  const trimmedName = name.value.trim()
  const trimmedDescription = description.value.trim()

  if (!trimmedName) return

  queuedManualItems.value.push({
    name: trimmedName,
    description: trimmedDescription,
  })

  name.value = ''
  description.value = ''
}

const captureImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    })

    if (!image.base64String) throw new Error('No image captured')

    aiImageDataUrl.value = `data:image/jpeg;base64,${image.base64String}`
    identifyError.value = ''
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

const identifyImage = async () => {
  if (!aiImageDataUrl.value) return

  const apiUrl = process.env.AWS_OPENAI_PROXY_URL || process.env.AI_IDENTIFY_PROXY_URL

  if (!apiUrl) {
    identifyError.value = 'AI endpoint is not configured. Set AWS_OPENAI_PROXY_URL.'
    return
  }

  identifyError.value = ''
  isIdentifying.value = true

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

const normalizeIdentifiedItems = (payload) => {
  const candidates =
    payload?.items || payload?.identifiedItems || payload?.results || payload?.data?.items || []

  return candidates
    .map((item, idx) => {
      if (typeof item === 'string') {
        return {
          localId: `${item}-${idx}`,
          name: item,
          description: '',
          boundingBox: null,
          approved: true,
        }
      }

      const resolvedName = item.name || item.label || item.item || `Identified item ${idx + 1}`
      return {
        localId: `${resolvedName}-${idx}`,
        name: resolvedName,
        description: item.description || '',
        boundingBox: item.boundingBox || item.bbox || item.coordinates || null,
        approved: true,
      }
    })
    .filter((item) => item.name)
}

const formatBoundingBox = (bbox) => {
  if (Array.isArray(bbox)) return bbox.join(', ')
  if (typeof bbox === 'object') {
    return Object.entries(bbox)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  }
  return String(bbox)
}

const saveItems = async () => {
  if (!hasAnythingToSave.value) return

  isSaving.value = true

  try {
    const approvedAiItems = provisionalItems.value
      .filter((item) => item.approved)
      .map((item) => ({
        name: item.name,
        description: item.description,
      }))

    const itemsToInsert = [...queuedManualItems.value, ...approvedAiItems].map((item) => ({
      name: item.name,
      description: item.description,
      box_id: props.boxId,
    }))

    const { data: itemData, error } = await supabase.from('items').insert(itemsToInsert).select('id')

    if (error) {
      console.error('Error saving items:', error)
      return
    }

    const { data: boxData } = await supabase.from('boxes').select('*').eq('id', props.boxId)

    if (boxData && boxData[0]) {
      await boxesStore.updateBox(props.boxId, {
        ...boxData[0],
        items: [...(boxData[0].items || []), ...itemData.map((item) => item.id)],
      })
    }

    emit('item-added')
    isOpen.value = false
    resetDialog()
  } finally {
    isSaving.value = false
  }
}

const cancel = () => {
  resetDialog()
}

const resetDialog = () => {
  name.value = ''
  description.value = ''
  queuedManualItems.value = []

  aiImageDataUrl.value = ''
  aiInstructions.value = ''
  provisionalItems.value = []
  identifyError.value = ''

  if (uploadInput.value) {
    uploadInput.value.value = ''
  }
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
