<template>
  <q-dialog
    v-model="isOpen"
    class="add-items-dialog"
    aria-labelledby="ai-modal-title"
    :persistent="sessionItems.length > 0"
    @escape-key="handleClose"
    @hide="onHide"
  >
    <q-card class="ai-modal column no-wrap">
      <!-- ── header ────────────────────────────────────────────────────── -->
      <div class="ai-header">
        <div id="ai-modal-title" class="ai-header__title">Add Items</div>
        <div v-if="boxName" class="ai-header__box">
          <q-icon name="inventory_2" size="12px" />
          {{ boxName }}
        </div>
        <q-btn
          flat
          round
          dense
          class="ai-close"
          icon="close"
          size="sm"
          aria-label="Close"
          @click="handleClose"
        />
      </div>

      <!-- ── tab bar ───────────────────────────────────────────────────── -->
      <div class="ai-tabbar" role="tablist" aria-label="Add items method">
        <button
          v-for="tab in TABS"
          :key="tab.name"
          type="button"
          role="tab"
          class="ai-tab"
          :class="{ 'ai-tab--active': activeTab === tab.name }"
          :aria-selected="activeTab === tab.name"
          :tabindex="activeTab === tab.name ? 0 : -1"
          @click="activeTab = tab.name"
          @keydown.left.prevent="cycleTab(-1)"
          @keydown.right.prevent="cycleTab(1)"
        >
          <q-icon :name="tab.icon" size="14px" />
          {{ tab.label }}
        </button>
      </div>

      <!-- ── body ──────────────────────────────────────────────────────── -->
      <div class="ai-body">
        <!-- left pane: form -->
        <div class="ai-pane-left">
          <!-- By Hand -->
          <template v-if="activeTab === 'hand'">
            <div class="ai-field">
              <label for="ai-item-name">Item name *</label>
              <q-input
                id="ai-item-name"
                ref="nameInput"
                v-model="form.name"
                class="ai-input"
                outlined
                dense
                autofocus
                placeholder="e.g. Winter jacket"
                @keydown.enter.prevent="handleAddToList"
              />
            </div>

            <div class="ai-field">
              <label for="ai-item-desc">Description</label>
              <q-input
                id="ai-item-desc"
                v-model="form.description"
                class="ai-input"
                outlined
                dense
                type="textarea"
                rows="2"
                placeholder="Optional notes…"
              />
            </div>

            <div class="ai-field">
              <span class="ai-field__label">Tags</span>
              <div class="ai-chips">
                <q-chip
                  v-for="tag in allTags"
                  :key="tag"
                  class="ai-chip"
                  :class="{ 'ai-chip--active': activeTags.includes(tag) }"
                  clickable
                  dense
                  :aria-pressed="activeTags.includes(tag)"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </q-chip>
              </div>
              <q-input
                v-model="tagDraft"
                class="ai-input ai-input--tag"
                outlined
                dense
                placeholder="Add a tag…"
                aria-label="Add a custom tag"
                @keydown.enter.prevent="commitTagDraft"
                @blur="commitTagDraft"
              />
            </div>

            <q-btn
              class="ai-add-btn"
              flat
              no-caps
              unelevated
              icon="add"
              label="Add to list"
              :disable="!form.name.trim()"
              @click="handleAddToList"
            />
          </template>

          <!-- AI Scan -->
          <template v-else>
            <OutOfCreditsCard
              v-if="scanPhase === 'out_of_credits'"
              :saved-photo-count="batchPhotos.filter((p) => p.status === 'pending').length"
              @purchase-complete="onPurchaseComplete"
              @dismiss="handleClose"
            />
            <ScanPaneDesktop
              v-else
              :phase="scanPhase"
              :photos="batchPhotos"
              :credit-balance="creditsStore.balance"
              :credits-per-photo="CREDITS_PER_PHOTO"
              :credits-to-spend="creditsToSpend"
              @photo-added="onPhotoAdded"
              @photo-removed="onPhotoRemoved"
              @confirm="onConfirmPreview"
              @retry-photo="onRetryPhoto"
              @stage-items="onStageDetected"
              @reset="resetScan"
            />
          </template>
        </div>

        <!-- right pane: session list -->
        <div class="ai-pane-right">
          <div class="ai-pane-right__header">
            <span class="ai-pane-right__title">Added this session</span>
            <span v-if="sessionItems.length > 0" class="ai-session-badge">
              {{ sessionItems.length }}
            </span>
          </div>

          <div class="ai-session-list">
            <div v-if="sessionItems.length === 0" class="ai-session-empty">
              <q-icon name="inventory_2" size="36px" />
              <span>No items yet — add one on the left</span>
            </div>

            <TransitionGroup v-else name="session-item" tag="div">
              <div v-for="(item, index) in sessionItems" :key="item.id" class="ai-session-item">
                <span class="ai-session-item__icon">
                  <q-icon name="widgets" size="14px" />
                </span>
                <div class="ai-session-item__body">
                  <div class="ai-session-item__name">{{ item.name }}</div>
                  <div v-if="item.description" class="ai-session-item__desc">
                    {{ item.description }}
                  </div>
                  <div v-if="item.tags.length > 0" class="ai-session-item__tags">
                    <span v-for="tag in item.tags" :key="tag" class="ai-session-tag">{{ tag }}</span>
                  </div>
                </div>
                <q-btn
                  flat
                  dense
                  class="ai-remove-btn"
                  icon="delete_outline"
                  size="sm"
                  title="Remove"
                  aria-label="Remove"
                  @click="removeSessionItem(index)"
                />
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>

      <!-- ── footer ────────────────────────────────────────────────────── -->
      <div class="ai-footer">
        <div class="ai-footer__count">
          <template v-if="sessionItems.length === 0">No items ready to save</template>
          <template v-else>
            <strong>{{ sessionItems.length }}</strong> item{{
              sessionItems.length !== 1 ? 's' : ''
            }}
            ready to add
          </template>
        </div>
        <div class="ai-footer__actions">
          <q-btn class="ai-btn ai-btn--ghost" flat no-caps label="Cancel" @click="handleClose" />
          <q-btn
            class="ai-btn ai-btn--primary"
            unelevated
            no-caps
            icon="check"
            label="Add to box"
            :disable="sessionItems.length === 0"
            :loading="isSaving"
            @click="saveAllItems"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { CREDITS_PER_PHOTO } from 'src/constants/credits'
