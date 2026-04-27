<template>
  <canvas ref="canvasRef"></canvas>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
})

const canvasRef = ref(null)

const renderQR = async (url) => {
  if (!canvasRef.value || !url) return
  try {
    await QRCode.toCanvas(canvasRef.value, url, {
      errorCorrectionLevel: 'H',
      width: 200,
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
  }
}

const getQRCodeDataUrl = () => {
  if (!canvasRef.value) return null
  return canvasRef.value.toDataURL('image/png')
}

const getQRCodeBlob = async () => {
  if (!canvasRef.value) return null
  return new Promise((resolve) => {
    canvasRef.value.toBlob((blob) => resolve(blob), 'image/png')
  })
}

defineExpose({ getQRCodeDataUrl, getQRCodeBlob })

onMounted(() => renderQR(props.url))
watch(() => props.url, (url) => renderQR(url))
</script>
