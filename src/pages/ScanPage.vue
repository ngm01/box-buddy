<template>
  <div class="scanner">
    <video ref="videoEl" class="scanner__camera" playsinline muted autoplay />

    <div class="scanner__top">
      <button type="button" class="scanner__circle" aria-label="Close scanner" @click="close">
        <q-icon name="close" />
      </button>
      <span class="scanner__title">Scan a box label</span>
      <button
        v-if="torchSupported"
        type="button"
        class="scanner__circle"
        :class="{ 'is-on': torchOn }"
        :aria-label="torchOn ? 'Turn flashlight off' : 'Turn flashlight on'"
        :aria-pressed="torchOn"
        @click="toggleTorch"
      >
        <q-icon :name="torchOn ? 'flashlight_on' : 'flashlight_off'" />
      </button>
      <span v-else class="scanner__circle-spacer" />
    </div>

    <div class="scanner__frame" :class="{ 'is-found': state === 'found' }">
      <i /><i /><i /><i />
      <div v-if="state === 'scanning'" class="scanner__sweep" />
    </div>

    <div class="scanner__hint" aria-live="polite">{{ hint }}</div>

    <div
      class="scanner__sheet"
      :class="{ 'is-open': state === 'found' }"
      :inert="state !== 'found'"
    >
      <div class="scanner__grab" />
      <template v-if="foundBox">
        <div class="row items-center no-wrap q-gutter-x-md">
          <div class="scanner__ok"><q-icon name="check" size="24px" /></div>
          <div class="col overflow-hidden">
            <div class="scanner__found-label">Box found</div>
            <div class="scanner__found-name ellipsis">{{ foundBox.boxName }}</div>
          </div>
        </div>
        <div class="scanner__actions">
          <q-btn outline color="primary" label="Scan again" class="scanner__btn" @click="resume" />
          <q-btn
            unelevated
            color="primary"
            label="Open box"
            class="scanner__btn"
            @click="openFoundBox"
          />
        </div>
      </template>
    </div>

    <MessageDialog
      v-model="errorOpen"
      :title="error?.title ?? ''"
      :message="error?.message ?? ''"
      @hide="onErrorHidden"
    >
      <template #actions>
        <q-btn flat color="primary" label="Close" @click="close" />
        <q-btn v-if="!error?.fatal" flat color="primary" label="Scan again" v-close-popup />
      </template>
    </MessageDialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import jsQR from 'jsqr'
import MessageDialog from 'src/components/MessageDialog.vue'
import { useBoxesStore } from 'src/stores/boxes.store'
import { parseBoxQrUrl } from 'src/utils/boxQrUrl'
import { goBackOr } from 'src/utils/navigation'

// Frames are downscaled to this long edge before decoding; plenty for a label
// filling the viewfinder, and keeps each jsQR pass to a few milliseconds.
const MAX_FRAME_EDGE = 720
const SCAN_INTERVAL_MS = 120
// After dismissing an error, ignore the same code briefly so a label still in
// view doesn't immediately reopen the modal.
const REJECT_COOLDOWN_MS = 2500

// `fatal` errors leave nothing to retry, so the modal only offers Close.
const ERRORS = {
  not_box_buddy: {
    title: 'Not a Box Buddy code',
    message:
      "This QR code wasn't made by Box Buddy. Scan the label printed from one of your boxes.",
  },
  malformed: {
    title: "Can't read this label",
    message:
      'This looks like a Box Buddy code, but the link inside it is incomplete or damaged. Try reprinting the label from the box’s QR code screen.',
  },
  not_found: {
    title: 'Box not found',
    message:
      'This box no longer exists. It may have been deleted or renamed since the label was printed.',
  },
  forbidden: {
    title: 'No access to this box',
    message:
      "This label is valid, but the box is private and you don't have access. Ask the owner to share it or make it public.",
  },
  network: {
    title: "Couldn't check this box",
    message: 'Something went wrong looking up this label. Check your connection and try again.',
  },
  camera_denied: {
    title: 'Camera access needed',
    message: 'Allow Box Buddy to use your camera in Settings to scan box labels.',
    fatal: true,
  },
  camera_unavailable: {
    title: 'Camera unavailable',
    message:
      "We couldn't start a camera on this device. Close other apps using the camera and try again.",
    fatal: true,
  },
}

