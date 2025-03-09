<template>
  <q-page>
    <div v-if="!box">
      <p>Loading...</p>
    </div>
    <div v-else>
      <div class="q-pa-md">
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

        <div class="q-mt-lg">
          <QRCodeCanvas :url="box.qr_code_url" />
          <p>Created: {{ new Date(box.created_time).toLocaleString() }}</p>
          <p>Updated: {{ new Date(box.date_updated).toLocaleString() }}</p>
        </div>
      </div>

      <q-btn
        color="primary"
        icon="add"
        label="Add Item"
        @click="openDialog"
        class="full-width q-mt-md"
      />

      <AddItemDialog :boxId="box.id" ref="addItemDialog" />

      <!-- Items List Section -->
      <div class="q-mt-lg">
        <h3 class="text-h6">Items</h3>

        <div v-if="items.length === 0" class="text-center q-pa-md">
          <p class="text-grey-7">No items in this box yet. Add some items to get started!</p>
        </div>

        <q-list v-else bordered separator>
          <q-item v-for="item in items" :key="item.id">
            <q-item-section>
              <q-item-label>{{ item.title }}</q-item-label>
              <q-item-label caption>{{ item.description }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import QRCodeCanvas from 'src/components/QRCodeCanvas.vue'
import AddItemDialog from 'src/components/AddItemDialog.vue'
import { supabase } from '../utils/supabase'

const route = useRoute()
const boxesStore = useBoxesStore()
const { boxes } = storeToRefs(boxesStore)
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

onMounted(async () => {
  try {
    const boxId = route.params.box_id
    if (boxes.value.length === 0) {
      await boxesStore.fetchBoxes()
    }
    box.value = boxes.value.find((box) => box.id === boxId)
    const { data: itemsData } = await supabase.from('items').select('*').eq('box_id', boxId)
    items.value = itemsData
    console.log('Box details fetched successfully', box.value, items.value)
  } catch (error) {
    console.error('Error fetching box details:', error)
  }
})
</script>

<style lang="scss" scoped></style>
