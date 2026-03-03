<template>
  <div class="label-sheet">
    <article class="qr-label" ref="labelRef">
      <img :src="qrDataUrl" :alt="`QR code for ${boxName}`" class="qr-label__image" />
      <div class="qr-label__meta">
        <h2 class="qr-label__title">{{ boxName }}</h2>
        <p v-if="shortIdentifier" class="qr-label__identifier">{{ shortIdentifier }}</p>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  qrValue: {
    type: String,
    required: true,
  },
  boxName: {
    type: String,
    required: true,
  },
  shortIdentifier: {
    type: String,
    default: '',
  },
  qrSize: {
    type: Number,
    default: 360,
  },
})

const qrDataUrl = ref('')
const labelRef = ref(null)

const qrOptions = computed(() => ({
  errorCorrectionLevel: 'H',
  margin: 1,
  width: props.qrSize,
}))

watchEffect(async () => {
  if (!props.qrValue) {
    qrDataUrl.value = ''
    return
  }

  qrDataUrl.value = await QRCode.toDataURL(props.qrValue, qrOptions.value)
})

defineExpose({
  labelRef,
  qrDataUrl,
})
</script>

<style scoped>
.label-sheet {
  display: flex;
  justify-content: center;
  width: 100%;
}

.qr-label {
  width: 63.5mm;
  min-height: 38.1mm;
  padding: 3.5mm;
  border: 1px dashed #b0bec5;
  border-radius: 2mm;
  background: #fff;
  display: grid;
  grid-template-columns: 24mm 1fr;
  gap: 3mm;
  align-items: center;
  box-sizing: border-box;
}

.qr-label__image {
  width: 24mm;
  height: 24mm;
  object-fit: contain;
}

.qr-label__title {
  margin: 0;
  font-size: 13px;
  line-height: 1.2;
  word-break: break-word;
}

.qr-label__identifier {
  margin: 4px 0 0;
  font-size: 11px;
  color: #455a64;
}

@media print {
  .label-sheet {
    margin: 0;
    padding: 0;
    justify-content: flex-start;
  }

  .qr-label {
    border: none;
    border-radius: 0;
  }
}
</style>
