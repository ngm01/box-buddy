<template>
  <q-dialog v-model="isOpen">
    <q-card class="q-pa-md qr-dialog">
      <q-card-section class="row items-center">
        <div class="text-h6">QR Label Preview</div>
        <q-space />
        <q-btn flat label="Close" v-close-popup />
      </q-card-section>

      <q-card-section>
        <p>Box Name: {{ box.name }}</p>
        <QRCodeCanvas ref="qrCodeCanvasRef" :url="box.qr_code_url" />
      </q-card-section>
      <q-card-section>
        <q-card-actions>
          <q-btn color="primary" label="Download QR Code" @click="downloadQRCode" class="q-mb-sm" />
          <q-btn color="primary" label="Print QR Code" @click="printQRCode" class="q-mb-sm" />
          <q-btn color="primary" label="Share QR Code" @click="shareQRCode" class="q-mb-sm" />
        </q-card-actions>
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
import { computed, ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import QRCodeCanvas from './QRCodeCanvas.vue'

const props = defineProps({
  box: {
    type: Object,
    required: true,
  },
})
onMounted(() => {
  console.log('Box:', props.box)
})
const box = ref(props.box)
const qrCodeCanvasRef = ref(null)
const isOpen = ref(false)

const qrValue = computed(() => props.box?.qr_code_url || '')
const shortIdentifier = computed(() => {
  const id = props.box?.id
  if (!id) return ''
  return `ID: ${String(id).slice(-8)}`
})

defineExpose({ isOpen })
const getQRCodeDataUrl = () => {
  return qrCodeCanvasRef.value?.getQRCodeDataUrl?.() || null
}

const getQRCodeBlob = async () => {
  return (await qrCodeCanvasRef.value?.getQRCodeBlob?.()) || null
}

// eslint-disable-next-line no-unused-vars
const copyToClipboard = () => {
  const qrCodeDataUrl = getQRCodeDataUrl()
  if (!qrCodeDataUrl) {
    console.error('QR code is not ready yet')
    return
  }

  navigator.clipboard
    .writeText(qrCodeDataUrl)
    .then(() => {
      console.log('QR code URL copied to clipboard')
    })
    .catch((err) => {
      console.error('Error copying QR code URL:', err)
    })
}
const downloadQRCode = () => {
  const qrCodeDataUrl = getQRCodeDataUrl()
  if (!qrCodeDataUrl) {
    console.error('QR code is not ready yet')
    return
  }

  const link = document.createElement('a')
  link.href = qrCodeDataUrl
  link.download = 'qr_code.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
const printLabel = async () => {
  const canvas = await createLabelCanvas()
  const dataUrl = canvas.toDataURL('image/png')

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    console.error('Unable to open print window')
    return
  }

  printWindow.document.write('<html><head><title>Print Label</title></head><body style="margin:0">')
  printWindow.document.write('<img src="' + dataUrl + '" style="width:100%" />')
  printWindow.document.write('</body></html>')
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
    printWindow.close()
  }
}

const printQRCode = () => {
  const qrCodeDataUrl = getQRCodeDataUrl()
  if (!qrCodeDataUrl) {
    console.error('QR code is not ready yet')
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    console.error('Unable to open print window')
    return
  }

  printWindow.document.write('<html><head><title>Print QR Code</title></head><body>')
  printWindow.document.write('<img src="' + qrCodeDataUrl + '" />')
  printWindow.document.write('</body></html>')
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
    printWindow.close()
  }
}
const shareQRCode = async () => {
  const qrCodeDataUrl = getQRCodeDataUrl()
  if (!qrCodeDataUrl) {
    console.error('QR code is not ready yet')
    return
  }

  if (navigator.share) {
    const qrCodeBlob = await getQRCodeBlob()
    const qrCodeFile = qrCodeBlob ? new File([qrCodeBlob], 'qr_code.png', { type: 'image/png' }) : null
    const sharePayload = {
      title: 'Share QR Code',
      text: 'Here is the QR code for the box.',
      url: qrCodeDataUrl,
    }

    if (qrCodeFile && navigator.canShare && navigator.canShare({ files: [qrCodeFile] })) {
      sharePayload.files = [qrCodeFile]
    }

    navigator
      .share(sharePayload)
      .then(() => {
        console.log('QR code shared successfully')
      })
      .catch((err) => {
        console.error('Error sharing QR code:', err)
      })
  } else {
    alert('Sharing not supported on this browser.')
  }
}
</script>

<style scoped>
.qr-dialog {
  width: min(720px, 95vw);
}
</style>
