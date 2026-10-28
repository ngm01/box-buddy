<template>
  <q-page class="q-pa-md">
    <!-- Loading skeleton -->
    <div v-if="isLoading">
      <!-- Breadcrumb skeleton -->
      <q-skeleton type="text" width="120px" height="14px" class="q-mb-md" />
      <!-- Box header card skeleton -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row items-start no-wrap q-pa-md">
          <q-skeleton type="circle" size="48px" class="q-mr-md flex-shrink-0" />
          <div class="col">
            <q-skeleton type="text" width="42%" height="26px" class="q-mb-sm" />
            <q-skeleton type="text" width="75%" />
            <q-skeleton type="text" width="60%" class="q-mt-xs" />
            <q-skeleton type="text" width="45%" class="q-mt-xs" />
          </div>
        </q-card-section>
        <div class="row q-col-gutter-sm q-pa-md q-pt-none">
          <div v-for="i in 3" :key="i" class="col-4">
            <q-skeleton height="68px" />
          </div>
        </div>
      </q-card>
      <!-- Items skeleton -->
      <q-skeleton type="text" width="12%" height="22px" class="q-mb-sm" />
      <q-skeleton type="QInput" class="q-mb-md" />
      <div class="q-gutter-y-sm">
        <q-card v-for="i in 3" :key="i" flat bordered>
          <q-card-section class="row items-start no-wrap q-pa-md">
            <div class="col">
              <q-skeleton type="text" width="38%" height="16px" />
              <q-skeleton type="text" width="62%" class="q-mt-xs" />
              <q-skeleton type="text" width="30%" class="q-mt-xs" />
            </div>
            <div class="row q-gutter-x-sm q-ml-sm">
              <q-skeleton type="circle" size="32px" />
              <q-skeleton type="circle" size="32px" />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Access denied -->
    <div v-else-if="pageState === 'forbidden'" class="q-pa-md">
      <q-banner rounded class="bg-orange-1 text-orange-10">
        <template #avatar>
          <q-icon name="lock" />
        </template>
        You scanned a valid QR code, but you do not have access to this box. Ask the owner to grant
        you access or make the box public.
      </q-banner>
    </div>

    <!-- Not found -->
    <div v-else-if="pageState === 'not_found'" class="q-pa-md">
      <q-banner rounded class="bg-grey-2 text-grey-9">
        <template #avatar>
          <q-icon name="search_off" />
        </template>
        This box could not be found. The link may be incorrect or the box was removed.
      </q-banner>
    </div>

    <!-- Load error -->
    <div v-else-if="!box" class="q-pa-md">
      <q-banner rounded class="bg-red-1 text-red-10">
        <template #avatar>
          <q-icon name="error" />
        </template>
        We could not load this box right now. Please try again.
      </q-banner>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Breadcrumb -->
      <div class="row items-center text-caption text-grey-6 q-mb-md">
        <router-link to="/boxes" class="text-grey-6 no-underline-link">Boxes</router-link>
        <q-icon name="chevron_right" size="14px" class="q-mx-xs" />
        <span>{{ box.name }}</span>
      </div>

      <!-- Box header card (view mode) -->
      <q-card v-if="!isEditing" flat bordered class="q-mb-md">
        <q-card-section class="row items-start no-wrap q-pa-md">
          <q-icon name="archive" size="44px" color="grey-5" class="q-mr-md flex-shrink-0 q-mt-xs" />
          <div class="col overflow-hidden">
            <div class="row items-center q-mb-xs">
              <h1 class="text-h5 text-weight-bold q-ma-none q-mr-sm">{{ box.name }}</h1>
              <q-chip dense size="sm" :icon="box.access_level === 'private' ? 'lock' : 'language'" color="grey-2" text-color="grey-7">
                {{ box.access_level === 'private' ? 'Private' : 'Public' }}
              </q-chip>
            </div>
            <p v-if="box.description" class="text-body2 text-grey-8 q-mb-sm q-mt-none">
              {{ box.description }}
            </p>
            <div class="row items-center q-gutter-x-xs q-mb-sm">
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
            <div class="row items-center q-gutter-x-md text-caption text-grey-6">
              <div class="row items-center">
                <q-icon name="event" size="12px" class="q-mr-xs" />
                Created {{ formatDate(box.created_at || box.created_time) }}
              </div>
              <div v-if="box.updated_at || box.date_updated" class="row items-center">
                <q-icon name="event" size="12px" class="q-mr-xs" />
                Updated {{ formatDate(box.updated_at || box.date_updated) }}
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <div class="row q-col-gutter-sm q-pa-md">
          <div v-if="isOwner" class="col">
            <q-btn
              color="primary"
              icon="add"
              label="Add item"
              stack
              no-caps
              unelevated
              class="full-width action-tile"
              @click="showAddItemDialog"
            />
          </div>
          <div v-if="isOwner" class="col">
            <q-btn
              text-color="primary"
              icon="edit"
              label="Edit"
              stack
              no-caps
              unelevated
              class="full-width action-tile action-tile--tinted"
              @click="startEditingBox"
            />
          </div>
          <div class="col">
            <q-btn
              text-color="primary"
              icon="qr_code_2"
              label="QR code"
              stack
              no-caps
              unelevated
              class="full-width action-tile action-tile--tinted"
              @click="showQRCodeDialog"
            />
          </div>
        </div>
      </q-card>

      <!-- Edit box form -->
      <q-card v-else flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium q-mb-md">Edit box</div>
          <q-form @submit.prevent="updateBox" class="q-gutter-y-md">
            <q-input
              v-model="boxDraft.name"
              label="Name"
              filled
              :rules="[(val) => !!val?.trim() || 'Box name is required']"
              :error="!!nameError"
              :error-message="nameError || undefined"
              @update:model-value="nameError = ''"
            />
            <q-banner v-if="isRenaming" dense rounded class="bg-orange-1 text-orange-10">
              <template #avatar><q-icon name="warning" color="orange-8" /></template>
              Renaming changes this box's link. Labels already printed for it will stop
              opening it, so print a new label after you save.
            </q-banner>
            <q-input v-model="boxDraft.description" label="Description" type="textarea" filled autogrow />
            <div>
              <div class="text-caption text-grey-7 q-mb-sm">Access level</div>
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div
                    class="access-option cursor-pointer rounded-borders q-pa-md"
                    :class="boxDraft.access_level === 'private' ? 'access-option--active' : 'access-option--inactive'"
                    @click="boxDraft.access_level = 'private'"
                  >
                    <q-icon name="lock" size="20px" class="q-mb-xs" />
                    <div class="text-subtitle2">Private</div>
                    <div class="text-caption text-grey-6">Only you</div>
                  </div>
                </div>
                <div class="col-6">
                  <div
                    class="access-option cursor-pointer rounded-borders q-pa-md"
                    :class="boxDraft.access_level === 'public' ? 'access-option--active' : 'access-option--inactive'"
                    @click="boxDraft.access_level = 'public'"
                  >
                    <q-icon name="language" size="20px" class="q-mb-xs" />
                    <div class="text-subtitle2">Public</div>
                    <div class="text-caption text-grey-6">Anyone with an account</div>
                  </div>
                </div>
              </div>
            </div>
            <q-input
              v-model="boxDraft.tags"
              label="Tags (comma-separated)"
              filled
              hint="Example: fragile, winter, donation"
            />
            <div class="row q-gutter-sm">
              <q-btn
                type="submit"
                color="primary"
                label="Save changes"
                unelevated
                :loading="isSavingBox"
                :disable="isSavingBox"
              />
              <q-btn flat color="grey-7" label="Cancel" :disable="isSavingBox" @click="cancelEdit" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <AddItemDialog v-if="isOwner" :boxId="box.id" :boxName="box.name" ref="addItemDialog" @item-added="fetchItems" />
      <QRCodeDialog ref="qrCodeDialog" :box="box" />

      <!-- Items section -->
      <div class="q-mt-lg">
        <div class="row items-center q-mb-md">
          <h2 class="text-h6 text-weight-bold q-ma-none col">Items</h2>
          <span class="text-caption text-grey-6">{{ items.length }} in this box</span>
        </div>

        <q-input
          v-model="itemSearch"
          filled
          clearable
          label="Search items"
          class="q-mb-md"
          :loading="isSearchingItems"
          @update:model-value="handleItemSearch"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>

        <div v-if="items.length === 0" class="text-center q-pa-xl text-grey-6">
          No items found in this box.
        </div>

        <div v-else class="q-gutter-y-sm">
          <q-card v-for="item in items" :key="item.id" flat bordered>
            <q-card-section class="row items-start no-wrap q-pa-md">
              <div class="col overflow-hidden">
                <div class="text-subtitle2 text-weight-medium q-mb-xs">{{ item.name }}</div>
                <div v-if="item.description" class="text-body2 text-grey-8 bb-clamp2 q-mb-xs">
                  {{ item.description }}
                </div>
                <div class="row items-center q-gutter-x-xs q-mb-xs">
                  <template v-if="normalizeTags(item.tags).length">
                    <q-chip
                      v-for="tag in normalizeTags(item.tags)"
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
                  <span v-if="item.updated_at || item.date_updated">
                    Updated {{ formatDate(item.updated_at || item.date_updated) }}
                  </span>
                  <span v-else>
                    Created {{ formatDate(item.created_at || item.created_time) }}
                  </span>
                </div>
              </div>
              <div v-if="isOwner" class="row items-start q-gutter-x-xs q-ml-sm flex-shrink-0">
                <q-btn flat round dense icon="edit" color="grey-6" @click.stop="openEditItemDialog(item)">
                  <q-tooltip>Edit</q-tooltip>
                </q-btn>
                <q-btn flat round dense icon="delete" color="grey-6" @click.stop="confirmItemDelete(item.id)">
                  <q-tooltip>Delete</q-tooltip>
                </q-btn>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Edit item dialog -->
      <q-dialog v-model="editItemDialog" persistent>
        <q-card style="min-width: 400px; max-width: 80vw">
          <q-card-section class="row items-center q-pb-sm">
            <div class="text-h6 col">Edit item</div>
            <q-btn flat round dense icon="close" v-close-popup />
          </q-card-section>
          <q-separator />
          <q-card-section class="q-gutter-y-md">
            <q-input v-model="itemToEdit.name" label="Name" filled />
            <q-input v-model="itemToEdit.description" label="Description" type="textarea" filled autogrow />
            <q-input
              v-model="itemToEdit.tags"
              label="Tags (comma-separated)"
              filled
              hint="Example: kitchen, fragile"
            />
          </q-card-section>
          <q-separator />
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancel" :disable="isSavingItem" v-close-popup />
            <q-btn
              color="primary"
              label="Save"
              unelevated
              :loading="isSavingItem"
              :disable="isSavingItem"
              @click="saveItem"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Delete item dialog -->
      <q-dialog v-model="deleteDialog" persistent>
        <q-card>
          <q-card-section class="row items-center">
            <q-avatar icon="warning" color="negative" text-color="white" />
            <span class="q-ml-sm">Delete this item?</span>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" :disable="isDeletingItem" v-close-popup />
            <q-btn
              color="negative"
              label="Delete"
              unelevated
              :loading="isDeletingItem"
              :disable="isDeletingItem"
              @click="deleteItem"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import AddItemDialog from 'src/components/AddItemDialog.vue'
