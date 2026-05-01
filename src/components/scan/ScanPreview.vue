<template>
  <div class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <q-btn flat dense no-caps icon="arrow_back" label="Add more" @click="$emit('back')" />
      <div class="text-caption text-grey-6">
        {{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Photo grid -->
    <div class="photo-grid q-mb-xl">
      <div v-for="photo in photos" :key="photo.id" class="grid-item">
        <img :src="photo.dataUrl" class="grid-img" alt="" />
        <q-btn
          round
          dense
          flat
          icon="close"
          size="xs"
          class="grid-remove"
          @click="$emit('photo-removed', photo.id)"
        />
      </div>
    </div>

    <!-- Confirm bar -->
    <div class="confirm-bar">
      <div class="row items-center q-mb-xs">
        <q-icon name="bolt" size="14px" color="amber-8" class="q-mr-xs" />
        <span class="text-caption text-grey-7">~{{ creditsToSpend }} credits</span>
      </div>
      <q-btn color="primary" class="full-width" no-caps size="md" label="Identify" @click="$emit('confirm')" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  photos: { type: Array, required: true },
  creditsToSpend: { type: Number, required: true },
})

defineEmits(['confirm', 'back', 'photo-removed'])
</script>

<style scoped>
.photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.grid-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
}

.grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.grid-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}

.confirm-bar {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding-top: 8px;
}
</style>