import { useAddItemsSession } from 'src/composables/useAddItemsSession'
import ScanPaneDesktop from 'src/components/add-items/ScanPaneDesktop.vue'
import OutOfCreditsCard from 'src/components/OutOfCreditsCard.vue'

const TABS = [
  { name: 'hand', label: 'By Hand', icon: 'back_hand' },
  { name: 'scan', label: 'AI Scan', icon: 'center_focus_weak' },
]

const PRESET_TAGS = ['fragile', 'electronics', 'clothing', 'books', 'seasonal', 'tools']

const props = defineProps({
  boxId: { type: String, required: true },
  boxName: { type: String, default: '' },
})
const emit = defineEmits(['item-added'])

const isOpen = defineModel({ type: Boolean, default: false })

const nameInput = ref(null)
const activeTags = ref([])
const customTags = ref([])
const tagDraft = ref('')

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
  stageItems,
  onPhotoAdded,
  onPhotoRemoved,
  onConfirmPreview,
  onRetryPhoto,
  onPurchaseComplete,
  saveAllItems,
  handleClose,
  resetScan,
  reset,
} = useAddItemsSession({
  boxId: () => props.boxId,
  onSaved: () => emit('item-added'),
  onClose: () => {
    isOpen.value = false
  },
})

const allTags = computed(() => [...PRESET_TAGS, ...customTags.value])

const cycleTab = (dir) => {
  const idx = TABS.findIndex((t) => t.name === activeTab.value)
  activeTab.value = TABS[(idx + dir + TABS.length) % TABS.length].name
}

const toggleTag = (tag) => {
  const idx = activeTags.value.indexOf(tag)
  if (idx === -1) activeTags.value.push(tag)
  else activeTags.value.splice(idx, 1)
}

