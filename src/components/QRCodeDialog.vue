<template>
  <q-dialog v-model="isOpen">
    <q-card class="q-pa-md qr-dialog">
      <q-card-section class="row items-center">
        <div class="text-h6">QR Label Preview</div>
        <q-space />
        <q-btn flat label="Close" v-close-popup />
      </q-card-section>

      <q-card-section>
        <BoxQrLabel
          ref="labelComponent"
          :qr-value="qrValue"
          :box-name="box.name"
          :short-identifier="shortIdentifier"
        />
      </q-card-section>

      <q-card-actions align="between" class="q-gutter-sm">
        <q-btn color="primary" label="Download Label PNG" @click="downloadLabelPng" />
        <q-btn color="primary" outline label="Download Label SVG" @click="downloadLabelSvg" />
        <q-btn color="primary" label="Print Label" @click="printLabel" />
        <q-btn color="primary" outline label="Share QR Link" @click="shareQRCode" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import QRCode from 'qrcode'
import BoxQrLabel from './BoxQrLabel.vue'

const props = defineProps({
  box: {
    type: Object,
    required: true,
  },
})

const isOpen = ref(false)
const labelComponent = ref(null)

const qrValue = computed(() => props.box?.qr_code_url || '')
const shortIdentifier = computed(() => {
  const id = props.box?.id
  if (!id) return ''
  return `ID: ${String(id).slice(-8)}`
})

defineExpose({ isOpen })

const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
  const canvas = await createLabelCanvas()
  canvas.toBlob((blob) => {
    if (blob) {
      downloadFile(blob, `${props.box.name || 'box'}-label.png`)
    }
  }, 'image/png')
}

const downloadLabelSvg = async () => {
  const qrSvg = await QRCode.toString(qrValue.value, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 300,
  })

  const safeBoxName = (props.box.name || 'Untitled box')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

  const safeIdentifier = shortIdentifier.value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="63.5mm" height="38.1mm" viewBox="0 0 635 381">
  <rect x="0" y="0" width="635" height="381" fill="#ffffff" />
  <g transform="translate(24 40) scale(0.95)">
    ${qrSvg.replace('<svg', '<svg x="0" y="0"').replace('</svg>', '')}
  </g>
  <text x="320" y="170" fill="#111827" font-size="44" font-family="Arial, sans-serif" font-weight="700">${safeBoxName}</text>
  ${safeIdentifier ? `<text x="320" y="230" fill="#455a64" font-size="34" font-family="Arial, sans-serif">${safeIdentifier}</text>` : ''}
</svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  downloadFile(blob, `${props.box.name || 'box'}-label.svg`)
}

const printLabel = () => {
  const qrImage = labelComponent.value?.qrDataUrl || ''
  const boxName = props.box.name || 'Untitled box'
  const identifier = shortIdentifier.value

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>Print Box Label</title>
        <style>
          @page { size: 63.5mm 38.1mm; margin: 0; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .label {
            width: 63.5mm;
            height: 38.1mm;
            box-sizing: border-box;
            padding: 3.5mm;
            display: grid;
            grid-template-columns: 24mm 1fr;
            gap: 3mm;
            align-items: center;
          }
          .label img { width: 24mm; height: 24mm; object-fit: contain; }
          h1 { font-size: 13px; margin: 0; line-height: 1.2; }
          p { font-size: 11px; margin: 4px 0 0; color: #455a64; }
        </style>
      </head>
      <body>
        <article class="label">
          <img src="${qrImage}" alt="QR code" />
          <div>
            <h1>${boxName}</h1>
            ${identifier ? `<p>${identifier}</p>` : ''}
          </div>
        </article>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
    printWindow.close()
  }
}

const shareQRCode = async () => {
  if (!navigator.share || !qrValue.value) {
    return
  }

  try {
    await navigator.share({
      title: `QR for ${props.box.name}`,
      text: `Scan this code to open ${props.box.name}`,
      url: qrValue.value,
    })
  } catch (error) {
    console.error('Error sharing QR code:', error)
  }
}
</script>

<style scoped>
.qr-dialog {
  width: min(720px, 95vw);
}
</style>
