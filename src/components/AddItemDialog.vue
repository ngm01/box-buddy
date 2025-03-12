<template>
  <q-dialog v-model="isOpen">
    <q-card class="q-pa-md">
      <q-card-section>
        <div class="text-h6">Add Item</div>
      </q-card-section>

      <q-card-section>
        <q-input v-model="name" label="Item Name" outlined />
        <q-input v-model="description" label="Description" outlined type="textarea" />
      </q-card-section>

      <q-card-section class="row justify-center q-gutter-md">
        <q-btn @click="scanText" icon="camera_alt" label="OCR Scan" />
        <q-btn @click="scanBarcode" icon="qr_code_scanner" label="Scan Barcode" />
        <q-btn v-if="enableAI" @click="identifyImage" icon="image_search" label="AI Identify" />
      </q-card-section>

      <q-card-section v-if="previewText">
        <q-banner class="bg-green-2 q-pa-sm">Scanned Data: {{ previewText }}</q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn color="primary" @click="saveItem" label="Save" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
//import { BarcodeScanner } from '@capacitor/barcode-scanner';
import Tesseract from 'tesseract.js'
import { supabase } from '../utils/supabase'
import { useBoxesStore } from 'src/stores/boxes.store'
const boxesStore = useBoxesStore()
// Dialog visibility
const isOpen = ref(false)
const props = defineProps({
  boxId: {
    type: String,
    required: true,
  },
})
const emit = defineEmits(['item-added'])

// Form inputs
const name = ref('')
const description = ref('')
const previewText = ref('')
const enableAI = ref(false) // V2/Paid Feature

// Function to scan text via OCR
const scanText = async () => {
  try {
    const image = await captureImage()
    const { data } = await Tesseract.recognize(image, 'eng')
    previewText.value = data.text.trim()
    name.value = previewText.value
  } catch (error) {
    console.error('OCR Error:', error)
  }
}

// Function to scan barcode using Capacitor
const scanBarcode = async () => {
  try {
    // await BarcodeScanner.checkPermission({ force: true });

    // BarcodeScanner.hideBackground(); // Makes the background transparent for a better UI experience
    // const result = await BarcodeScanner.startScan();

    // if (result.hasContent) {
    //   title.value = result.content;
    //   previewText.value = `Barcode: ${result.content}`;
    // }
    console.log('Barcode Scanning goes here')
  } catch (error) {
    console.error('Barcode Scan Error:', error)
  }
}

// Function to use AI image recognition (V2 Feature)
const identifyImage = async () => {
  alert('AI Recognition is a paid feature and coming soon!')
}

// Function to save item to Supabase
const saveItem = async () => {
  const { data: itemData, error } = await supabase
    .from('items')
    .insert([{ name: name.value, description: description.value, box_id: props.boxId }])
    .select('id')
  if (error) {
    console.error('Error saving item:', error)
  } else {
    const itemId = itemData[0].id
    const { data: boxData } = await supabase.from('boxes').select('*').eq('id', props.boxId)
    if (boxData) {
      await boxesStore.updateBox(props.boxId, {
        ...boxData[0],
        items: [...boxData[0].items, itemId],
      })
    }
  }
  // close dialog and reset form
  isOpen.value = false
  name.value = ''
  description.value = ''
  previewText.value = ''

  emit('item-added')
}

// Utility function to capture an image (mock for now)
const captureImage = async () => {
  // Implement image capture via file input or Capacitor camera API in future
  //return 'path/to/sample-image.png'
  console.log('Image Capture goes here')
}

// Expose `isOpen` to be controlled from the parent component
defineExpose({ isOpen })
</script>

<style scoped>
.q-card {
  width: 400px;
  max-width: 90vw;
}
</style>
