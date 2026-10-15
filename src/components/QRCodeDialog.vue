<template>
  <q-dialog v-model="isOpen">
    <q-card class="qr-dialog column no-wrap">
      <!-- Header -->
      <div class="row items-start q-px-lg q-pt-lg q-pb-md">
        <div class="col">
          <div class="text-h6 text-weight-bold">QR Code &amp; Label</div>
          <div class="text-body2 text-grey-6">{{ props.box?.name }}</div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Close dialog"
          v-close-popup
        />
      </div>
      <q-separator />

      <!-- Body -->
      <div class="col overflow-auto q-pa-lg">
        <!-- QR Code section -->
        <div class="text-overline text-grey-6 q-mb-sm">QR Code</div>

        <div class="row justify-center q-mb-md">
          <div class="qr-card">
            <QRCodeCanvas ref="qrCodeCanvasRef" :url="qrValue" :size="160" />
          </div>
        </div>

        <div class="row items-center q-gutter-x-sm q-mb-lg">
          <q-btn
            color="primary"
            no-caps
            size="md"
            icon="download"
            label="Download"
            aria-label="Download QR code"
            @click="downloadQRCode"
          />
          <q-btn
            outline
            color="primary"
            no-caps
            size="md"
            icon="print"
            label="Print"
            aria-label="Print QR code"
            @click="printQRCode"
          />
          <q-btn
            flat
            round
            size="md"
            icon="share"
            color="primary"
            aria-label="Share QR code"
            @click="shareQRCode"
          />
        </div>

        <q-separator class="q-mb-lg" />

        <!-- Full Label section -->
        <div class="text-overline text-grey-6 q-mb-sm">Full Label</div>

        <!-- Label preview card -->
        <div class="label-preview row items-center q-gutter-x-md q-mb-md">
          <QRCodeCanvas :url="qrValue" :size="52" />
          <div class="col">
            <div class="text-body2 text-weight-bold">{{ props.box?.name }}</div>
            <div v-if="labelMeta" class="text-caption text-grey-6">{{ labelMeta }}</div>
          </div>
        </div>

        <div class="row items-center q-gutter-x-sm">
          <q-btn
            flat
            no-caps
            size="md"
            icon="image"
            label="PNG"
            aria-label="Download label as PNG"
            :loading="isDownloadingPng"
            @click="downloadLabelPng"
          />
          <q-btn
            flat
            no-caps
            size="md"
            icon="code"
            label="SVG"
            aria-label="Download label as SVG"
            :loading="isDownloadingSvg"
            @click="downloadLabelSvg"
          />
          <q-btn
            outline
            color="primary"
            no-caps
            size="md"
            icon="print"
            label="Print"
            aria-label="Print full label"
            @click="printLabel"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>

  <!-- Print-only surface; hidden on screen, see .bb-print-root in app.scss -->
  <Teleport v-if="isOpen" to="body">
    <div class="bb-print-root">
      <BoxQrLabel ref="printLabelRef" :box="props.box" :variant="printVariant" />
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import QRCode from 'qrcode'
import QRCodeCanvas from './QRCodeCanvas.vue'
import BoxQrLabel from './BoxQrLabel.vue'
import { getBoxQrValue, getBoxShortIdentifier } from 'src/utils/boxQr'
import { printDocument } from 'src/services/print.service'

const $q = useQuasar()

const props = defineProps({
  box: {
    type: Object,
    required: true,
  },
})

const qrCodeCanvasRef = ref(null)
const isOpen = ref(false)
const isDownloadingPng = ref(false)
const isDownloadingSvg = ref(false)
const isNative = Capacitor.isNativePlatform()

const printLabelRef = ref(null)
const printVariant = ref('label')

const qrValue = computed(() => getBoxQrValue(props.box))
const shortIdentifier = computed(() => getBoxShortIdentifier(props.box))

const labelMeta = computed(() => {
  const parts = []
  if (props.box?.description) parts.push(props.box.description)
  if (shortIdentifier.value) parts.push(shortIdentifier.value)
  return parts.join(' · ')
})

defineExpose({ isOpen })

const getQRCodeDataUrl = () => qrCodeCanvasRef.value?.getQRCodeDataUrl?.() || null
const getQRCodeBlob = async () => (await qrCodeCanvasRef.value?.getQRCodeBlob?.()) || null

