<template>
  <q-dialog v-model="isOpen" position="bottom" full-width @hide="resetDialog">
    <q-card class="sheet-card column no-wrap">
      <!-- Drag handle -->
      <div class="drag-handle-row">
        <div class="drag-handle" />
      </div>

      <!-- Header -->
      <div class="row items-center justify-between q-px-md q-pb-sm">
        <div class="text-h6">Add Items</div>
        <q-btn flat round dense icon="close" @click="handleClose" />
      </div>

      <!-- Mode tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        align="justify"
        no-caps
        indicator-color="primary"
        class="q-mx-md q-mb-xs"
      >
        <q-tab name="hand" icon="edit" label="By Hand" />
        <q-tab name="scan" icon="photo_camera" label="Scan Photo" />
      </q-tabs>

      <q-separator />

      <!-- Scrollable body -->
      <div class="col overflow-auto">
        <q-tab-panels v-model="activeTab" animated>
          <!-- By Hand panel -->
          <q-tab-panel name="hand" class="q-pa-none">
            <div class="q-pa-md q-gutter-sm">
              <q-input
                ref="nameInput"
                v-model="form.name"
                label="Item Name *"
                outlined
                dense
                @keydown.enter.prevent="addToList"
              />
              <q-input
                v-model="form.description"
                label="Description"
                outlined
                dense
                type="textarea"
                autogrow
              />
              <q-input
                v-model="form.tags"
                label="Tags (comma-separated)"
                outlined
                dense
                hint="Example: pantry, fragile"
              />
              <q-btn
                outline
                class="full-width"
                label="+ Add to List"
                :disable="!form.name.trim()"
                @click="addToList"
              />
            </div>
          </q-tab-panel>

          <!-- Scan Photo panel -->
          <q-tab-panel name="scan" class="q-pa-none">
            <div class="q-pa-md">
              <!-- idle -->
              <template v-if="scanState === 'idle'">
                <div
                  class="upload-zone column items-center justify-center q-mb-sm"
                  @click="triggerFilePicker"
                >
                  <q-icon name="image" size="48px" class="text-grey-5 q-mb-xs" />
                  <div class="text-body2 text-grey-6 text-weight-medium">Upload a photo</div>
                  <div class="text-caption text-grey-5 text-center q-mt-xs">
                    Tap to choose from your library
                  </div>
                </div>

                <div class="row items-center q-mb-sm">
                  <q-separator class="col" />
                  <span class="text-caption text-grey-5 q-px-sm">or</span>
                  <q-separator class="col" />
                </div>

                <q-btn
                  outline
                  class="full-width q-mb-sm"
                  icon="photo_camera"
                  label="Take a photo now"
                  @click="triggerCamera"
                />
                <div class="text-caption text-grey-5 text-center">
                  AI will identify items in the photo and add them to your list for review
                </div>

                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="onFileSelected"
                />
                <input
                  ref="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style="display: none"
                  @change="onFileSelected"
                />
              </template>

              <!-- scanning -->
              <template v-else-if="scanState === 'scanning'">
                <img
                  v-if="scanPreviewUrl"
                  :src="scanPreviewUrl"
                  class="scan-preview q-mb-md"
                  alt="Photo being analyzed"
                />
                <div v-else class="scan-preview-placeholder q-mb-md" />

                <div class="column items-center q-gutter-y-sm q-py-md">
                  <div class="scanning-dots">
                    <div class="scanning-dot" />
                    <div class="scanning-dot" />
                    <div class="scanning-dot" />
                  </div>
                  <div class="text-body1 text-grey-7 text-weight-medium">Analyzing photo...</div>
                  <div class="text-caption text-grey-5">Identifying items with AI</div>
                </div>

                <q-banner v-if="identifyError" class="bg-red-2 q-mt-sm" rounded>
                  {{ identifyError }}
                  <template #action>
                    <q-btn flat dense color="negative" label="Retry" @click="retryIdentify" />
                    <q-btn flat dense label="Cancel" @click="resetScan" />
                  </template>
                </q-banner>
              </template>

              <!-- results -->
              <template v-else-if="scanState === 'results'">
                <img
                  v-if="scanPreviewUrl"
                  :src="scanPreviewUrl"
                  class="scan-preview-small q-mb-sm"
                  alt="Analyzed photo"
                />

                <div class="row items-start justify-between q-mb-sm">
                  <div>
                    <div class="text-subtitle1 text-weight-bold">
                      Found {{ detectedItems.length }} item{{
                        detectedItems.length !== 1 ? 's' : ''
                      }}
                    </div>
                    <div class="text-caption text-grey-6">Tap to select / deselect</div>
                  </div>
                  <q-btn
                    flat
                    dense
                    no-caps
                    :label="allDetectedSelected ? 'Deselect all' : 'Select all'"
                    @click="toggleSelectAll"
                  />
                </div>

                <q-list bordered separator class="rounded-borders q-mb-sm">
                  <q-item
                    v-for="item in detectedItems"
                    :key="item.localId"
                    clickable
                    v-ripple
                    @click="item.selected = !item.selected"
                  >
                    <q-item-section avatar>
                      <q-checkbox v-model="item.selected" @click.stop />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ item.name }}</q-item-label>
                      <q-item-label v-if="item.confidence" caption>
                        Confidence: {{ item.confidence }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>

                <q-btn
                  outline
                  class="full-width"
                  label="+ Add selected to list"
                  :disable="!detectedItems.some((i) => i.selected)"
                  @click="addSelectedToList"
                />
              </template>
            </div>
          </q-tab-panel>
        </q-tab-panels>

        <!-- Shared session list -->
        <q-separator class="q-mx-md" />
        <div class="q-px-md q-pt-sm q-pb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-bold">
              Added this session
            </div>
            <q-badge v-if="sessionItems.length > 0" color="primary" :label="sessionItems.length" />
          </div>

          <div
            v-if="sessionItems.length === 0"
            class="text-caption text-grey-5 text-center q-py-lg"
          >
            No items yet — add one above
          </div>

          <TransitionGroup name="session-item" tag="div">
            <div
              v-for="(item, index) in sessionItems"
              :key="item.id"
              class="session-item-row row items-start q-py-sm"
            >
              <q-icon
                name="check_circle"
                color="positive"
                size="18px"
                class="q-mr-sm q-mt-xs shrink-0"
              />
              <div class="col">
                <div class="text-body2 text-weight-medium">{{ item.name }}</div>
                <div v-if="item.description" class="text-caption text-grey-6">
                  {{ item.description }}
                </div>
                <div v-if="item.tags.length > 0" class="row wrap q-gutter-x-xs q-mt-xs">
                  <q-chip
                    v-for="tag in item.tags"
                    :key="tag"
                    dense
                    size="sm"
                    color="grey-3"
                    text-color="grey-8"
                    class="q-ma-none"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
              </div>
              <q-btn
                flat
                round
                dense
                icon="close"
                size="sm"
                class="text-grey-5"
                @click="removeSessionItem(index)"
              />
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Footer -->
      <q-separator />
      <div class="q-pa-md">
        <q-btn
          color="primary"
          class="full-width"
          size="lg"
          :label="
            sessionItems.length > 0
              ? `Add ${sessionItems.length} item${sessionItems.length !== 1 ? 's' : ''} to box`
              : 'Add items to box'
          "
          :disable="sessionItems.length === 0"
          :loading="isSaving"
          @click="saveAllItems"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useAuthStore } from 'src/stores/auth.store'