const router = useRouter()
const boxesStore = useBoxesStore()

const videoEl = ref(null)
const state = ref('starting') // starting | scanning | resolving | found | error
const foundBox = ref(null)
const error = ref(null)
const errorOpen = ref(false)
const torchSupported = ref(false)
const torchOn = ref(false)

const hint = computed(() => {
  switch (state.value) {
    case 'starting':
      return 'Starting camera…'
    case 'resolving':
      return 'Checking label…'
    case 'found':
      return 'Label found'
    default:
      return 'Point your camera at a Box Buddy QR label'
  }
})

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d', { willReadFrequently: true })
let stream = null
let scanTimer = null
let isUnmounted = false
let isClosing = false
let lastRejected = { text: null, at: 0 }

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showError(ERRORS.camera_unavailable)
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
  } catch (err) {
    console.error('Unable to start camera', err)
    const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
    showError(denied ? ERRORS.camera_denied : ERRORS.camera_unavailable)
    return
  }

  if (isUnmounted) {
    stopCamera()
    return
  }

  videoEl.value.srcObject = stream
  await videoEl.value.play().catch(() => {})

  const track = stream.getVideoTracks()[0]
  torchSupported.value = Boolean(track?.getCapabilities?.().torch)

  state.value = 'scanning'
  scheduleScan()
}

function stopCamera() {
  clearTimeout(scanTimer)
  scanTimer = null
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

function scheduleScan() {
  clearTimeout(scanTimer)
  scanTimer = setTimeout(scanFrame, SCAN_INTERVAL_MS)
}

function scanFrame() {
  scanTimer = null
  if (state.value !== 'scanning') return

  const video = videoEl.value
  if (video && video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth) {
    const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(video.videoWidth, video.videoHeight))
    const width = Math.round(video.videoWidth * scale)
    const height = Math.round(video.videoHeight * scale)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    ctx.drawImage(video, 0, 0, width, height)
    const { data } = ctx.getImageData(0, 0, width, height)
    const code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' })

    if (code?.data && !isCoolingDown(code.data)) {
      handleCode(code.data)
      return
    }
  }

  scheduleScan()
}

function isCoolingDown(text) {
  return text === lastRejected.text && Date.now() - lastRejected.at < REJECT_COOLDOWN_MS
}

async function handleCode(text) {
  state.value = 'resolving'
  navigator.vibrate?.(40)

  const parsed = parseBoxQrUrl(text)
  if (!parsed.ok) {
    rejectCode(text, ERRORS[parsed.reason])
    return
  }

  let access
  try {
    access = await boxesStore.getBoxAccessStatus(parsed.displayName, parsed.boxName)
  } catch (err) {
    console.error('Unable to resolve scanned box', err)
    rejectCode(text, ERRORS.network)
    return
  }

  if (isUnmounted) return

  if (access.status_code === 404) {
    rejectCode(text, ERRORS.not_found)
    return
  }
  if (access.status_code === 403) {
    rejectCode(text, ERRORS.forbidden)
    return
  }

  foundBox.value = parsed
  state.value = 'found'
}

function rejectCode(text, details) {
  lastRejected = { text, at: Infinity }
  showError(details)
}

function showError(details) {
  if (isUnmounted) return
  state.value = 'error'
  error.value = details
  errorOpen.value = true
}

function onErrorHidden() {
  if (isUnmounted) return
  if (error.value?.fatal) {
    close()
    return
  }
  // Start the cooldown from dismissal, not detection, so the user gets the full window.
  lastRejected.at = Date.now()
  resume()
}

function resume() {
  if (!stream) return
  foundBox.value = null
  state.value = 'scanning'
  scheduleScan()
}

