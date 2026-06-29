<template>
  <q-page class="q-pa-md">
    <!-- Heading row -->
    <div class="row items-center q-mb-md">
      <span class="text-h5 text-weight-medium col">Your boxes</span>
      <q-badge v-if="!isLoading" color="grey-3" text-color="grey-7" class="q-ml-sm">
        {{ boxes.length }} boxes
      </q-badge>
    </div>

    <!-- Search -->
    <q-input
      v-model="boxSearch"
      filled
      clearable
      label="Search boxes"
      class="q-mb-md"
      @update:model-value="handleBoxSearch"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <!-- Skeleton while loading -->
    <div v-if="isLoading" class="q-gutter-y-sm">
      <q-card v-for="i in 4" :key="i" flat bordered>
        <q-card-section class="row items-start no-wrap q-pa-md">
          <q-skeleton type="circle" size="40px" class="q-mr-md flex-shrink-0" />
          <div class="col">
            <q-skeleton type="text" width="45%" height="18px" />
            <q-skeleton type="text" width="70%" class="q-mt-xs" />
            <q-skeleton type="text" width="35%" class="q-mt-xs" />
            <q-skeleton type="text" width="50%" class="q-mt-xs" />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Box cards -->
    <div v-else-if="boxes.length" class="q-gutter-y-sm">
      <q-card
        v-for="box in boxes"
        :key="box.id"
        flat
        bordered
        class="box-card cursor-pointer"
        @click="goToBoxDetail(box.display_name, box.name)"
      >
        <q-card-section class="row items-start no-wrap q-pa-md">
          <!-- Box icon -->
          <q-icon name="archive" size="36px" color="grey-5" class="q-mr-md flex-shrink-0 q-mt-xs" />

          <!-- Content -->
          <div class="col overflow-hidden">
            <div class="row items-baseline q-mb-xs">
              <span class="text-subtitle1 text-weight-medium">{{ box.name }}</span>
              <span class="text-caption text-grey-6 q-ml-xs">&middot; {{ itemCounts[box.id] ?? 0 }} items</span>
            </div>
            <div v-if="box.description" class="text-body2 text-grey-8 bb-clamp2 q-mb-xs">
              {{ box.description }}
            </div>
            <div class="row items-center q-gutter-x-xs q-mb-xs">
              <template v-if="normalizeTags(box.tags).length">
                <q-chip
                  v-for="tag in normalizeTags(box.tags)"
                  :key="tag"
                  dense
                  size="sm"
                  color="grey-2"
                  text-color="grey-8"
                  icon="label"
                  class="q-ma-none"
                >{{ tag }}</q-chip>
              </template>
              <span v-else class="text-caption text-grey-5">Untagged</span>
            </div>
            <div class="row items-center text-caption text-grey-6">
              <q-icon name="event" size="12px" class="q-mr-xs" />
              <span v-if="box.updated_at || box.date_updated">
                Updated {{ formatDate(box.updated_at || box.date_updated) }}
              </span>
              <span v-else>
                Created {{ formatDate(box.created_at || box.created_time) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="column items-center q-gutter-y-xs q-ml-sm flex-shrink-0" @click.stop>
            <q-btn flat round dense icon="delete" color="grey-5" @click="confirmDelete(box.id)">
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="chevron_right" color="grey-5" @click="goToBoxDetail(box.display_name, box.name)" />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div v-else class="text-center q-pa-xl text-grey-6">
      No boxes yet — create one to get started!
    </div>

    <q-banner v-if="errorMessage" color="negative" class="q-mt-md">{{ errorMessage }}</q-banner>

    <!-- Create new box -->
    <PaywallGate feature="boxes">
      <q-btn
        color="primary"
        class="q-mt-lg"
        icon="add"
        label="Create new box"
        unelevated
        @click="openCreateBoxModal"
      />
    </PaywallGate>

    <!-- Create box dialog -->
    <q-dialog v-model="showCreateBoxModal">
      <q-card style="width: 440px; max-width: 95vw">
        <q-card-section class="row items-start no-wrap q-pb-sm">
          <div class="row items-center col">
            <q-icon name="archive" size="28px" color="primary" class="q-mr-sm" />
            <div>
              <div class="text-h6">Create new box</div>
              <div class="text-caption text-grey-6">Add a container to your inventory</div>
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="showCreateBoxModal = false" />
        </q-card-section>

        <q-separator />

        <q-form @submit.prevent="handleCreateBox">
          <q-card-section class="q-gutter-y-md">
            <q-input v-model="box.name" label="Box name" filled />
            <q-input v-model="box.description" label="Description" filled type="textarea" autogrow />
            <q-input
              v-model="box.tags"
              label="Tags"
              filled
              hint="Separate with commas · e.g. seasonal, donate, tools"
            />

            <!-- Access level -->
            <div>
              <div class="text-caption text-grey-7 q-mb-sm">Access level</div>
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div
                    class="access-option cursor-pointer rounded-borders q-pa-md"
                    :class="box.access_level === 'private' ? 'access-option--active' : 'access-option--inactive'"
                    @click="box.access_level = 'private'"
                  >
                    <q-icon name="lock" size="20px" class="q-mb-xs" />
                    <div class="text-subtitle2">Private</div>
                    <div class="text-caption text-grey-6">Only you</div>
                  </div>
                </div>
                <div class="col-6">
                  <div
                    class="access-option cursor-pointer rounded-borders q-pa-md"
                    :class="box.access_level === 'public' ? 'access-option--active' : 'access-option--inactive'"
                    @click="box.access_level = 'public'"
                  >
                    <q-icon name="language" size="20px" class="q-mb-xs" />
                    <div class="text-subtitle2">Public</div>
                    <div class="text-caption text-grey-6">Anyone with an account</div>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancel" @click="showCreateBoxModal = false" />
            <q-btn type="submit" color="primary" icon="add" label="Create box" unelevated />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Delete confirmation dialog -->
    <q-dialog v-model="showDeleteModal">
      <q-card class="q-pa-md" style="width: 400px; max-width: 80vw">
        <q-card-section>
          <div class="text-h6">Delete box</div>
        </q-card-section>
        <q-card-section>
          <p>You are about to delete <strong>{{ selectedBox?.name }}</strong>.</p>
          <p>Are you sure? This cannot be undone.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showDeleteModal = false" />
          <q-btn color="negative" label="Delete" unelevated @click="deleteBox" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { useBoxesStore } from 'src/stores/boxes.store'
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSubscription } from 'src/composables/useSubscription'
import { normalizeApiError } from 'src/utils/apiErrors'
import { supabase } from 'src/utils/supabase'
import PaywallGate from 'src/components/paywall/PaywallGate.vue'

const { requireEntitlement, openPaywallModal } = useSubscription()
const router = useRouter()
const boxesStore = useBoxesStore()
const { boxes } = storeToRefs(boxesStore)
const box = ref({ name: '', description: '', access_level: 'private', tags: '' })
const selectedBox = ref(null)
const boxSearch = ref('')
const showCreateBoxModal = ref(false)
const showDeleteModal = ref(false)
const errorMessage = ref('')
const isLoading = ref(true)
const itemCounts = ref({})

let searchDebounce = null

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) return tags.filter(Boolean)
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean)
  return []
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fetchItemCounts = async () => {
  const boxIds = boxes.value.map((b) => b.id)
  if (!boxIds.length) {
    itemCounts.value = {}
    return
  }
  const { data } = await supabase.from('items').select('box_id').in('box_id', boxIds)
  if (!data) return
  itemCounts.value = data.reduce((acc, row) => {
    acc[row.box_id] = (acc[row.box_id] || 0) + 1
    return acc
  }, {})
}

