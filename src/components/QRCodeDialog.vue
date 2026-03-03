<!-- eslint-disable -->
<template>
  <q-dialog v-model="isOpen">
    <q-card class="q-pa-md">
      <q-card-section class="row items-space-between">
        <q-btn flat label="Close" v-close-popup class="q-ml-auto" />
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
    </q-card>
  </q-dialog>
</template>

<script setup>
import QRCodeCanvas from './QRCodeCanvas.vue'

const props = defineProps({
  box: {
    type: Object,
    required: true,
  },
})
import { ref, onMounted } from 'vue'
onMounted(() => {
  console.log('Box:', props.box)
})
const box = ref(props.box)
const qrCodeCanvasRef = ref(null)
const isOpen = ref(false)
// Expose `isOpen` to be controlled from the parent component
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
  printWindow.print()
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

<style lang="scss" scoped></style>
