<template>
  <!--
    Presentation branches at the top level:
      • desktop web  → centred two-pane dialog (design_handoff_add_items_modal)
      • everything else (narrow viewports, native shell) → existing slide-up drawer
    Shared state/behaviour lives in useAddItemsSession so the drawer path is unchanged.
  -->
  <AddItemsDesktopDialog
    v-if="isDesktopLayout"
    v-model="isOpen"
    :box-id="boxId"
    :box-name="boxName"
    @item-added="emit('item-added')"
  />
  <AddItemsMobileSheet
    v-else
    v-model="isOpen"
    :box-id="boxId"
    :box-name="boxName"
    @item-added="emit('item-added')"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import AddItemsDesktopDialog from 'src/components/add-items/AddItemsDesktopDialog.vue'
import AddItemsMobileSheet from 'src/components/add-items/AddItemsMobileSheet.vue'

defineProps({
  boxId: { type: String, required: true },
  boxName: { type: String, default: '' },
})
const emit = defineEmits(['item-added'])

const $q = useQuasar()

// gt.sm === viewport ≥ 1024px. The native app shell always keeps the drawer.
const isDesktopLayout = computed(() => $q.screen.gt.sm && !$q.platform.is.nativeMobile)

const isOpen = ref(false)

defineExpose({ isOpen })
</script>
