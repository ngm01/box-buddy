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
        <q-card-actions class="q-pa-md q-pt-none">
          <q-skeleton type="QBtn" width="110px" class="q-mr-sm" />
          <q-skeleton type="QBtn" width="120px" class="q-mr-sm" />
          <q-skeleton type="QBtn" width="130px" />
        </q-card-actions>
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
              <h1 class="text-h6 text-weight-medium q-ma-none q-mr-sm">{{ box.name }}</h1>
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

        <q-card-actions class="q-pa-md q-gutter-sm">
          <q-btn color="primary" icon="add" label="Add item" unelevated @click="showAddItemDialog" />
          <q-btn outline color="primary" icon="edit" label="Edit details" @click="startEditingBox" />
          <q-btn outline color="primary" icon="qr_code" label="View QR code" @click="showQRCodeDialog" />
        </q-card-actions>
      </q-card>

      <!-- Edit box form -->
      <q-card v-else flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium q-mb-md">Edit box</div>
          <q-form @submit.prevent="updateBox" class="q-gutter-y-md">
            <q-input v-model="boxDraft.name" label="Name" filled />
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
              <q-btn type="submit" color="primary" label="Save changes" unelevated />
              <q-btn flat color="grey-7" label="Cancel" @click="cancelEdit" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <AddItemDialog :boxId="box.id" ref="addItemDialog" @item-added="fetchItems" />
      <QRCodeDialog ref="qrCodeDialog" :box="box" />

      <!-- Items section -->
      <div class="q-mt-lg">
        <div class="row items-center q-mb-md">
          <h2 class="text-subtitle1 text-weight-medium q-ma-none col">Items</h2>
          <span class="text-caption text-grey-6">{{ items.length }} in this box</span>
        </div>

        <q-input
          v-model="itemSearch"
          filled
          clearable
          label="Search items"
          class="q-mb-md"
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
              <div class="row items-start q-gutter-x-xs q-ml-sm flex-shrink-0">
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
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn color="primary" label="Save" unelevated @click="saveItem" />
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
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn color="negative" label="Delete" unelevated @click="deleteItem" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AddItemDialog from 'src/components/AddItemDialog.vue'
import QRCodeDialog from 'src/components/QRCodeDialog.vue'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useItemsStore } from 'src/stores/items.store'
import { supabase } from 'src/utils/supabase'

const route = useRoute()
const boxesStore = useBoxesStore()
const itemsStore = useItemsStore()
const box = ref(null)
const boxDraft = ref({ name: '', description: '', access_level: 'private', tags: '' })
const addItemDialog = ref(null)
const qrCodeDialog = ref(null)
const items = ref([])
const isEditing = ref(false)
const isLoading = ref(false)
const pageState = ref('ready')
const itemSearch = ref('')
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
  isEditing.value = true
}

const fetchItems = async () => {
  if (!box.value?.id) return
  items.value = await itemsStore.fetchItemsByBox(box.value.id, itemSearch.value)
}

const handleItemSearch = () => {
  if (itemSearchDebounce) clearTimeout(itemSearchDebounce)
  itemSearchDebounce = setTimeout(async () => {
    await fetchItems()
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

    const { data: boxData, error: boxError } = await supabase
      .from('boxes')
      .select('*')
      .eq('display_name', display_name)
      .eq('name', box_name)
      .single()

    if (boxError) {
      pageState.value = 'not_found'
      return
    }

    box.value = boxData
  } catch (error) {
    console.error('Error fetching box details:', error)
  }
}

const updateBox = async () => {
  try {
    await boxesStore.updateBox(box.value.id, {
      name: boxDraft.value.name,
      description: boxDraft.value.description,
      access_level: boxDraft.value.access_level,
      tags: boxDraft.value.tags,
    })
    await fetchBoxDetails()
    isEditing.value = false
  } catch (error) {
    console.error('Error updating box:', error)
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
  try {
    await itemsStore.updateItem(itemToEdit.value.id, {
      name: itemToEdit.value.name,
      description: itemToEdit.value.description,
      tags: itemToEdit.value.tags,
    })
    await fetchItems()
    editItemDialog.value = false
  } catch (error) {
    console.error('Error saving item:', error)
  }
}

const confirmItemDelete = (itemId) => {
  itemToDelete.value = itemId
  deleteDialog.value = true
}

const deleteItem = async () => {
  try {
    await itemsStore.deleteItem(itemToDelete.value)
    deleteDialog.value = false
    await fetchItems()
  } catch (error) {
    console.error('Error deleting item:', error)
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await fetchBoxDetails()
    await fetchItems()
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.no-underline-link {
  text-decoration: none;
}
.no-underline-link:hover {
  text-decoration: underline;
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
