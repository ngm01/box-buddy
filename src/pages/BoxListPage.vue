<template>
  <q-page class="q-pa-md">
    <!-- List of boxes -->
    <q-list v-if="boxes.length" bordered separator>
      <q-item v-for="box in boxes" :key="box.id" clickable>
        <q-item-section @click="goToBoxDetail(box.id)">
          <q-item-label>{{ box.name }}</q-item-label>
          <q-item-label caption>{{ box.description }}</q-item-label>
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

    <q-btn color="primary" class="q-mt-md" @click="showCreateBoxModal = true">
      + Create New Box
    </q-btn>

    <!-- Modal for Creating a Box -->
    <q-dialog v-model="showCreateBoxModal">
      <q-card class="q-pa-md" style="width: 400px; max-width: 80vw">
        <q-card-section>
          <div class="text-h6">Create New Box</div>
        </q-card-section>

        <!-- Box creation form -->
        <q-form @submit.prevent="handleCreateBox">
          <q-card-section>
            <q-input v-model="box.name" label="Box Name" filled />
            <q-input v-model="box.description" label="Description" filled type="textarea" />
          </q-card-section>

          <!-- Submit and Cancel Buttons -->
          <q-card-actions align="right">
            <q-btn type="submit" color="primary" label="Create" />
            <q-btn color="negative" label="Cancel" @click="showCreateBoxModal = false" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal for Deleting a Box -->
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

    <!-- Modal for box creation success -->
    <q-dialog v-model="showBoxCreatedModal">
      <q-card class="q-pa-md" style="width: 400px; max-width: 80vw">
        <!-- Display QR Code if generated -->
        <q-card-section v-if="qrCode" class="q-mt-sm text-center">
          <div class="text-subtitle1">QR Code:</div>
          <img :src="qrCode" alt="QR Code" class="q-mt-sm" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { useBoxesStore } from 'src/stores/boxes.store'
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
const router = useRouter()
const boxesStore = useBoxesStore()
const { boxes } = storeToRefs(boxesStore)
const box = ref({ name: '', description: '' })
const selectedBox = ref(null)
const showCreateBoxModal = ref(false)
const showBoxCreatedModal = ref(false)
const showDeleteModal = ref(false)
const qrCode = ref('')
const errorMessage = ref('')

const handleCreateBox = async () => {
  try {
    const result = await boxesStore.createBox(box.value)
    console.log('box creation result:', result)
    //showBoxCreatedModal.value = true
  } catch (error) {
    console.log('error creating box:', error)
    errorMessage.value = error.message
  } finally {
    qrCode.value = ''
    showCreateBoxModal.value = false
    box.value = { name: '', description: '' }
    await boxesStore.fetchBoxes()
  }
}

const goToBoxDetail = (boxId) => {
  // Navigate to the box detail page
  router.push('/boxes/' + boxId)
}

const confirmDelete = (id) => {
  // Show the delete confirmation modal
  selectedBox.value = boxes.value.find((box) => box.id === id)
  showDeleteModal.value = true
}

const deleteBox = async () => {
  try {
    await boxesStore.deleteBox(selectedBox.value.id)
    showDeleteModal.value = false
  } catch (error) {
    console.log('error deleting box:', error)
    errorMessage.value = error.message
  } finally {
    selectedBox.value = null
    await boxesStore.fetchBoxes()
  }
}

onMounted(async () => {
  await boxesStore.fetchBoxes()
})
</script>

<style lang="scss" scoped></style>
