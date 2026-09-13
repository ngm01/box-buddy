<template>
  <!-- ── idle / capture ─────────────────────────────────────────────────── -->
  <template v-if="phase === 'capture'">
    <div class="credit-hint">
      <q-icon name="bolt" size="14px" class="credit-hint__icon" />
      <span>{{ creditBalance ?? '–' }} credits · ~{{ creditsPerPhoto }} per photo</span>
    </div>

    <div
      class="scan-zone"
      :class="{ 'scan-zone--over': isDragOver }"
      role="button"
      tabindex="0"
      @click="triggerFilePicker"
      @keydown.enter.prevent="triggerFilePicker"
      @keydown.space.prevent="triggerFilePicker"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <div class="scan-zone__icon">
        <q-icon name="file_upload" size="24px" />
      </div>
      <div class="scan-zone__title">Upload a photo</div>
      <div class="scan-zone__sub">Click to choose from your library — AI will identify items</div>
    </div>

    <div class="scan-or">
      <div class="scan-or__line" />
      <span>or</span>
      <div class="scan-or__line" />
    </div>

    <button type="button" class="scan-camera-btn" @click="triggerCamera">
      <q-icon name="photo_camera" size="14px" />
      Take a photo
    </button>

    <template v-if="photos.length > 0">
      <div class="thumb-strip">
        <div v-for="photo in photos" :key="photo.id" class="thumb-wrap">
          <img :src="photo.dataUrl" class="thumb-img" alt="" />
          <button
            type="button"
            class="thumb-remove"
            title="Remove photo"
            aria-label="Remove photo"
            @click="$emit('photo-removed', photo.id)"
          >
            <q-icon name="close" size="12px" />
          </button>
        </div>
      </div>

      <button type="button" class="primary-btn" @click="$emit('confirm')">
        Identify {{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }} · ~{{
          creditsToSpend
        }}
        credits
      </button>
    </template>
  </template>

  <!-- ── scanning ───────────────────────────────────────────────────────── -->
  <template v-else-if="phase === 'processing'">
    <div v-for="photo in photos" :key="photo.id" class="proc-row">
      <img :src="photo.dataUrl" class="scan-img-thumb" alt="" />
      <div class="proc-status">{{ statusLabel(photo.status) }}</div>
    </div>

    <div class="scanning-indicator">
      <div class="dots">
        <div class="dot" />
        <div class="dot" />
        <div class="dot" />
      </div>
      <div class="scanning-label">
        Analyzing photo{{ photos.length !== 1 ? 's' : '' }} with AI…
      </div>
    </div>
  </template>

  <!-- ── results ────────────────────────────────────────────────────────── -->
  <template v-else-if="phase === 'results'">
    <div aria-live="polite" class="sr-only">
      Found {{ totalDetected }} item{{ totalDetected !== 1 ? 's' : '' }}
    </div>

    <div v-for="photo in donePhotos" :key="photo.id" class="result-group">
      <img :src="photo.dataUrl" class="scan-img-thumb scan-img-thumb--sm" alt="" />

      <div class="detected-header">
        <div class="detected-title">
          Found {{ photo.items.length }} item{{ photo.items.length !== 1 ? 's' : '' }}
        </div>
        <button
          v-if="photo.items.length > 0"
          type="button"
          class="select-all"
          @click="toggleAll(photo)"
        >
          {{ allSelected(photo) ? 'Deselect all' : 'Select all' }}
        </button>
      </div>

      <div v-if="photo.items.length === 0" class="detected-empty">
        No items recognised in this photo.
      </div>

      <div
        v-for="item in photo.items"
        :key="item.localId"
        class="detected-item"
        role="checkbox"
        tabindex="0"
        :aria-checked="item.selected"
        @click="item.selected = !item.selected"
        @keydown.space.prevent="item.selected = !item.selected"
        @keydown.enter.prevent="item.selected = !item.selected"
      >
        <span class="d-checkbox" :class="{ 'd-checkbox--checked': item.selected }">
          <q-icon v-if="item.selected" name="check" size="10px" color="white" />
        </span>
        <span class="detected-name">{{ item.name }}</span>
        <span v-if="item.confidence" class="detected-conf">{{ item.confidence }}</span>
      </div>

      <button type="button" class="text-link-btn" @click="$emit('retry-photo', photo.id)">
        Something wrong? Retry free
      </button>
    </div>

    <div v-for="photo in errorPhotos" :key="photo.id" class="result-group">
      <img :src="photo.dataUrl" class="scan-img-thumb scan-img-thumb--sm" alt="" />
      <div class="detected-error">{{ photo.error || 'Failed to identify' }}</div>
      <button type="button" class="text-link-btn" @click="$emit('retry-photo', photo.id)">
        Retry
      </button>
    </div>

    <button
      type="button"
      class="primary-btn"
      :disabled="selectedCount === 0"
      @click="addSelected"
    >
      Add {{ selectedCount }} selected to list
    </button>
    <button type="button" class="text-link-btn text-link-btn--center" @click="$emit('reset')">
      Scan another photo
    </button>
  </template>

  <!-- Hidden file inputs (web) -->
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