// <a download> does nothing inside the iOS WebView, so native hands the file
// to the share sheet (which offers Save to Files / Photos / Print).
const shareFile = async (blob, filename) => {
  const file = new File([blob], filename, { type: blob.type })
  if (!navigator.canShare?.({ files: [file] })) {
    $q.notify({ type: 'warning', message: 'Saving files is not supported on this device.' })
    return
  }
  try {
    await navigator.share({ files: [file], title: props.box.name })
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Share failed:', err)
  }
}

const downloadFile = (blob, filename) => {
  if (isNative) return shareFile(blob, filename)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const downloadQRCode = async () => {
  const blob = await getQRCodeBlob()
  if (!blob) return
  $q.notify({ message: 'Downloading QR code…', timeout: 1500 })
  await downloadFile(blob, `${props.box.name || 'box'}-qr.png`)
}

const printVariantOf = async (variant) => {
  printVariant.value = variant
  await nextTick()
  await printLabelRef.value?.whenReady()
  $q.notify({ message: 'Sending to printer…', timeout: 1500 })
  try {
    await printDocument({ jobName: `${props.box.name || 'Box'} ${variant === 'qr' ? 'QR code' : 'label'}` })
  } catch (err) {
    console.error('Print failed:', err)
    $q.notify({ type: 'negative', message: err.message || 'Printing failed.' })
  }
}

const printQRCode = () => printVariantOf('qr')

const shareQRCode = async () => {
  $q.notify({ message: 'Opening share sheet…', timeout: 1500 })
  const dataUrl = getQRCodeDataUrl()
  if (!dataUrl) return

  if (!navigator.share) {
    $q.notify({ type: 'warning', message: 'Sharing is not supported on this browser.' })
    return
  }

  const blob = await getQRCodeBlob()
  const file = blob ? new File([blob], 'qr_code.png', { type: 'image/png' }) : null
  const payload = { title: props.box.name, url: qrValue.value }
  if (file && navigator.canShare?.({ files: [file] })) payload.files = [file]

  try {
    await navigator.share(payload)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Share failed:', err)
  }
}

const createLabelCanvas = async () => {
  const width = 1200
  const height = 720
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const qrDataUrl = await QRCode.toDataURL(qrValue.value, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 420,
  })

  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = qrDataUrl
  })

  ctx.drawImage(img, 80, 150, 420, 420)
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 64px sans-serif'
  ctx.fillText(props.box.name || 'Untitled box', 550, 310, 580)

  if (shortIdentifier.value) {
    ctx.fillStyle = '#455a64'
    ctx.font = '42px sans-serif'
    ctx.fillText(shortIdentifier.value, 550, 390, 580)
  }

  return canvas
}

const downloadLabelPng = async () => {
  $q.notify({ message: 'Downloading label as PNG…', timeout: 1500 })
  isDownloadingPng.value = true
  try {
    const canvas = await createLabelCanvas()
    canvas.toBlob((blob) => {
      if (blob) downloadFile(blob, `${props.box.name || 'box'}-label.png`)
    }, 'image/png')
  } finally {
    isDownloadingPng.value = false
  }
}

const downloadLabelSvg = async () => {
  $q.notify({ message: 'Downloading label as SVG…', timeout: 1500 })
  isDownloadingSvg.value = true
  try {
    const qrSvg = await QRCode.toString(qrValue.value, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    })

    const escape = (s) =>
      s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    const safeName = escape(props.box.name || 'Untitled box')
    const safeId = escape(shortIdentifier.value)

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="63.5mm" height="38.1mm" viewBox="0 0 635 381">
  <rect x="0" y="0" width="635" height="381" fill="#ffffff" />
  <g transform="translate(24 40) scale(0.95)">
    ${qrSvg.replace('<svg', '<svg x="0" y="0"').replace('</svg>', '')}
  </g>
  <text x="320" y="170" fill="#111827" font-size="44" font-family="Arial, sans-serif" font-weight="700">${safeName}</text>
  ${safeId ? `<text x="320" y="230" fill="#455a64" font-size="34" font-family="Arial, sans-serif">${safeId}</text>` : ''}
</svg>`

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    downloadFile(blob, `${props.box.name || 'box'}-label.svg`)
  } finally {
    isDownloadingSvg.value = false
  }
}

const printLabel = () => printVariantOf('label')
</script>

<style scoped>
.qr-dialog {
  width: min(420px, 95vw);
}

.qr-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: inline-flex;
}

.label-preview {
  background: #f8f9fa;
  border: 1.5px solid #e9ecef;
  border-radius: 10px;
  padding: 12px;
}
</style>
