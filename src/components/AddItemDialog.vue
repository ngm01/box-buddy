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
        <q-tab name="scan" icon="auto_awesome" label="AI Scan" />
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

          <!-- AI Scan panel -->
          <q-tab-panel name="scan" class="q-pa-none">
            <ScanCapture
              v-if="scanPhase === 'capture'"
              :photos="batchPhotos"
              :credit-balance="creditsStore.balance"
              :credits-per-photo="CREDITS_PER_PHOTO"
              @photo-added="onPhotoAdded"
              @photo-removed="onPhotoRemoved"
              @done="scanPhase = 'preview'"
            />
            <ScanPreview
              v-else-if="scanPhase === 'preview'"
              :photos="batchPhotos"
              :credits-to-spend="creditsToSpend"
              @confirm="onConfirmPreview"
              @back="scanPhase = 'capture'"
              @photo-removed="onPhotoRemovedInPreview"
            />
            <ScanProcessing
              v-else-if="scanPhase === 'processing'"
              :photos="batchPhotos"
            />
            <ScanResults
              v-else-if="scanPhase === 'results'"
              :photos="batchPhotos"
              :box-name="boxName"
              @add-items="onAddItems"
              @retry-photo="onRetryPhoto"
            />
            <OutOfCreditsCard
              v-else-if="scanPhase === 'out_of_credits'"
              :saved-photo-count="batchPhotos.filter((p) => p.status === 'pending').length"
              @purchase-complete="onPurchaseComplete"
              @dismiss="handleClose"
            />
          </q-tab-panel>
        </q-tab-panels>

        <!-- Shared session list (By Hand) -->
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

      <!-- Footer (By Hand session items) -->
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
import { useAuthStore } from 'src/stores/auth.store'
import { useItemsStore } from 'src/stores/items.store'
import { useCreditsStore } from 'src/stores/credits.store'
import { CREDITS_PER_PHOTO } from 'src/constants/credits'
import ScanCapture from 'src/components/scan/ScanCapture.vue'
import ScanPreview from 'src/components/scan/ScanPreview.vue'
import ScanProcessing from 'src/components/scan/ScanProcessing.vue'
import ScanResults from 'src/components/scan/ScanResults.vue'
import OutOfCreditsCard from 'src/components/OutOfCreditsCard.vue'

const $q = useQuasar()
const itemsStore = useItemsStore()
const authStore = useAuthStore()
const creditsStore = useCreditsStore()
const API_BASE = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')

const props = defineProps({
  boxId: { type: String, required: true },
  boxName: { type: String, default: '' },
})
const emit = defineEmits(['item-added'])

// Dialog
const isOpen = ref(false)
const activeTab = ref('hand')

// By Hand form
const nameInput = ref(null)
const form = reactive({ name: '', description: '', tags: '' })

// Session items (By Hand)
const sessionItems = ref([])
let nextId = 0

// Scan phase state machine
const scanPhase = ref('capture') // 'capture' | 'preview' | 'processing' | 'results' | 'out_of_credits'
const batchPhotos = ref([])

const creditsToSpend = computed(() => batchPhotos.value.length * CREDITS_PER_PHOTO)

// Save
const isSaving = ref(false)

// ── By Hand ──────────────────────────────────────────────────────────────────

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

// ── Scan helpers ──────────────────────────────────────────────────────────────

const base64ToBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const normalizeDetectedItems = (payload) => {
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
            return {
              localId: `${name}-${idx}`,
              name,
              confidence,
              selected: true,
              editing: false,
              _originalName: name,
            }
          })
          .filter((item) => item.name)
      }
    } catch (e) {
      console.warn('Failed to parse LLM response JSON:', e)
    }
  }

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
        return {
          localId: `${item}-${idx}`,
          name: item,
          confidence: null,
          selected: true,
          editing: false,
          _originalName: item,
        }
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
      return {
        localId: `${name}-${idx}`,
        name,
        confidence,
        selected: true,
        editing: false,
        _originalName: name,
      }
    })
    .filter((item) => item.name)
}