import { useItemsStore } from 'src/stores/items.store'

const $q = useQuasar()
const itemsStore = useItemsStore()
const authStore = useAuthStore()
const API_BASE = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')

const props = defineProps({
  boxId: { type: String, required: true },
})
const emit = defineEmits(['item-added'])

// Dialog
const isOpen = ref(false)
const activeTab = ref('hand')

// By Hand form
const nameInput = ref(null)
const form = reactive({ name: '', description: '', tags: '' })

// Session items (shared between tabs)
const sessionItems = ref([])
let nextId = 0

// Scan tab
const scanState = ref('idle') // 'idle' | 'scanning' | 'results'
const scanPreviewUrl = ref('')
const detectedItems = ref([])
const identifyError = ref('')
const lastScanDataUrl = ref('')
const fileInput = ref(null)
const cameraInput = ref(null)

// Save
const isSaving = ref(false)

const allDetectedSelected = computed(
  () => detectedItems.value.length > 0 && detectedItems.value.every((i) => i.selected),
)

// ── By Hand ─────────────────────────────────────────────────────────────────

const normalizeTags = (str) =>
  str
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

const addToList = () => {
  if (!form.name.trim()) return
  sessionItems.value.push({
    id: nextId++,
    name: form.name.trim(),
    description: form.description.trim(),
    tags: normalizeTags(form.tags),
  })
  form.name = ''
  form.description = ''
  form.tags = ''
  nextTick(() => nameInput.value?.focus())
}

