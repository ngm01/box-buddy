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