async function toggleTorch() {
  const track = stream?.getVideoTracks()[0]
  if (!track) return
  try {
    await track.applyConstraints({ advanced: [{ torch: !torchOn.value }] })
    torchOn.value = !torchOn.value
  } catch (err) {
    console.warn('Unable to toggle flashlight', err)
    torchSupported.value = false
  }
}

function close() {
  // The error modal's Close button and its hide handler can both land here.
  if (isClosing) return
  isClosing = true
  stopCamera()
  goBackOr(router, '/boxes')
}

function openFoundBox() {
  stopCamera()
  router.replace(foundBox.value.path)
}

function onKeydown(event) {
  if (event.key === 'Escape' && !errorOpen.value) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  startCamera()
})

onBeforeUnmount(() => {
  isUnmounted = true
  window.removeEventListener('keydown', onKeydown)
  stopCamera()
})
</script>

<style scoped>
.scanner {
  position: fixed;
  inset: 0;
  z-index: 2000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #0d0f12;
  color: #fff;
}
.scanner__camera {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner__top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 12px) 16px 0;
}
.scanner__title {
  font-size: 17px;
  font-weight: 500;
}
.scanner__circle,
.scanner__circle-spacer {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}
.scanner__circle {
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}
.scanner__circle:hover {
  background: rgba(0, 0, 0, 0.65);
}
.scanner__circle.is-on {
  background: #fff;
  color: #111;
}

/* The huge spread shadow dims everything outside the viewfinder. */
.scanner__frame {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  margin: 110px auto 0;
  width: 250px;
  height: 250px;
  border-radius: 20px;
  box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.55);
}
.scanner__frame i {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 4px solid #fff;
  transition: border-color 0.2s;
}
.scanner__frame i:nth-child(1) {
  left: -2px;
  top: -2px;
  border-right: 0;
  border-bottom: 0;
  border-radius: 20px 0 0 0;
}
.scanner__frame i:nth-child(2) {
  right: -2px;
  top: -2px;
  border-left: 0;
  border-bottom: 0;
  border-radius: 0 20px 0 0;
}
.scanner__frame i:nth-child(3) {
  left: -2px;
  bottom: -2px;
  border-right: 0;
  border-top: 0;
  border-radius: 0 0 0 20px;
}
.scanner__frame i:nth-child(4) {
  right: -2px;
  bottom: -2px;
  border-left: 0;
  border-top: 0;
  border-radius: 0 0 20px 0;
}
.scanner__frame.is-found i {
  border-color: #4caf50;
}
.scanner__sweep {
  position: absolute;
  left: 14px;
  right: 14px;
  height: 2px;
  border-radius: 2px;
  background: #64b5f6;
  box-shadow: 0 0 12px #64b5f6;
  animation: scanner-sweep 2.2s ease-in-out infinite;
}
@keyframes scanner-sweep {
  0%,
  100% {
    top: 14px;
  }
  50% {
    top: 232px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .scanner__sweep {
    animation: none;
    top: 50%;
  }
}

.scanner__hint {
  position: relative;
  z-index: 2;
  margin-top: 28px;
  padding: 0 40px;
  text-align: center;
  font-size: 15px;
  line-height: 1.4;
  color: #e0e0e0;
}

.scanner__sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  padding: 10px 20px calc(env(safe-area-inset-bottom) + 20px);
  border-radius: 20px 20px 0 0;
  background: #fff;
  color: #111;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.scanner__sheet.is-open {
  transform: none;
}
.scanner__grab {
  width: 36px;
  height: 4px;
  margin: 0 auto 16px;
  border-radius: 2px;
  background: #ddd;
}
.scanner__ok {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  color: #2e7d32;
}
.scanner__found-label {
  font-size: 13px;
  color: #888;
}
.scanner__found-name {
  margin-top: 2px;
  font-size: 20px;
  font-weight: 700;
}
.scanner__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
}
.scanner__btn {
  min-height: 44px;
}
</style>
