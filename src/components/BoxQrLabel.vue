<template>
  <article :class="['qr-label', `qr-label--${variant}`]">
    <img
      v-if="qrDataUrl"
      ref="imgRef"
      :src="qrDataUrl"
      :alt="`QR code for ${boxName}`"
      class="qr-label__image"
    />
    <div v-if="variant === 'label'" class="qr-label__meta">
      <h2 class="qr-label__title">{{ boxName }}</h2>
      <p v-if="shortIdentifier" class="qr-label__identifier">{{ shortIdentifier }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { getBoxQrValue, getBoxShortIdentifier } from 'src/utils/boxQr'

// Physically sized (mm) label used as the print surface. 'label' is a
// 63.5×38.1mm QR + name/ID label; 'qr' is the QR code alone.
const props = defineProps({
  box: {
    type: Object,
    required: true,
  },
  variant: {
    type: String,
    default: 'label',
    validator: (v) => ['label', 'qr'].includes(v),
  },
})

const qrDataUrl = ref('')
const imgRef = ref(null)
let pending = Promise.resolve()

const qrValue = computed(() => getBoxQrValue(props.box))
const shortIdentifier = computed(() => getBoxShortIdentifier(props.box))
const boxName = computed(() => props.box?.name || 'Untitled box')

watch(
  qrValue,
  (value) => {
    pending = value
      ? QRCode.toDataURL(value, { errorCorrectionLevel: 'H', margin: 1, width: 600 }).then(
          (url) => {
            qrDataUrl.value = url
          },
        )
      : Promise.resolve().then(() => {
          qrDataUrl.value = ''
        })
  },
  { immediate: true },
)

// Resolves once the QR image is generated and decoded, so printing never
// captures a blank code.
const whenReady = async () => {
  await pending
  await nextTick()
  await imgRef.value?.decode?.().catch(() => {})
}

defineExpose({ whenReady })
</script>

<style scoped>
.qr-label {
  background: #fff;
  color: #111827;
  box-sizing: border-box;
}

.qr-label--label {
  width: 63.5mm;
  height: 38.1mm;
  padding: 3.5mm;
  display: grid;
  grid-template-columns: 28mm 1fr;
  gap: 3mm;
  align-items: center;
  overflow: hidden;
}

.qr-label--qr {
  width: 40mm;
  height: 40mm;
}

.qr-label__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
}

.qr-label__title {
  margin: 0;
  font-family: Arial, sans-serif;
  font-size: 12pt;
  font-weight: 700;
  line-height: 1.2;
  word-break: break-word;
}

.qr-label__identifier {
  margin: 1.5mm 0 0;
  font-family: Arial, sans-serif;
  font-size: 8pt;
  color: #455a64;
}
</style>
