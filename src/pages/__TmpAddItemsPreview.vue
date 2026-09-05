<template>
  <q-page class="q-pa-lg">
    <q-btn color="primary" label="Open" @click="dlg.isOpen = true" />
    <AddItemDialog ref="dlg" box-id="tmp" box-name="Winter Gear" />
  </q-page>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import AddItemDialog from 'src/components/AddItemDialog.vue'
const dlg = ref(null)
onMounted(() => { dlg.value.isOpen = true })
</script>
