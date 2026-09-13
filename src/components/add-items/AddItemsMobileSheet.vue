<template>
  <q-dialog v-model="isOpen" position="bottom" full-width @hide="reset">
    <q-card class="sheet-card column no-wrap">
      <!-- Drag handle -->
      <div class="drag-handle-row">
        <div class="drag-handle" />
      </div>

      <!-- Header -->
      <div class="row items-center justify-between q-px-md q-pb-sm">
        <div class="text-h6">Add Items</div>
        <q-btn flat round dense icon="close" @click="handleClose" />
      </div>

      <!-- Mode tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        align="justify"
        no-caps
        indicator-color="primary"
        class="q-mx-md q-mb-xs"
      >
        <q-tab name="hand" icon="edit" label="By Hand" />
        <q-tab name="scan" icon="auto_awesome" label="AI Scan" />
      </q-tabs>

      <q-separator />

      <!-- Scrollable body -->
      <div class="col overflow-auto">
        <q-tab-panels v-model="activeTab" animated>
          <!-- By Hand panel -->
          <q-tab-panel name="hand" class="q-pa-none">
            <div class="q-pa-md q-gutter-sm">
              <q-input
                ref="nameInput"
                v-model="form.name"
                label="Item Name *"
                outlined
                dense
                @keydown.enter.prevent="handleAddToList"
              />
              <q-input
                v-model="form.description"
                label="Description"
                outlined
                dense
                type="textarea"
                autogrow
              />
              <q-input
                v-model="form.tags"
                label="Tags (comma-separated)"
                outlined
                dense
                hint="Example: pantry, fragile"
              />
              <q-btn
                outline
                class="full-width"
                label="+ Add to List"
                :disable="!form.name.trim()"
                @click="handleAddToList"
              />
            </div>
          </q-tab-panel>

          <!-- AI Scan panel -->
          <q-tab-panel name="scan" class="q-pa-none">
            <ScanCapture
              v-if="scanPhase === 'capture'"
              :photos="batchPhotos"
              :credit-balance="creditsStore.balance"
              :credits-per-photo="CREDITS_PER_PHOTO"
              @photo-added="onPhotoAdded"
              @photo-removed="onPhotoRemoved"
              @done="scanPhase = 'preview'"
            />
            <ScanPreview
              v-else-if="scanPhase === 'preview'"
              :photos="batchPhotos"
              :credits-to-spend="creditsToSpend"
              @confirm="onConfirmPreview"
              @back="scanPhase = 'capture'"
              @photo-removed="onPhotoRemovedInPreview"
            />
            <ScanProcessing
              v-else-if="scanPhase === 'processing'"
              :photos="batchPhotos"
            />
            <ScanResults
              v-else-if="scanPhase === 'results'"
              :photos="batchPhotos"
              :box-name="boxName"
              @add-items="saveItems"
              @retry-photo="onRetryPhoto"
            />
            <OutOfCreditsCard
              v-else-if="scanPhase === 'out_of_credits'"
              :saved-photo-count="batchPhotos.filter((p) => p.status === 'pending').length"
              @purchase-complete="onPurchaseComplete"
              @dismiss="handleClose"
            />
          </q-tab-panel>
        </q-tab-panels>

        <!-- Shared session list (By Hand) -->
        <q-separator class="q-mx-md" />
        <div class="q-px-md q-pt-sm q-pb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-bold">
              Added this session
            </div>
            <q-badge v-if="sessionItems.length > 0" color="primary" :label="sessionItems.length" />
          </div>

          <div
            v-if="sessionItems.length === 0"
            class="text-caption text-grey-5 text-center q-py-lg"
          >
            No items yet — add one above
          </div>

          <TransitionGroup name="session-item" tag="div">
            <div
              v-for="(item, index) in sessionItems"
              :key="item.id"
              class="session-item-row row items-start q-py-sm"
            >
              <q-icon
                name="check_circle"
                color="positive"
                size="18px"
                class="q-mr-sm q-mt-xs shrink-0"
              />
              <div class="col">
                <div class="text-body2 text-weight-medium">{{ item.name }}</div>
                <div v-if="item.description" class="text-caption text-grey-6">
                  {{ item.description }}
                </div>
                <div v-if="item.tags.length > 0" class="row wrap q-gutter-x-xs q-mt-xs">
                  <q-chip
                    v-for="tag in item.tags"
                    :key="tag"
                    dense
                    size="sm"
                    color="grey-3"
                    text-color="grey-8"
                    class="q-ma-none"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
              </div>
              <q-btn
                flat
                round
                dense
                icon="close"
                size="sm"
                class="text-grey-5"
                @click="removeSessionItem(index)"
              />
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Footer (By Hand session items) -->
      <q-separator />
      <div class="q-pa-md">
        <q-btn
          color="primary"
          class="full-width"
          size="lg"
          :label="
            sessionItems.length > 0
              ? `Add ${sessionItems.length} item${sessionItems.length !== 1 ? 's' : ''} to box`
              : 'Add items to box'
          "
          :disable="sessionItems.length === 0"
          :loading="isSaving"
          @click="saveAllItems"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { CREDITS_PER_PHOTO } from 'src/constants/credits'
import { useAddItemsSession } from 'src/composables/useAddItemsSession'
import ScanCapture from 'src/components/scan/ScanCapture.vue'
import ScanPreview from 'src/components/scan/ScanPreview.vue'
import ScanProcessing from 'src/components/scan/ScanProcessing.vue'
import ScanResults from 'src/components/scan/ScanResults.vue'
import OutOfCreditsCard from 'src/components/OutOfCreditsCard.vue'

const props = defineProps({
  boxId: { type: String, required: true },
  boxName: { type: String, default: '' },
})
const emit = defineEmits(['item-added'])

const isOpen = defineModel({ type: Boolean, default: false })

const nameInput = ref(null)

const {
  activeTab,
  form,
  sessionItems,
  scanPhase,
  batchPhotos,
  creditsToSpend,
  isSaving,
  creditsStore,
  addToList,
  removeSessionItem,
  onPhotoAdded,
  onPhotoRemoved,
  onPhotoRemovedInPreview,
  onConfirmPreview,
  onRetryPhoto,
  onPurchaseComplete,
  saveItems,
  saveAllItems,
  handleClose,
  reset,
} = useAddItemsSession({
  boxId: () => props.boxId,
  onSaved: () => emit('item-added'),
  onClose: () => {
    isOpen.value = false
  },
})

const handleAddToList = () => {
  if (addToList()) nextTick(() => nameInput.value?.focus())
}
</script>

<style scoped>
.sheet-card {
  max-height: 85vh;
  max-height: 85dvh;
  border-radius: 16px 16px 0 0;
}

.drag-handle-row {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}

.drag-handle {
  width: 36px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.session-item-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.session-item-row:last-child {
  border-bottom: none;
}

.shrink-0 {
  flex-shrink: 0;
}

.session-item-enter-active,
.session-item-leave-active {
  transition: all 0.25s ease;
}

.session-item-enter-from,
.session-item-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

.session-item-move {
  transition: transform 0.25s ease;
}
</style>
