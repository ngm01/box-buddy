<template>
  <q-page>
    <div v-if="!box" class="q-pa-md">
      <p>Loading...</p>
    </div>

    <div v-else>
      <div class="row q-pa-md">
        <div class="col-12 col-md-8">
          <div v-if="!isEditing">
            <div class="q-mb-md">
              <div class="text-h6">{{ box.name }}</div>
              <div>{{ box.description }}</div>
              <div class="text-caption">Access Level: {{ box.access_level }}</div>
              <div class="text-caption">Tags: {{ formatTags(box.tags) }}</div>
              <div class="text-caption">Created: {{ formatDate(box.created_at || box.created_time) }}</div>
              <div class="text-caption">
                Last updated: {{ formatDate(box.updated_at || box.date_updated) }}
              </div>
            </div>
            <div class="q-pa-md q-gutter-sm">
              <q-btn color="primary" icon="edit" label="Edit Details" @click="startEditingBox" />
              <q-btn
                label="View QR Code"
                icon="qr_code"
                @click="showQRCodeDialog"
                color="primary"
              />
              <q-btn color="primary" icon="add" label="Add Item" @click="showAddItemDialog" />
            </div>
          </div>

          <q-form v-else @submit.prevent="updateBox" class="q-gutter-md">
            <q-input v-model="boxDraft.name" label="Name" filled />
            <q-input v-model="boxDraft.description" label="Description" type="textarea" filled />
            <q-select
              v-model="boxDraft.access_level"
              :options="['private', 'public']"
              label="Access Level"
              filled
            />
            <q-input
              v-model="boxDraft.tags"
              label="Tags (comma-separated)"
              filled
              hint="Example: fragile, winter, donation"
            />

            <q-btn type="submit" color="primary" label="Save Changes" class="q-mt-md" />
            <q-btn color="grey-7" label="Cancel" @click="cancelEdit" class="q-mt-md" />
          </q-form>
        </div>
      </div>

      <AddItemDialog :boxId="box.id" ref="addItemDialog" @item-added="fetchItems" />
      <QRCodeDialog ref="qrCodeDialog" :box="box" />

      <div class="q-mt-lg q-px-md">
        <h3 class="text-h6">Items</h3>

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

        <div v-if="items.length === 0" class="text-center q-pa-md">
          <p class="text-grey-7">No items found for this box.</p>
        </div>

        <q-list v-else bordered separator>
          <q-item v-for="item in items" :key="item.id">
            <q-item-section>
              <q-item-label>{{ item.name }}</q-item-label>
              <q-item-label caption>{{ item.description }}</q-item-label>
              <q-item-label caption>Tags: {{ formatTags(item.tags) }}</q-item-label>
              <q-item-label caption>
                Created: {{ formatDate(item.created_at || item.created_time) }}
              </q-item-label>
              <q-item-label caption>
                Updated: {{ formatDate(item.updated_at || item.date_updated) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row justify-right">
                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="edit"
                  @click.stop="openEditItemDialog(item)"
                  class="q-mr-sm"
                />
                <q-btn
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete"
                  @click.stop="confirmItemDelete(item.id)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <q-dialog v-model="editItemDialog" persistent>
        <q-card class="q-pa-md" style="min-width: 400px; max-width: 80vw">
          <q-card-section class="row items-center">
            <q-avatar icon="edit" color="primary" text-color="white" />
            <span class="q-ml-sm">Edit Item</span>
          </q-card-section>
          <q-card-section>
            <q-input v-model="itemToEdit.name" label="Name" filled />
            <q-input v-model="itemToEdit.description" label="Description" type="textarea" filled />
            <q-input
              v-model="itemToEdit.tags"
              label="Tags (comma-separated)"
              filled
              hint="Example: kitchen, fragile"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" v-close-popup />
            <q-btn flat label="Save" color="primary" @click="saveItem" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="deleteDialog" persistent>
        <q-card>
          <q-card-section class="row items-center">
            <q-avatar icon="warning" color="negative" text-color="white" />
            <span class="q-ml-sm">Are you sure you want to delete this item?</span>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" v-close-popup />
            <q-btn flat label="Delete" color="negative" @click="deleteItem" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useItemsStore } from 'src/stores/items.store'
import { useRoute } from 'vue-router'
import AddItemDialog from 'src/components/AddItemDialog.vue'
import QRCodeDialog from 'src/components/QRCodeDialog.vue'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useItemsStore } from 'src/stores/items.store'

const route = useRoute()
const boxesStore = useBoxesStore()
const itemsStore = useItemsStore()

const box = ref(null)
const boxDraft = ref({ name: '', description: '', access_level: 'private', tags: '' })
const addItemDialog = ref(null)
const qrCodeDialog = ref(null)
const items = ref([])
const isEditing = ref(false)
const itemSearch = ref('')
let itemSearchDebounce = null

const editItemDialog = ref(false)
const itemToEdit = ref({ id: null, name: '', description: '', tags: '' })
const deleteDialog = ref(false)
const itemToDelete = ref(null)

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return []
}

const formatTags = (tags) => {
  const values = normalizeTags(tags)
  return values.length ? values.join(', ') : 'None'
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
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
    access_level: box.value.access_level,
    tags: formatTags(box.value.tags) === 'None' ? '' : formatTags(box.value.tags),
  }
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
}

const fetchBoxDetails = async () => {
  const { display_name, box_name } = route.params
  await boxesStore.fetchBoxes()
  box.value = boxesStore.boxes.find(
    (boxEntry) => boxEntry.display_name === display_name && boxEntry.name === box_name,
  )
}

const fetchItems = async () => {
  if (!box.value?.id) return
  items.value = await itemsStore.fetchItemsByBox(box.value.id, itemSearch.value)
}

const handleItemSearch = () => {
  if (itemSearchDebounce) {
    clearTimeout(itemSearchDebounce)
  }

  itemSearchDebounce = setTimeout(async () => {
    await fetchItems()
  }, 250)
}

const updateBox = async () => {
  if (!box.value?.id) return

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

const openEditItemDialog = (item) => {
  itemToEdit.value = {
    id: item.id,
    name: item.name,
    description: item.description,
    tags: formatTags(item.tags) === 'None' ? '' : formatTags(item.tags),
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
  await fetchBoxDetails()
  await fetchItems()
})
</script>

<style lang="scss" scoped></style>
