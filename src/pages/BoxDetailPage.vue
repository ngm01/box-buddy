<template>
  <q-page>
    <div v-if="!box">
      <p>Loading...</p>
    </div>
    <div v-else>
      <h2 class="text-h6">Box Details</h2>
      <p><strong>Name:</strong> {{ box.name }}</p>
      <QRCodeCanvas :url="box.qr_code_url" />
      <p>{{ box.description }}</p>

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
const openDialog = () => {
  addItemDialog.value.isOpen = true
}

onMounted(async () => {
  const boxId = route.params.box_id
  box.value = boxes.value.find((box) => box.id === boxId)
  const { data: itemsData } = await supabase.from('items').select('*').eq('box_id', boxId)
  items.value = itemsData
})
</script>

<style lang="scss" scoped></style>
