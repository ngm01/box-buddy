<template>
  <div class="q-pa-md">
    <div class="text-subtitle1 text-weight-bold q-mb-md">
      Processing {{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }}...
    </div>

    <div v-for="(photo, idx) in photos" :key="photo.id" class="q-mb-sm">
      <div class="row items-center no-wrap q-gutter-x-sm">
        <img :src="photo.dataUrl" class="proc-thumb" alt="" />
        <div class="col">
          <div class="text-caption text-grey-7 q-mb-xs">Photo {{ idx + 1 }}</div>

          <template v-if="photo.status === 'done'">
            <div class="text-caption text-positive">
              {{ photo.items.length }} item{{ photo.items.length !== 1 ? 's' : '' }} found
            </div>
          </template>
          <template v-else-if="photo.status === 'error'">
            <div class="text-caption text-negative">{{ photo.error || 'Failed' }}</div>
          </template>
          <template v-else>
            <div class="text-caption text-grey-5 q-mb-xs">
              {{ statusLabel(photo.status) }}
            </div>
            <q-linear-progress indeterminate size="2px" />
          </template>
        </div>
      </div>
      <q-separator v-if="idx < photos.length - 1" class="q-mt-sm" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  photos: { type: Array, required: true },
})

const statusLabel = (status) => {
  if (status === 'uploading') return 'Uploading...'
  if (status === 'identifying') return 'Analyzing...'
  return 'Waiting...'
}
</script>

<style scoped>
.proc-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}
</style>
