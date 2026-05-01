<template>
  <div class="q-pa-md">
    <!-- Summary bar -->
    <div class="row q-gutter-x-md q-mb-md">
      <div class="col text-center">
        <div class="text-h6 text-weight-bold">{{ donePhotos.length }}</div>
        <div class="text-caption text-grey-6">photo{{ donePhotos.length !== 1 ? 's' : '' }}</div>
      </div>
      <div class="col text-center">
        <div class="text-h6 text-weight-bold">{{ selectedCount }}</div>
        <div class="text-caption text-grey-6">items selected</div>
      </div>
    </div>

    <q-separator class="q-mb-md" />

    <!-- Done photo groups -->
    <div v-for="(photo, idx) in donePhotos" :key="photo.id" class="q-mb-lg">
      <div class="row items-center no-wrap q-gutter-x-sm q-mb-xs">
        <img :src="photo.dataUrl" class="result-thumb" alt="" />
        <div class="col">
          <div class="text-body2 text-weight-medium">
            Photo {{ idx + 1 }} · {{ photo.items.length }} item{{ photo.items.length !== 1 ? 's' : '' }}
          </div>
        </div>
      </div>

      <q-list dense class="q-mb-xs">
        <q-item v-for="item in photo.items" :key="item.localId" dense class="q-pa-none q-mb-xs">
          <q-item-section avatar style="min-width: 32px">
            <q-checkbox v-model="item.selected" dense />
          </q-item-section>
          <q-item-section>
            <q-input
              v-if="item.editing"
              v-model="item.name"
              dense
              outlined
              autofocus
              @keydown.enter="item.editing = false"
              @keydown.escape="cancelEdit(item)"
              @blur="item.editing = false"
            />
            <q-item-label
              v-else
              class="cursor-pointer"
              :class="{ 'text-grey-5': !item.selected }"
              @click="item.editing = true"
            >
              {{ item.name }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <q-btn
        flat
        dense
        no-caps
        size="sm"
        class="text-grey-5"
        label="Something wrong? Retry free"
        @click="$emit('retry-photo', photo.id)"
      />
    </div>

    <!-- Error photo groups -->
    <div v-for="photo in errorPhotos" :key="photo.id" class="q-mb-md">
      <div class="row items-center no-wrap q-gutter-x-sm">
        <img :src="photo.dataUrl" class="result-thumb" alt="" />
        <div class="col">
          <div class="text-caption text-negative q-mb-xs">
            {{ photo.error || 'Failed to identify' }}
          </div>
          <q-btn
            flat
            dense
            no-caps
            size="sm"
            color="negative"
            label="Retry"
            @click="$emit('retry-photo', photo.id)"
          />
        </div>
      </div>
    </div>

    <!-- Footer CTA -->
    <q-btn
      color="primary"
      class="full-width q-mt-md"
      no-caps
      size="lg"
      :disable="selectedCount === 0"
      :label="ctaLabel"
      :loading="saving"
      @click="addSelected"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  photos: { type: Array, required: true },
  boxName: { type: String, default: '' },
})

const emit = defineEmits(['add-items', 'retry-photo'])

const saving = ref(false)

const donePhotos = computed(() => props.photos.filter((p) => p.status === 'done'))
const errorPhotos = computed(() => props.photos.filter((p) => p.status === 'error'))

const selectedCount = computed(() =>
  donePhotos.value.reduce((sum, p) => sum + p.items.filter((i) => i.selected).length, 0),
)

const ctaLabel = computed(() => {
  const n = selectedCount.value
  const dest = props.boxName ? `to ${props.boxName}` : 'to box'
  return n > 0 ? `Add ${n} item${n !== 1 ? 's' : ''} ${dest}` : 'No items selected'
})

const cancelEdit = (item) => {
  item.name = item._originalName
  item.editing = false
}

const addSelected = () => {
  const items = donePhotos.value.flatMap((p) =>
    p.items.filter((i) => i.selected).map((i) => ({ name: i.name, description: '', tags: [] })),
  )
  emit('add-items', items)
}
</script>

<style scoped>
.result-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