async function presignUpload() {
  const res = await fetch(`${API_BASE}/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.token}`,
    },
    body: JSON.stringify({
      contentType: 'image/jpeg',
      originalName: `capture-${Date.now()}.jpg`,
    }),
  })
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`)
  return res.json()
}

async function uploadToS3(uploadUrl, dataUrl) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: base64ToBytes(dataUrl),
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
}

async function callIdentify(key, freeRetry = false) {
  const res = await fetch(`${API_BASE}/identify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.token}`,
    },
    body: JSON.stringify({ key, ...(freeRetry ? { freeRetry: true } : {}) }),
  })
  if (res.status === 402) {
    const body = await res.json()
    const err = new Error('Insufficient credits')
    err.status = 402
    err.body = body
    throw err
  }
  if (!res.ok) throw new Error(`Identify failed: ${res.status}`)
  return res.json()
}

// ── Batch processing loop ─────────────────────────────────────────────────────

const processBatch = async () => {
  for (const photo of batchPhotos.value) {
    if (photo.status !== 'pending') continue

    try {
      photo.status = 'uploading'
      const { uploadUrl, key } = await presignUpload()
      await uploadToS3(uploadUrl, photo.dataUrl)
      photo.s3Key = key

      photo.status = 'identifying'
      const result = await callIdentify(key, false)

      photo.items = normalizeDetectedItems(result)
      photo.status = 'done'
      if (result.creditsRemaining != null) {
        creditsStore.updateBalance(result.creditsRemaining)
      }
    } catch (err) {
      if (err.status === 402) {
        creditsStore.updateBalance(err.body?.balance ?? 0)
        scanPhase.value = 'out_of_credits'
        return
      }
      photo.status = 'error'
      photo.error = err.message || 'Failed to identify'
    }
  }

  scanPhase.value = 'results'
}

// ── Scan event handlers ───────────────────────────────────────────────────────

const onPhotoAdded = (dataUrl) => {
  batchPhotos.value.push({
    id: crypto.randomUUID(),
    dataUrl,
    s3Key: null,
    status: 'pending',
    items: [],
    error: null,
  })
}

const onPhotoRemoved = (id) => {
  batchPhotos.value = batchPhotos.value.filter((p) => p.id !== id)
}

const onPhotoRemovedInPreview = (id) => {
  batchPhotos.value = batchPhotos.value.filter((p) => p.id !== id)
  if (batchPhotos.value.length === 0) scanPhase.value = 'capture'
}

const onConfirmPreview = () => {
  if (creditsStore.hasCredits(creditsToSpend.value)) {
    scanPhase.value = 'processing'
    processBatch()
  } else {
    scanPhase.value = 'out_of_credits'
  }
}

const onRetryPhoto = async (photoId) => {
  const photo = batchPhotos.value.find((p) => p.id === photoId)
  if (!photo || !photo.s3Key) return
  photo.status = 'identifying'
  photo.items = []
  try {
    const result = await callIdentify(photo.s3Key, true)
    photo.items = normalizeDetectedItems(result)
    photo.status = 'done'
  } catch {
    photo.status = 'error'
    photo.error = 'Retry failed'
  }
}

const onAddItems = async (items) => {
  isSaving.value = true
  try {
    for (const item of items) {
      await itemsStore.createItem({
        name: item.name,
        description: item.description || '',
        tags: item.tags || [],
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

const onPurchaseComplete = async () => {
  await creditsStore.fetchBalance()
  if ((creditsStore.balance ?? 0) > 0) {
    scanPhase.value = 'processing'
    processBatch()
  }
}

// ── Footer CTA (By Hand) ──────────────────────────────────────────────────────

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

// ── Close handling ────────────────────────────────────────────────────────────

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

const resetScan = () => {
  scanPhase.value = 'capture'
  batchPhotos.value = []
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