const removeSessionItem = (index) => sessionItems.value.splice(index, 1)

// ── Scan Photo ───────────────────────────────────────────────────────────────

const triggerFilePicker = () => {
  if (Capacitor.isNativePlatform()) {
    captureWithCapacitor(CameraSource.Photos)
  } else {
    fileInput.value?.click()
  }
}

const triggerCamera = () => {
  if (Capacitor.isNativePlatform()) {
    captureWithCapacitor(CameraSource.Camera)
  } else {
    cameraInput.value?.click()
  }
}

const onFileSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const dataUrl = await fileToDataUrl(file)
  await runScanWorkflow(dataUrl)
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const captureWithCapacitor = async (source) => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source,
    })
    const dataUrl = `data:image/jpeg;base64,${image.base64String}`
    await runScanWorkflow(dataUrl)
  } catch (error) {
    console.error('Camera capture error:', error)
    identifyError.value = 'Could not capture image. Please try again.'
    scanState.value = 'scanning'
  }
}

const base64ToBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const normalizeDetectedItems = (payload) => {
  // Primary path: the API returns items as JSON embedded in a markdown code fence
  // inside raw.output[0].content[0].text
  const rawText = payload?.raw?.output?.[0]?.content?.[0]?.text
  if (rawText) {
    try {
      const jsonStr = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(jsonStr)
      const objects = parsed?.objects || parsed?.items || []
      if (objects.length > 0) {
        return objects
          .map((item, idx) => {
            const name = item?.label || item?.name || `Item ${idx + 1}`
            const rawConf = item?.confidence_0_1 ?? item?.confidence ?? item?.score ?? null
            const confidence = rawConf != null ? `${Math.round(rawConf * 100)}%` : null
            return { localId: `${name}-${idx}`, name, confidence, selected: true }
          })
          .filter((item) => item.name)
      }
    } catch (e) {
      console.warn('Failed to parse LLM response JSON:', e)
    }
  }

  // Fallback for flat top-level arrays or legacy response shapes
  const candidates =
    payload?.items ||
    payload?.objects ||
    payload?.identifiedItems ||
    payload?.results ||
    payload?.data?.items ||
    []

  return candidates
    .map((item, idx) => {
      if (typeof item === 'string') {
        return { localId: `${item}-${idx}`, name: item, confidence: null, selected: true }
      }
      const name = item?.name || item?.label || item?.item || item?.title || `Item ${idx + 1}`
      const rawConf =
        item?.confidence_0_1 ?? item?.confidence ?? item?.score ?? item?.conf ?? null
      const confidence =
        rawConf != null
          ? typeof rawConf === 'number'
            ? `${Math.round(rawConf * 100)}%`
            : String(rawConf)
          : null
      return { localId: `${name}-${idx}`, name, confidence, selected: true }
    })
    .filter((item) => item.name)
}

