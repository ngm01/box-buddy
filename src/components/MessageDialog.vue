<template>
  <q-dialog v-model="isOpen" :persistent="persistent" @hide="$emit('hide')">
    <q-card class="message-dialog" role="alertdialog" :aria-labelledby="titleId">
      <h3 :id="titleId" class="message-dialog__title">{{ title }}</h3>
      <p class="message-dialog__body">{{ message }}</p>
      <div class="message-dialog__actions">
        <slot name="actions" />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useId } from 'vue'

defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  persistent: { type: Boolean, default: false },
})
defineEmits(['hide'])

const isOpen = defineModel({ type: Boolean, default: false })
const titleId = useId()
</script>

<style scoped>
.message-dialog {
  width: 100%;
  max-width: 340px;
  border-radius: 12px;
  padding: 22px 22px 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}
.message-dialog__title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.3;
}
.message-dialog__body {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.4;
  color: #555;
}
.message-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 18px;
}
</style>
