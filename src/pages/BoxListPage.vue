<template>
  <q-page class="q-pa-md">
    <!-- Heading row -->
    <div class="row items-center q-mb-md">
      <span class="text-h5 text-weight-bold col">Your boxes</span>
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
      :loading="isSearching"
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
        <q-card-section class="row items-start no-wrap q-py-md q-pl-md q-pr-xs">
          <!-- Box icon -->
          <q-icon name="archive" size="36px" color="grey-5" class="q-mr-md flex-shrink-0 q-mt-xs" />

          <!-- Content -->
          <div class="col overflow-hidden">
            <div class="row items-baseline q-mb-xs">
              <span class="text-subtitle1 text-weight-bold">{{ box.name }}</span>
              <span class="text-body2 text-grey-6 q-ml-xs">&middot; {{ itemCounts[box.id] ?? 0 }} items</span>
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

          <!-- Delete (whole card opens the box) -->
          <q-btn
            flat
            round
            icon="delete_outline"
            color="grey-6"
            class="q-ml-xs flex-shrink-0 box-card__delete"
            aria-label="Delete box"
            @click.stop="confirmDelete(box.id)"
          >
            <q-tooltip>Delete</q-tooltip>
          </q-btn>
        </q-card-section>
      </q-card>
    </div>

    <div v-else class="text-center q-pa-xl text-grey-6">
      No boxes yet — create one to get started!
    </div>

    <q-banner v-if="loadError" rounded class="bg-red-1 text-red-10 q-mt-md">{{ loadError }}</q-banner>

    <!-- Create new box -->
    <q-btn
      color="primary"
      class="q-mt-lg"
      icon="add"
      label="Create new box"
      unelevated
      @click="openCreateBoxModal"
    />

    <!-- Create box dialog -->
    <q-dialog v-model="showCreateBoxModal" :persistent="isCreating">
      <q-card style="width: 440px; max-width: 95vw">
        <q-card-section class="row items-start no-wrap q-pb-sm">
          <div class="row items-center col">
            <q-icon name="archive" size="28px" color="primary" class="q-mr-sm" />
            <div>
              <div class="text-h6">Create new box</div>
              <div class="text-caption text-grey-6">Add a container to your inventory</div>
            </div>
          </div>
          <q-btn flat round dense icon="close" :disable="isCreating" @click="showCreateBoxModal = false" />
        </q-card-section>

        <q-separator />

        <q-form @submit.prevent="handleCreateBox">
          <q-card-section class="q-gutter-y-md">
            <q-input v-model="box.name" label="Box name" filled :rules="[(val) => !!val?.trim() || 'Box name is required']" />
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
            <q-btn flat label="Cancel" :disable="isCreating" @click="showCreateBoxModal = false" />
            <q-btn
              type="submit"
              color="primary"
              icon="add"
              label="Create box"
              unelevated
              :loading="isCreating"
              :disable="isCreating"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Delete confirmation dialog -->
    <q-dialog v-model="showDeleteModal" :persistent="isDeleting">
      <q-card class="q-pa-md" style="width: 400px; max-width: 80vw">
        <q-card-section>
          <div class="text-h6">Delete box</div>
        </q-card-section>
        <q-card-section>
          <p>You are about to delete <strong>{{ selectedBox?.name }}</strong>.</p>
          <p>Are you sure? This cannot be undone.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" :disable="isDeleting" @click="showDeleteModal = false" />
          <q-btn
            color="negative"
            label="Delete"
            unelevated
            :loading="isDeleting"
            :disable="isDeleting"
            @click="deleteBox"
          />
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
import { useQuasar } from 'quasar'
import { supabase } from 'src/utils/supabase'
import { getBoxPath } from 'src/utils/boxQr'

const $q = useQuasar()
const router = useRouter()
const boxesStore = useBoxesStore()
const { boxes } = storeToRefs(boxesStore)
const box = ref({ name: '', description: '', access_level: 'private', tags: '' })
const selectedBox = ref(null)
const boxSearch = ref('')
const showCreateBoxModal = ref(false)
const showDeleteModal = ref(false)
const isCreating = ref(false)
const isDeleting = ref(false)
const isSearching = ref(false)
const loadError = ref('')
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

// Fetches the list and its item counts. Failures become a banner instead of
// an unhandled rejection that leaves the page looking empty.
const refreshBoxes = async () => {
  try {
    await boxesStore.fetchBoxes(boxSearch.value)
    loadError.value = ''
    await fetchItemCounts()
  } catch {
    loadError.value = 'We could not load your boxes right now. Please try again.'
  }
}

const openCreateBoxModal = () => {
  showCreateBoxModal.value = true
}

const handleBoxSearch = () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(async () => {
    isSearching.value = true
    try {
      await refreshBoxes()
    } finally {
      isSearching.value = false
    }
  }, 250)
}

const errorText = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.'

// On failure the dialog stays open with the form intact so nothing is lost.
const handleCreateBox = async () => {
  if (isCreating.value) return
  isCreating.value = true
  try {
    const name = box.value.name.trim()
    await boxesStore.createBox({ ...box.value, name })
    showCreateBoxModal.value = false
    box.value = { name: '', description: '', access_level: 'private', tags: '' }
    $q.notify({ type: 'positive', message: `Box "${name}" created` })
    await refreshBoxes()
  } catch (error) {
    $q.notify({ type: 'negative', message: `Could not create box: ${errorText(error)}` })
  } finally {
    isCreating.value = false
  }
}

const goToBoxDetail = (display_name, name) => {
  router.push(getBoxPath(display_name, name))
}

const confirmDelete = (id) => {
  selectedBox.value = boxes.value.find((b) => b.id === id)
  showDeleteModal.value = true
}

const deleteBox = async () => {
  if (isDeleting.value) return
  isDeleting.value = true
  const name = selectedBox.value?.name
  try {
    await boxesStore.deleteBox(selectedBox.value.id)
    showDeleteModal.value = false
    selectedBox.value = null
    $q.notify({ type: 'positive', message: `Box "${name}" deleted` })
    await refreshBoxes()
  } catch (error) {
    $q.notify({ type: 'negative', message: `Could not delete box: ${errorText(error)}` })
  } finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  try {
    await refreshBoxes()
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
.box-card__delete {
  margin-top: -6px;
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