<script setup>
import { computed, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const props = defineProps({
  phase: { type: String, required: true },
  photos: { type: Array, required: true },
  creditBalance: { type: Number, default: null },
  creditsPerPhoto: { type: Number, required: true },
  creditsToSpend: { type: Number, required: true },
})

const emit = defineEmits(['photo-added', 'photo-removed', 'confirm', 'retry-photo', 'stage-items', 'reset'])

const fileInput = ref(null)
const cameraInput = ref(null)
const isDragOver = ref(false)

const donePhotos = computed(() => props.photos.filter((p) => p.status === 'done'))
const errorPhotos = computed(() => props.photos.filter((p) => p.status === 'error'))
const totalDetected = computed(() => donePhotos.value.reduce((n, p) => n + p.items.length, 0))
const selectedCount = computed(() =>
  donePhotos.value.reduce((n, p) => n + p.items.filter((i) => i.selected).length, 0),
)

const statusLabel = (status) => {
  if (status === 'uploading') return 'Uploading…'
  if (status === 'identifying') return 'Analyzing…'
  if (status === 'done') return 'Done'
  if (status === 'error') return 'Failed'
  return 'Waiting…'
}

const allSelected = (photo) => photo.items.length > 0 && photo.items.every((i) => i.selected)

const toggleAll = (photo) => {
  const next = !allSelected(photo)
  photo.items.forEach((i) => {
    i.selected = next
  })
}

const addSelected = () => {
  const items = donePhotos.value.flatMap((p) =>
    p.items.filter((i) => i.selected).map((i) => ({ name: i.name, description: '', tags: [] })),
  )
  if (items.length) emit('stage-items', items)
}

// ── capture ──────────────────────────────────────────────────────────────────

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

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const onFileSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  emit('photo-added', await fileToDataUrl(file))
}

const onDrop = async (event) => {
  isDragOver.value = false
  const files = [...(event.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'))
  for (const file of files) {
    emit('photo-added', await fileToDataUrl(file))
  }
}

const captureWithCapacitor = async (source) => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source,
    })
    emit('photo-added', `data:image/jpeg;base64,${image.base64String}`)
  } catch (error) {
    console.error('Camera capture error:', error)
  }
}
</script>

<style scoped>
.credit-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #999;
}
.credit-hint__icon {
  color: #f0a202;
}

.scan-zone {
  border: 2px dashed #ddd;
  border-radius: 10px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  gap: 10px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.scan-zone:hover,
.scan-zone:focus-visible,
.scan-zone--over {
  border-color: #1976d2;
  background: #f0f7ff;
  outline: none;
}
.scan-zone__icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #eef3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976d2;
}
.scan-zone__title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.scan-zone__sub {
  font-size: 12px;
  color: #999;
}

.scan-or {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ccc;
  font-size: 12px;
}
.scan-or__line {
  flex: 1;
  height: 1px;
  background: #eee;
}

.scan-camera-btn {
  width: 100%;
  height: 38px;
  border-radius: 7px;
  border: 1.5px solid #e0e0e0;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all 0.15s;
}
.scan-camera-btn:hover {
  background: #f5f5f5;
  border-color: #aaa;
}

.thumb-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.thumb-wrap {
  position: relative;
  width: 60px;
  height: 60px;
}
.thumb-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 7px;
  display: block;
  border: 1px solid #e0e0e0;
}
.thumb-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.primary-btn {
  width: 100%;
  height: 36px;
  border-radius: 7px;
  border: none;
  background: #1976d2;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 2px;
  transition: background 0.15s;
}
.primary-btn:hover {
  background: #1565c0;
}
.primary-btn:disabled {
  background: #b0c8e8;
  cursor: default;
}

.proc-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.proc-status {
  font-size: 12px;
  color: #999;
}

.scan-img-thumb {
  width: 100%;
  height: 90px;
  object-fit: cover;
  border-radius: 8px;
  border: 1.5px solid #e0e0e0;
  display: block;
  flex-shrink: 0;
}
.scan-img-thumb--sm {
  height: 64px;
}

.scanning-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 0 4px;
}
.dots {
  display: flex;
  gap: 5px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1976d2;
  animation: pulse 1.2s ease-in-out infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes pulse {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.3;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
.scanning-label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.result-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detected-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detected-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.select-all {
  font-size: 12px;
  color: #1976d2;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  padding: 0;
}
.select-all:hover {
  text-decoration: underline;
}

.detected-empty,
.detected-error {
  font-size: 12px;
  color: #999;
}
.detected-error {
  color: #e53935;
}

.detected-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}
.detected-item:last-of-type {
  border-bottom: none;
}
.detected-item:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
  border-radius: 4px;
}
.d-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.12s;
}
.d-checkbox--checked {
  background: #1976d2;
  border-color: #1976d2;
}
.detected-name {
  font-size: 13px;
  color: #222;
  font-weight: 500;
  flex: 1;
  min-width: 0;
}
.detected-conf {
  font-size: 11px;
  color: #bbb;
  flex-shrink: 0;
}

.text-link-btn {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: #999;
  cursor: pointer;
  align-self: flex-start;
}
.text-link-btn:hover {
  color: #1976d2;
  text-decoration: underline;
}
.text-link-btn--center {
  align-self: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