import QRCodeDialog from 'src/components/QRCodeDialog.vue'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useItemsStore } from 'src/stores/items.store'
import { useAuthStore } from 'src/stores/auth.store'
import { supabase } from 'src/utils/supabase'
import { getBoxPath, getBoxQrValue } from 'src/utils/boxQr'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const boxesStore = useBoxesStore()
const itemsStore = useItemsStore()
const authStore = useAuthStore()
const box = ref(null)
const isSavingBox = ref(false)
const isSavingItem = ref(false)
const isDeletingItem = ref(false)
// A count, not a flag: an earlier search finishing must not hide the
// spinner while a later one is still loading.
const itemSearchesInFlight = ref(0)
const isSearchingItems = computed(() => itemSearchesInFlight.value > 0)
const boxDraft = ref({ name: '', description: '', access_level: 'private', tags: '' })
const addItemDialog = ref(null)
const qrCodeDialog = ref(null)
const items = ref([])
const isEditing = ref(false)
const nameError = ref('')
const isLoading = ref(false)
const pageState = ref('ready')
const itemSearch = ref('')

// Public and shared boxes are readable by other accounts, but only the owner
// may change them (the database rejects or silently ignores anyone else).
const isOwner = computed(() => !!box.value && box.value.user_id === authStore.user?.id)

