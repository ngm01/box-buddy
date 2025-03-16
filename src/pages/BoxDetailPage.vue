<template>
  <q-page>
    <div v-if="!box">
      <p>Loading...</p>
    </div>
    <div v-else>
      <div class="row q-pa-md">
        <!-- Box Details Column -->
        <div class="col-12 col-md-8">
          <h2 class="text-h6">Box Details</h2>
          <div v-if="!isEditing">
            <div class="q-mb-md">
              <div class="text-h6">{{ box.name }}</div>
              <div class="text-subtitle2">{{ box.description }}</div>
              <div class="text-caption">Access Level: {{ box.access_level }}</div>
            </div>
            <q-btn
              color="primary"
              icon="edit"
              label="Edit Details"
              @click="isEditing = true"
              class="q-mb-lg"
            />
          </div>

          <q-form v-else @submit.prevent="updateBox" class="q-gutter-md">
            <q-input v-model="box.name" label="Name" filled />

            <q-input v-model="box.description" label="Description" type="textarea" filled />

            <q-select
              v-model="box.access_level"
              :options="['private', 'public']"
              label="Access Level"
              filled
            />

            <q-btn type="submit" color="primary" label="Save Changes" class="q-mt-md" />
            <q-btn color="grey-7" label="Cancel" @click="isEditing = false" class="q-mt-md" />
          </q-form>
        </div>

        <!-- QR Code Column -->
        <div class="col-12 col-md-4 q-pl-md-lg">
          <QRCodeCanvas :url="box.qr_code_url" />
          <p>Created: {{ new Date(box.created_time).toLocaleString() }}</p>
          <p>Updated: {{ new Date(box.date_updated).toLocaleString() }}</p>
        </div>
      </div>
      <div class="row justify-left">
        <q-btn color="primary" icon="add" label="Add Item" @click="openDialog" class="q-mt-md" />
      </div>

      <AddItemDialog :boxId="box.id" ref="addItemDialog" @item-added="fetchBoxDetails" />

      <!-- Items List Section -->
      <div class="q-mt-lg">
        <h3 class="text-h6">Items</h3>

        <div v-if="items.length === 0" class="text-center q-pa-md">
          <p class="text-grey-7">No items in this box yet. Add some items to get started!</p>
        </div>

        <q-list v-else bordered separator>
          <q-item v-for="item in items" :key="item.id">
            <q-item-section>
              <q-item-label>{{ item.name }}</q-item-label>
              <q-item-label caption>{{ item.description }}</q-item-label>
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

            <q-dialog v-model="editItemDialog" persistent>
              <q-card class="q-pa-md" style="min-width: 400px; max-width: 80vw">
                <q-card-section class="row items-center">
                  <q-avatar icon="edit" color="primary" text-color="white" />
                  <span class="q-ml-sm">Edit Item</span>
                </q-card-section>
                <q-card-section>
                  <q-input v-model="item.name" label="Name" filled />
                  <q-input v-model="item.description" label="Description" type="textarea" filled />
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn flat label="Cancel" color="primary" v-close-popup />
                  <q-btn flat label="Save" color="primary" @click="saveItem" v-close-popup />
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
                  <q-btn flat label="Delete" color="negative" @click="deleteItem" v-close-popup />
                </q-card-actions>
              </q-card>
            </q-dialog>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
//import { useBoxesStore } from 'src/stores/boxes.store'
import { useRoute } from 'vue-router'
//import { storeToRefs } from 'pinia'
import QRCodeCanvas from 'src/components/QRCodeCanvas.vue'
import AddItemDialog from 'src/components/AddItemDialog.vue'
import { supabase } from '../utils/supabase'

const route = useRoute()
//const boxesStore = useBoxesStore()
//const { boxes } = storeToRefs(boxesStore)
const box = ref(null)
const addItemDialog = ref(null)
const items = ref([])
const isEditing = ref(false)

const openDialog = () => {
  addItemDialog.value.isOpen = true
}

const updateBox = async () => {
  // eslint-disable-next-line no-unused-vars
  const { data, error } = await supabase
    .from('boxes')
    .update({
      name: box.value.name,
      description: box.value.description,
      access_level: box.value.access_level,
    })
    .eq('id', box.value.id)

  if (error) {
    console.error('Error updating box:', error)
  } else {
    console.log('Box updated successfully')
  }
}

const fetchBoxDetails = async () => {
  try {
    const { display_name, box_name } = route.params

    // Fetch the specific box directly without join
    const { data: boxData, error: boxError } = await supabase
      .from('boxes')
      .select('*')
      .eq('display_name', display_name)
      .eq('name', box_name)
      .single()

    if (boxError) {
      console.error('Box fetch error:', boxError)
      return
    }

    if (!boxData) {
      console.error('Box not found')
      return
    }

    box.value = boxData

    // Fetch items for the box using the box's ID
    const { data: itemsData } = await supabase.from('items').select('*').eq('box_id', box.value.id)

    items.value = itemsData || []
  } catch (error) {
    console.error('Error fetching box details:', error)
  }
}

const editItemDialog = ref(false)
const itemToEdit = ref(null)

const openEditItemDialog = (item) => {
  itemToEdit.value = item
  editItemDialog.value = true
}

const saveItem = async () => {
  console.log('Saving item:', itemToEdit.value)
  try {
    const { error } = await supabase
      .from('items')
      .update(itemToEdit.value)
      .eq('id', itemToEdit.value.id)
    if (error) {
      console.error('Error saving item:', error)
    } else {
      console.log('Item saved successfully')
      fetchBoxDetails()
      editItemDialog.value = false
      itemToEdit.value = null
    }
  } catch (error) {
    console.error('Error saving item:', error)
  }
}

const deleteDialog = ref(false)

const itemToDelete = ref(null)

const confirmItemDelete = (itemId) => {
  itemToDelete.value = itemId
  deleteDialog.value = true
}

const deleteItem = async () => {
  console.log('Deleting item:', itemToDelete.value)
  try {
    const { error } = await supabase.from('items').delete().eq('id', itemToDelete.value)
    if (error) {
      console.error('Error deleting item:', error)
    } else {
      console.log('Item deleted successfully')
      fetchBoxDetails()
    }
  } catch (error) {
    console.error('Error deleting item:', error)
  }
}

onMounted(async () => {
  fetchBoxDetails()
})
</script>

<style lang="scss" scoped></style>