const runScanWorkflow = async (dataUrl) => {
  identifyError.value = ''
  lastScanDataUrl.value = dataUrl
  scanPreviewUrl.value = dataUrl
  scanState.value = 'scanning'
  detectedItems.value = []

  const token = authStore.token
  if (!token) {
    identifyError.value = 'You must be signed in to identify an image.'
    return
  }

  try {
    const presignRes = await fetch(`${API_BASE}/uploads/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contentType: 'image/jpeg',
        originalName: `capture-${Date.now()}.jpg`,
      }),
    })
    if (!presignRes.ok) throw new Error(`Upload prepare failed: ${presignRes.status}`)

    const { uploadUrl, key } = await presignRes.json()
    if (!uploadUrl || !key) throw new Error('Upload prepare response missing fields')

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: base64ToBytes(dataUrl),
    })
    if (!uploadRes.ok) throw new Error(`Image upload failed: ${uploadRes.status}`)

    const identifyRes = await fetch(`${API_BASE}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key }),
    })
    if (!identifyRes.ok) throw new Error(`Identify failed: ${identifyRes.status}`)

    const payload = await identifyRes.json()
    detectedItems.value = normalizeDetectedItems(payload)
    scanState.value = 'results'
  } catch (error) {
    console.error('Scan workflow failed:', error)
    identifyError.value = 'Image processing failed. Check your connection and try again.'
  }
}

const retryIdentify = async () => {
  if (lastScanDataUrl.value) await runScanWorkflow(lastScanDataUrl.value)
}

const resetScan = () => {
  scanState.value = 'idle'
  scanPreviewUrl.value = ''
  detectedItems.value = []
  identifyError.value = ''
  lastScanDataUrl.value = ''
}

const toggleSelectAll = () => {
  const newVal = !allDetectedSelected.value
  detectedItems.value.forEach((item) => {
    item.selected = newVal
  })
}

const addSelectedToList = () => {
  detectedItems.value
    .filter((i) => i.selected)
    .forEach((item) => {
      sessionItems.value.push({ id: nextId++, name: item.name, description: '', tags: [] })
    })
  resetScan()
}

// ── Footer CTA ───────────────────────────────────────────────────────────────

const saveAllItems = async () => {
  if (!sessionItems.value.length) return
  isSaving.value = true
  try {
    for (const item of sessionItems.value) {
      await itemsStore.createItem({
        name: item.name,
        description: item.description,
        tags: item.tags,
        box_id: props.boxId,
      })
    }
    emit('item-added')
    isOpen.value = false
  } catch (error) {
    console.error('Error saving items:', error)
    $q.notify({ type: 'negative', message: 'Failed to save items. Please try again.' })
  } finally {
    isSaving.value = false
  }
}

// ── Close handling ───────────────────────────────────────────────────────────

const handleClose = () => {
  if (sessionItems.value.length > 0) {
    $q.dialog({
      title: 'Discard items?',
      message: `You have ${sessionItems.value.length} unsaved item${sessionItems.value.length !== 1 ? 's' : ''}. Close without saving?`,
      cancel: { label: 'Go back', flat: true },
      ok: { label: 'Discard', color: 'negative', flat: true },
      persistent: true,
    }).onOk(() => {
      isOpen.value = false
    })
  } else {
    isOpen.value = false
  }
}

const resetDialog = () => {
  Object.assign(form, { name: '', description: '', tags: '' })
  sessionItems.value = []
  activeTab.value = 'hand'
  isSaving.value = false
  resetScan()
}

defineExpose({ isOpen })
</script>

<style scoped>
.sheet-card {
  max-height: 85vh;
  max-height: 85dvh;
  border-radius: 16px 16px 0 0;
}

.drag-handle-row {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}

.drag-handle {
  width: 36px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.upload-zone {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 24px 16px;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: center;
}

.upload-zone:hover {
  border-color: var(--q-primary);
}

.scan-preview {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.scan-preview-small {
  width: 100%;
  max-height: 80px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.scan-preview-placeholder {
  width: 100%;
  height: 120px;
  background: repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 6px, #eeeeee 6px, #eeeeee 12px);
  border-radius: 8px;
}

.scanning-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.scanning-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--q-primary);
  animation: bounce 1.2s infinite;
}

.scanning-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.scanning-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.session-item-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.session-item-row:last-child {
  border-bottom: none;
}

.shrink-0 {
  flex-shrink: 0;
}

.session-item-enter-active,
.session-item-leave-active {
  transition: all 0.25s ease;
}

.session-item-enter-from,
.session-item-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

.session-item-move {
  transition: transform 0.25s ease;
}
</style>