const commitTagDraft = () => {
  const tag = tagDraft.value.trim().toLowerCase()
  tagDraft.value = ''
  if (!tag) return
  if (!allTags.value.includes(tag)) customTags.value.push(tag)
  if (!activeTags.value.includes(tag)) activeTags.value.push(tag)
}

const handleAddToList = () => {
  commitTagDraft()
  if (addToList([...activeTags.value])) {
    activeTags.value = []
    nextTick(() => nameInput.value?.focus())
  }
}

/** Desktop: AI detections land on the session list rather than saving straight away. */
const onStageDetected = (items) => {
  stageItems(items)
  resetScan()
}

const onHide = () => {
  reset()
  activeTags.value = []
  customTags.value = []
  tagDraft.value = ''
}
</script>

<!-- Unscoped: QDialog content is teleported out of this component's DOM subtree. -->
<style>
.add-items-dialog .q-dialog__backdrop {
  background: rgba(0, 0, 0, 0.55);
}

.add-items-dialog .q-dialog__inner {
  padding: 32px;
}

.add-items-dialog .q-dialog__inner--minimized > .ai-modal {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  border-radius: 14px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  background: #fff;
}

/* ── header ─────────────────────────────────────────────────────────────── */
.ai-modal .ai-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid #efefef;
  flex-shrink: 0;
}
.ai-modal .ai-header__title {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  flex: 1;
}
.ai-modal .ai-header__box {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: #888;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 3px 9px;
  max-width: 220px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ai-modal .ai-close {
  width: 30px;
  height: 30px;
  min-height: 30px;
  background: #f4f4f5;
  color: #666;
  transition: background 0.15s;
}
.ai-modal .ai-close:hover {
  background: #e8e8ea;
  color: #111;
}

/* ── tab bar ────────────────────────────────────────────────────────────── */
.ai-modal .ai-tabbar {
  display: flex;
  padding: 12px 20px 0;
  gap: 4px;
  border-bottom: 1px solid #efefef;
  flex-shrink: 0;
}
.ai-modal .ai-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #888;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  border-radius: 6px 6px 0 0;
  transition: color 0.15s, border-color 0.15s;
}
.ai-modal .ai-tab:hover {
  color: #444;
}
.ai-modal .ai-tab--active {
  color: #1976d2;
  border-bottom-color: #1976d2;
  background: #f0f7ff;
}

