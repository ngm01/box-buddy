<template>
  <canvas ref="canvasRef"></canvas>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
})

const canvasRef = ref(null)

const getQRCodeDataUrl = () => {
  if (!canvasRef.value) {
    return null
  }

  return canvasRef.value.toDataURL('image/png')
}

const getQRCodeBlob = async () => {
  if (!canvasRef.value) {
    return null
  }

  return await new Promise((resolve) => {
    canvasRef.value.toBlob((blob) => {
      resolve(blob)
    }, 'image/png')
  })
}

defineExpose({
  getQRCodeDataUrl,
  getQRCodeBlob,
})

onMounted(async () => {
  if (canvasRef.value) {
    try {
      await QRCode.toCanvas(canvasRef.value, props.url, {
        errorCorrectionLevel: 'H',
        width: 200,
      })
      console.log('QR code generated successfully')
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }
})
</script>
