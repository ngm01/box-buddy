<template>
  <q-page class="q-pa-md">
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

    <!-- List of boxes -->
    <q-list v-if="boxes.length" bordered separator>
      <q-item v-for="box in boxes" :key="box.id" clickable>
        <q-item-section @click="goToBoxDetail(box.display_name, box.name)">
          <q-item-label>{{ box.name }}</q-item-label>
          <q-item-label caption>{{ box.description }}</q-item-label>
          <q-item-label caption>Tags: {{ formatTags(box.tags) }}</q-item-label>
          <q-item-label caption>
            Created: {{ formatDate(box.created_at || box.created_time) }}
          </q-item-label>
          <q-item-label caption>
            Updated: {{ formatDate(box.updated_at || box.date_updated) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon @click="confirmDelete(box.id)" clickable name="delete" color="red" />
        </q-item-section>
      </q-item>
    </q-list>

    <p v-else>
      Looks like you haven't created any boxes yet. Click the 'create' button to get started!
    </p>

    <q-banner v-if="errorMessage" color="negative" class="q-mt-md">{{ errorMessage }}</q-banner>

    <PaywallGate feature="boxes">
      <q-btn color="primary" class="q-mt-md" @click="openCreateBoxModal"> + Create New Box </q-btn>
    </PaywallGate>

    <q-dialog v-model="showCreateBoxModal">
      <q-card class="q-pa-md" style="width: 400px; max-width: 80vw">
        <q-card-section>
          <div class="text-h6">Create New Box</div>
        </q-card-section>

        <q-form @submit.prevent="handleCreateBox">
          <q-card-section>
            <q-input v-model="box.name" label="Box Name" filled />
            <q-input v-model="box.description" label="Description" filled type="textarea" />
            <q-input
              v-model="box.tags"
              label="Tags (comma-separated)"
              filled
              hint="Example: seasonal, donate, tools"
            />
            <div class="row items-center q-mt-sm">
              <q-select
                v-model="box.access_level"
                :options="['private', 'public']"
                label="Access Level"
                filled
                class="col"
                emit-value
                map-options
                :options-dense="true"
                style="margin-right: 8px"
                default-value="private"
              />
              <q-icon name="info" color="primary" size="sm">
                <q-tooltip>
                  <span v-if="box.access_level === 'private'">Only you can view and manage this box</span>
                  <span v-else> Anyone with an account can view this box </span>
                </q-tooltip>
              </q-icon>
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn type="submit" color="primary" label="Create" />
            <q-btn color="negative" label="Cancel" @click="showCreateBoxModal = false" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDeleteModal">
      <q-card class="q-pa-md" style="width: 400px; max-width: 80vw">
        <q-card-section>
          <div class="text-h6">Delete Box</div>
        </q-card-section>

        <q-card-section>
          <p>
            You are about the delete <span style="font-weight: bold">{{ selectedBox.name }}</span>
          </p>
          <p>Are you sure? This cannot be undone.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn color="negative" label="Delete" @click="deleteBox" />
          <q-btn color="primary" label="Cancel" @click="showDeleteModal = false" />
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

let searchDebounce = null

const handleBoxSearch = () => {
  if (searchDebounce) {
    clearTimeout(searchDebounce)
  }

  searchDebounce = setTimeout(async () => {
    await boxesStore.fetchBoxes(boxSearch.value)
  }, 250)
}

const formatTags = (tags) => {
  if (!Array.isArray(tags) || tags.length === 0) return 'None'
  return tags.join(', ')
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
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
  }
}

const goToBoxDetail = (display_name, name) => {
  router.push('/boxes/' + display_name + '/' + name)
}

const confirmDelete = (id) => {
  selectedBox.value = boxes.value.find((nextBox) => nextBox.id === id)
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
  }
}

onMounted(async () => {
  await boxesStore.fetchBoxes(boxSearch.value)
})
</script>