const openCreateBoxModal = () => {
  showCreateBoxModal.value = true
}

const handleBoxSearch = () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(async () => {
    await boxesStore.fetchBoxes(boxSearch.value)
    await fetchItemCounts()
  }, 250)
}

const handleCreateBox = async () => {
  if (!requireEntitlement({ feature: 'boxes', reason: 'You reached the box limit for your plan.' })) {
    showCreateBoxModal.value = false
    return
  }

  try {
    await boxesStore.createBox(box.value)
  } catch (error) {
    const normalized = normalizeApiError(error)
    errorMessage.value = normalized.message
    if (normalized.action === 'open_paywall') {
      openPaywallModal(normalized.feature || 'boxes', {
        reason: normalized.message,
        details: normalized.details,
      })
    }
  } finally {
    showCreateBoxModal.value = false
    box.value = { name: '', description: '', access_level: 'private', tags: '' }
    await boxesStore.fetchBoxes(boxSearch.value)
    await fetchItemCounts()
  }
}

const goToBoxDetail = (display_name, name) => {
  router.push('/boxes/' + display_name + '/' + name)
}

const confirmDelete = (id) => {
  selectedBox.value = boxes.value.find((b) => b.id === id)
  showDeleteModal.value = true
}

const deleteBox = async () => {
  try {
    await boxesStore.deleteBox(selectedBox.value.id)
    showDeleteModal.value = false
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    selectedBox.value = null
    await boxesStore.fetchBoxes(boxSearch.value)
    await fetchItemCounts()
  }
}

onMounted(async () => {
  try {
    await boxesStore.fetchBoxes(boxSearch.value)
    await fetchItemCounts()
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.box-card {
  transition: box-shadow 0.15s ease;
}
.box-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.access-option {
  border: 2px solid transparent;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.access-option--active {
  border-color: var(--q-primary);
  background-color: rgba(var(--q-primary-rgb, 25, 118, 210), 0.06);
}
.access-option--inactive {
  border-color: #e0e0e0;
  background-color: #fafafa;
}
.access-option--inactive:hover {
  border-color: #bdbdbd;
}
</style>
