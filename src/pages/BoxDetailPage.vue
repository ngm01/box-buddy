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
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import QRCodeCanvas from 'src/components/QRCodeCanvas.vue'

const route = useRoute()
const boxesStore = useBoxesStore()
const { boxes } = storeToRefs(boxesStore)
const box = ref(null)

onMounted(async () => {
  const boxId = route.params.box_id
  box.value = boxes.value.find((box) => box.id === boxId)
})
</script>

<style lang="scss" scoped></style>
