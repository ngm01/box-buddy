<template>
  <div class="q-pa-md">
    <!-- Credit hint -->
    <div class="row items-center q-mb-md">
      <q-icon name="bolt" size="14px" color="amber-8" class="q-mr-xs" />
      <span class="text-caption text-grey-6">
        {{ creditBalance ?? '–' }} credits · ~{{ creditsPerPhoto }} per photo
      </span>
    </div>

    <!-- Capture buttons -->
    <q-btn
      outline
      class="full-width q-mb-sm"
      icon="photo_camera"
      label="Take a photo"
      no-caps
      @click="triggerCamera"
    />
    <q-btn
      outline
      class="full-width q-mb-md"
      icon="image"
      label="Choose from library"
      no-caps
      @click="triggerFilePicker"
    />

    <!-- Thumbnail strip -->
    <template v-if="photos.length > 0">
      <div class="row wrap q-gutter-xs q-mb-md">
        <div v-for="photo in photos" :key="photo.id" class="thumb-wrap">
          <img :src="photo.dataUrl" class="thumb-img" alt="" />
          <q-btn
            round
            dense
            flat
            icon="close"
            size="xs"
            class="thumb-remove"
            @click="$emit('photo-removed', photo.id)"
          />
        </div>
      </div>
      <q-btn
        color="primary"
        class="full-width"
        no-caps
        :label="`Review ${photos.length} photo${photos.length !== 1 ? 's' : ''}`"
        @click="$emit('done')"
      />
    </template>

    <div v-else class="text-caption text-grey-5 text-center q-py-md">
      AI will identify items in the photo and add them to your list for review
    </div>

    <!-- Hidden file inputs -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onFileSelected"
    />
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

defineProps({
  photos: { type: Array, required: true },
  creditBalance: { type: Number, default: null },
  creditsPerPhoto: { type: Number, required: true },
})

const emit = defineEmits(['photo-added', 'photo-removed', 'done'])

const fileInput = ref(null)
const cameraInput = ref(null)

const triggerFilePicker = () => {
  if (Capacitor.isNativePlatform()) {
    captureWithCapacitor(CameraSource.Photos)
  } else {
    fileInput.value?.click()
  }
}

const triggerCamera = () => {
  if (Capacitor.isNativePlatform()) {
    captureWithCapacitor(CameraSource.Camera)
  } else {
    cameraInput.value?.click()
  }
}

const onFileSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const dataUrl = await fileToDataUrl(file)
  emit('photo-added', dataUrl)
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const captureWithCapacitor = async (source) => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source,
    })
    emit('photo-added', `data:image/jpeg;base64,${image.base64String}`)
  } catch (error) {
    console.error('Camera capture error:', error)
  }
}
</script>

<style scoped>
.thumb-wrap {
  position: relative;
  width: 72px;
  height: 72px;
}

.thumb-img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.thumb-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}
</style>
