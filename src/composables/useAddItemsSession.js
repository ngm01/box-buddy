import { computed, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth.store'
import { useItemsStore } from 'src/stores/items.store'
import { useCreditsStore } from 'src/stores/credits.store'
import { CREDITS_PER_PHOTO } from 'src/constants/credits'

const API_BASE = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')

/**
 * Shared state + behaviour for the Add Items flow.
 *
 * Both presentations (mobile slide-up drawer, desktop two-pane dialog) mount this;
 * only the rendering differs. Logic here is a straight lift of what previously lived
 * inside AddItemDialog.vue.
 *
 * @param {object} options
 * @param {() => string} options.boxId  getter for the destination box id
 * @param {() => void} options.onSaved  called after items are persisted
 * @param {() => void} options.onClose  called to dismiss the dialog/drawer
 */
export function useAddItemsSession({ boxId, onSaved, onClose }) {
  const $q = useQuasar()
  const itemsStore = useItemsStore()
  const authStore = useAuthStore()
  const creditsStore = useCreditsStore()

  const activeTab = ref('hand')

  // By Hand form
  const form = reactive({ name: '', description: '', tags: '' })

  // Session items — staged, not yet persisted
  const sessionItems = ref([])
  let nextId = 0

  // Scan phase state machine
  const scanPhase = ref('capture') // 'capture' | 'preview' | 'processing' | 'results' | 'out_of_credits'
  const batchPhotos = ref([])

  const creditsToSpend = computed(() => batchPhotos.value.length * CREDITS_PER_PHOTO)

  const isSaving = ref(false)

  // ── By Hand ────────────────────────────────────────────────────────────────

  const normalizeTags = (str) =>
    str
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

  /**
   * Stage the form contents onto the session list.
   * @param {string[]|null} tags explicit tag list (desktop chips); falls back to form.tags
   * @returns {boolean} whether an item was added
   */
  const addToList = (tags = null) => {
    if (!form.name.trim()) return false
    sessionItems.value.push({
      id: nextId++,
      name: form.name.trim(),
      description: form.description.trim(),
      tags: tags ? tags.filter(Boolean) : normalizeTags(form.tags),
    })
    form.name = ''
    form.description = ''
    form.tags = ''
    return true
  }

  const removeSessionItem = (index) => sessionItems.value.splice(index, 1)

  /** Push already-named items (e.g. AI detections) onto the session list. */
  const stageItems = (items) => {
    for (const item of items) {
      sessionItems.value.push({
        id: nextId++,
        name: item.name,
        description: item.description || '',
        tags: item.tags || [],
      })
    }
  }

  // ── Scan helpers ───────────────────────────────────────────────────────────

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

  // ── Batch processing loop ──────────────────────────────────────────────────

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

  // ── Scan event handlers ────────────────────────────────────────────────────

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

  const onPurchaseComplete = async () => {
    await creditsStore.fetchBalance()
    if ((creditsStore.balance ?? 0) > 0) {
      scanPhase.value = 'processing'
      processBatch()
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  const persist = async (items) => {
    if (!items.length) return
    isSaving.value = true
    try {
      for (const item of items) {
        await itemsStore.createItem({
          name: item.name,
          description: item.description || '',
          tags: item.tags || [],
          box_id: boxId(),
        })
      }
      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving items:', error)
      $q.notify({ type: 'negative', message: 'Failed to save items. Please try again.' })
    } finally {
      isSaving.value = false
    }
  }

  /** Persist an ad-hoc list straight to the box (mobile AI Scan behaviour). */
  const saveItems = (items) => persist(items)

  /** Persist everything staged on the session list. */
  const saveAllItems = () => persist(sessionItems.value)

  // ── Close handling ─────────────────────────────────────────────────────────

  const handleClose = () => {
    if (sessionItems.value.length > 0) {
      $q.dialog({
        title: 'Discard items?',
        message: `You have ${sessionItems.value.length} unsaved item${sessionItems.value.length !== 1 ? 's' : ''}. Close without saving?`,
        cancel: { label: 'Go back', flat: true },
        ok: { label: 'Discard', color: 'negative', flat: true },
        persistent: true,
      }).onOk(() => {
        onClose()
      })
    } else {
      onClose()
    }
  }

  const resetScan = () => {
    scanPhase.value = 'capture'
    batchPhotos.value = []
  }

  const reset = () => {
    Object.assign(form, { name: '', description: '', tags: '' })
    sessionItems.value = []
    activeTab.value = 'hand'
    isSaving.value = false
    resetScan()
  }

  return {
    // state
    activeTab,
    form,
    sessionItems,
    scanPhase,
    batchPhotos,
    creditsToSpend,
    isSaving,
    creditsStore,
    // by hand
    addToList,
    removeSessionItem,
    stageItems,
    // scan
    onPhotoAdded,
    onPhotoRemoved,
    onPhotoRemovedInPreview,
    onConfirmPreview,
    onRetryPhoto,
    onPurchaseComplete,
    // save / close
    saveItems,
    saveAllItems,
    handleClose,
    resetScan,
    reset,
  }
}