/* ── body: the Option B grid ────────────────────────────────────────────── */
.ai-modal .ai-body {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.ai-modal .ai-pane-left {
  padding: 20px;
  border-right: 1px solid #efefef;
  background: #fcfcfd;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}
.ai-modal .ai-pane-right {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ai-modal .ai-pane-right__header {
  padding: 16px 20px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f5f5f5;
  flex-shrink: 0;
}
.ai-modal .ai-pane-right__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #aaa;
}
.ai-modal .ai-session-badge {
  background: #1976d2;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  padding: 1px 8px;
  min-width: 22px;
  text-align: center;
}
.ai-modal .ai-session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.ai-modal .ai-session-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: #ccc;
  font-size: 13px;
  padding: 32px 20px;
  text-align: center;
}
.ai-modal .ai-session-empty .q-icon {
  opacity: 0.3;
}
.ai-modal .ai-session-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 20px;
  border-bottom: 1px solid #f7f7f7;
  transition: background 0.1s;
}
.ai-modal .ai-session-item:hover {
  background: #fafafa;
}
.ai-modal .ai-session-item:last-child {
  border-bottom: none;
}
.ai-modal .ai-session-item__icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #e8f2ff;
  color: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.ai-modal .ai-session-item__body {
  flex: 1;
  min-width: 0;
}
.ai-modal .ai-session-item__name {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-modal .ai-session-item__desc {
  font-size: 12px;
  color: #999;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-modal .ai-session-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.ai-modal .ai-session-tag {
  font-size: 11px;
  background: #f0f4ff;
  color: #1976d2;
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 500;
}
.ai-modal .ai-remove-btn {
  color: #ccc;
  margin-top: 2px;
  padding: 2px;
  min-height: 0;
  border-radius: 4px;
}
.ai-modal .ai-remove-btn:hover {
  color: #e53935;
  background: #fff0f0;
}

/* ── footer ─────────────────────────────────────────────────────────────── */
.ai-modal .ai-footer {
  padding: 14px 20px;
  border-top: 1px solid #efefef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}
.ai-modal .ai-footer__count {
  font-size: 13px;
  color: #999;
  white-space: nowrap;
}
.ai-modal .ai-footer__count strong {
  color: #333;
  font-weight: 600;
}
.ai-modal .ai-footer__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ai-modal .ai-btn {
  height: 36px;
  min-height: 36px;
  padding: 0 16px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.ai-modal .ai-btn .q-icon {
  font-size: 15px;
}
.ai-modal .ai-btn--ghost {
  color: #666;
  border: 1.5px solid #e0e0e0;
}
.ai-modal .ai-btn--ghost:hover {
  background: #f5f5f5;
}
.ai-modal .ai-btn--primary {
  background: #1976d2;
  color: #fff;
}
.ai-modal .ai-btn--primary:hover {
  background: #1565c0;
}
.ai-modal .ai-btn--primary.disabled,
.ai-modal .ai-btn--primary[disabled] {
  background: #b0c8e8;
  opacity: 1 !important;
  cursor: default;
}

/* ── form controls (Quasar primitives restyled to the spec) ─────────────── */
.ai-modal .ai-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ai-modal .ai-field label,
.ai-modal .ai-field__label {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  letter-spacing: 0.01em;
}
.ai-modal .ai-input .q-field__control {
  height: auto;
  min-height: 34px;
  border-radius: 7px;
  background: #fff;
  padding: 0 10px;
}
.ai-modal .ai-input .q-field__control:before {
  border: 1.5px solid #e0e0e0;
  border-radius: 7px;
  transition: border-color 0.15s;
}
.ai-modal .ai-input .q-field__control:after {
  display: none;
}
.ai-modal .ai-input .q-field__control:hover:before {
  border-color: #ccc;
}
.ai-modal .ai-input.q-field--focused .q-field__control:before {
  border-color: #1976d2;
  border-width: 1.5px;
}
.ai-modal .ai-input.q-field--focused .q-field__control {
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}
.ai-modal .ai-input .q-field__native,
.ai-modal .ai-input .q-field__native::placeholder {
  font-size: 13px;
  line-height: 1.35;
}
.ai-modal .ai-input .q-field__native {
  color: #111;
  padding: 8px 0;
  min-height: 0;
}
.ai-modal .ai-input textarea.q-field__native {
  resize: none;
}
.ai-modal .ai-input .q-field__native::placeholder {
  color: #bbb;
}

.ai-modal .ai-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}
.ai-modal .ai-chip {
  margin: 0;
  padding: 4px 10px;
  height: auto;
  border-radius: 20px;
  border: 1.5px solid #e0e0e0;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  user-select: none;
  transition: all 0.12s;
}
.ai-modal .ai-chip:hover {
  border-color: #aaa;
  color: #333;
}
.ai-modal .ai-chip--active {
  background: #e8f2ff;
  border-color: #1976d2;
  color: #1976d2;
}

.ai-modal .ai-add-btn {
  width: 100%;
  height: 38px;
  min-height: 38px;
  border-radius: 7px;
  border: 1.5px dashed #c5d8f0;
  background: #f5f9ff;
  font-size: 13px;
  font-weight: 600;
  color: #1976d2;
  margin-top: 2px;
  transition: all 0.15s;
}
.ai-modal .ai-add-btn:hover {
  background: #e8f2ff;
  border-color: #1976d2;
}
.ai-modal .ai-add-btn.disabled {
  opacity: 0.4 !important;
}

/* session list transition */
.ai-modal .session-item-enter-active,
.ai-modal .session-item-leave-active {
  transition: all 0.2s ease;
}
.ai-modal .session-item-enter-from,
.ai-modal .session-item-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
.ai-modal .session-item-move {
  transition: transform 0.2s ease;
}
</style>