// A box's URL, and so its printed QR label, is built from its name.
const isRenaming = computed(() => {
  const name = boxDraft.value.name?.trim()
  return isEditing.value && !!box.value && !!name && name !== box.value.name
})
let itemSearchDebounce = null

const editItemDialog = ref(false)
const itemToEdit = ref({ id: null, name: '', description: '', tags: '' })
const deleteDialog = ref(false)
const itemToDelete = ref(null)

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) return tags.filter(Boolean)
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean)
  return []
}

const formatTags = (tags) => {
  const values = normalizeTags(tags)
  return values.length ? values.join(', ') : ''
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const showAddItemDialog = () => {
  addItemDialog.value.isOpen = true
}

const showQRCodeDialog = () => {
  qrCodeDialog.value.isOpen = true
}

const startEditingBox = () => {
  boxDraft.value = {
    name: box.value.name,
    description: box.value.description,
    access_level: box.value.access_level || 'private',
    tags: formatTags(box.value.tags),
  }
  nameError.value = ''
  isEditing.value = true
}

// Fetches overlap (typing in search, saving an item, moving to another box)
// and responses can arrive out of order. Each fetch takes a number, and only
// the newest may set `items` or report an error.
let latestItemsFetch = 0

const fetchItems = async () => {
  if (!box.value?.id) return
  const fetchId = ++latestItemsFetch
  try {
    const result = await itemsStore.fetchItemsByBox(box.value.id, itemSearch.value)
    if (fetchId === latestItemsFetch) items.value = result
  } catch (error) {
    if (fetchId === latestItemsFetch) throw error
  }
}

const handleItemSearch = () => {
  if (itemSearchDebounce) clearTimeout(itemSearchDebounce)
  itemSearchDebounce = setTimeout(async () => {
    itemSearchesInFlight.value++
    try {
      await fetchItems()
    } catch (error) {
      console.error('Error searching items:', error)
      $q.notify({ type: 'negative', message: 'Search failed. Please try again.' })
    } finally {
      itemSearchesInFlight.value--
    }
  }, 250)
}

const fetchBoxDetails = async () => {
  pageState.value = 'ready'

  try {
    const { display_name, box_name } = route.params

    if (!display_name || !box_name) {
      console.error('Invalid box route params')
      return
    }

    const access = await boxesStore.getBoxAccessStatus(display_name, box_name)

    if (access.status_code === 404) {
      pageState.value = 'not_found'
      return
    }

    if (access.status_code === 403) {
      pageState.value = 'forbidden'
      return
    }

    const { data: boxData, error: boxError } = await supabase
      .from('boxes')
      .select('*')
      .eq('id', access.box_id)
      .single()

    if (boxError) throw boxError

    box.value = boxData
  } catch (error) {
    console.error('Error fetching box details:', error)
  }
}

const errorText = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.'

const updateBox = async () => {
  if (isSavingBox.value) return
  isSavingBox.value = true
  try {
    const name = boxDraft.value.name.trim()
    const renamed = name !== box.value.name
    await boxesStore.updateBox(box.value.id, {
      name,
      description: boxDraft.value.description,
      access_level: boxDraft.value.access_level,
      tags: boxDraft.value.tags,
      // The box URL is built from its name, so keep the stored one in step.
      ...(renamed ? { qr_code_url: getBoxQrValue({ ...box.value, name }) } : {}),
    })
    isEditing.value = false
    if (renamed) {
      $q.notify({
        type: 'positive',
        message: 'Box renamed. Print a new label: the old one no longer opens this box.',
        timeout: 10000,
        actions: [
          {
            label: 'Print new label',
            color: 'white',
            // The page reloads at the new URL, so the dialog may not be mounted yet.
            handler: () => {
              if (qrCodeDialog.value) qrCodeDialog.value.isOpen = true
            },
          },
        ],
      })
      // The current URL names the old box, which no longer resolves; the
      // route watcher reloads the page at the new one.
      await router.replace(getBoxPath(box.value.display_name, name))
    } else {
      $q.notify({ type: 'positive', message: 'Box updated' })
      await fetchBoxDetails()
    }
  } catch (error) {
    if (error.code === 'BOX_NAME_TAKEN') {
      nameError.value = error.message
    } else {
      console.error('Error updating box:', error)
      $q.notify({ type: 'negative', message: `Could not update box: ${errorText(error)}` })
    }
  } finally {
    isSavingBox.value = false
  }
}

const cancelEdit = () => {
  isEditing.value = false
}

const openEditItemDialog = (item) => {
  itemToEdit.value = {
    id: item.id,
    name: item.name,
    description: item.description,
    tags: formatTags(item.tags),
  }
  editItemDialog.value = true
}

const saveItem = async () => {
  if (isSavingItem.value) return
  isSavingItem.value = true
  try {
    await itemsStore.updateItem(itemToEdit.value.id, {
      name: itemToEdit.value.name,
      description: itemToEdit.value.description,
      tags: itemToEdit.value.tags,
    })
    editItemDialog.value = false
    $q.notify({ type: 'positive', message: 'Item updated' })
    await fetchItems()
  } catch (error) {
    console.error('Error saving item:', error)
    $q.notify({ type: 'negative', message: `Could not save item: ${errorText(error)}` })
  } finally {
    isSavingItem.value = false
  }
}

const confirmItemDelete = (itemId) => {
  itemToDelete.value = itemId
  deleteDialog.value = true
}

const deleteItem = async () => {
  if (isDeletingItem.value) return
  isDeletingItem.value = true
  try {
    await itemsStore.deleteItem(itemToDelete.value)
    deleteDialog.value = false
    $q.notify({ type: 'positive', message: 'Item deleted' })
    await fetchItems()
  } catch (error) {
    console.error('Error deleting item:', error)
    $q.notify({ type: 'negative', message: `Could not delete item: ${errorText(error)}` })
  } finally {
    isDeletingItem.value = false
  }
}

const loadPage = async () => {
  isLoading.value = true
  isEditing.value = false
  box.value = null
  items.value = []
  // Drop any fetch still in flight for the previous box.
  latestItemsFetch++
  try {
    await fetchBoxDetails()
    await fetchItems()
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPage)

// Vue Router reuses this component when only the params change (a rename,
// or a deep link opened while another box is showing), so onMounted alone
// would leave the previous box on screen.
watch(
  () => [route.params.display_name, route.params.box_name],
  ([displayName, boxName]) => {
    if (displayName && boxName) loadPage()
  },
)
</script>

<style scoped>
.no-underline-link {
  text-decoration: none;
}
.no-underline-link:hover {
  text-decoration: underline;
}

.action-tile {
  min-height: 68px;
  border-radius: 8px;
  font-size: 13px;
}
.action-tile--tinted {
  background-color: #f0f6fd;
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
