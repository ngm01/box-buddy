# ESLint errors

Resolve the following 13 ESLint errors one at a time. Produce a summary of work done on completion.

[ESLint] 'useRouter' is defined but never used. (no-unused-vars)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:187:20

    185 | import { ref, onMounted } from 'vue'
    186 | //import { useBoxesStore } from 'src/stores/boxes.store'

> 187 | import { useRoute, useRouter } from 'vue-router'

        |                    ^^^^^^^^^
    188 | //import { storeToRefs } from 'pinia'
    189 | import AddItemDialog from 'src/components/AddItemDialog.vue'
    190 | import QRCodeDialog from 'src/components/QRCodeDialog.vue'

[ESLint] 'useBoxesStore' is defined but never used. (no-unused-vars)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:191:10

    189 | import AddItemDialog from 'src/components/AddItemDialog.vue'
    190 | import QRCodeDialog from 'src/components/QRCodeDialog.vue'

> 191 | import { useBoxesStore } from 'src/stores/boxes.store'

        |          ^^^^^^^^^^^^^
    192 | import { useItemsStore } from 'src/stores/items.store'
    193 |
    194 | const route = useRoute()

[ESLint] 'useItemsStore' is defined but never used. (no-unused-vars)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:192:10

    190 | import QRCodeDialog from 'src/components/QRCodeDialog.vue'
    191 | import { useBoxesStore } from 'src/stores/boxes.store'

> 192 | import { useItemsStore } from 'src/stores/items.store'

        |          ^^^^^^^^^^^^^
    193 |
    194 | const route = useRoute()
    195 | const box = ref(null)

[ESLint] 'isLoading' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:249:3

    247 |
    248 | const fetchBoxDetails = async () => {

> 249 | isLoading.value = true

        |   ^^^^^^^^^
    250 |   pageState.value = 'ready'
    251 |
    252 |   try {

[ESLint] 'pageState' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:250:3

    248 | const fetchBoxDetails = async () => {
    249 |   isLoading.value = true

> 250 | pageState.value = 'ready'

        |   ^^^^^^^^^
    251 |
    252 |   try {
    253 |     const { id, display_name, box_name } = route.params

[ESLint] 'supabase' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:255:20

    253 |     const { id, display_name, box_name } = route.params
    254 |

> 255 | let boxQuery = supabase.from('boxes').select('\*')

        |                    ^^^^^^^^
    256 |
    257 |     if (id) {
    258 |       boxQuery = boxQuery.eq('id', id)

[ESLint] 'boxError' is assigned a value but never used. (no-unused-vars)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:266:35

    264 |     }
    265 |

> 266 | const { data: boxData, error: boxError } = await boxQuery.single()

        |                                   ^^^^^^^^
    267 |
    268 | const fetchItems = async () => {
    269 |   if (!box.value?.id) return

[ESLint] 'itemsStore' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:270:23

    268 | const fetchItems = async () => {
    269 |   if (!box.value?.id) return

> 270 | items.value = await itemsStore.fetchItemsByBox(box.value.id, itemSearch.value)

        |                       ^^^^^^^^^^
    271 | }
    272 |
    273 | const handleItemSearch = () => {

[ESLint] 'handleItemSearch' is assigned a value but never used. (no-unused-vars)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:273:7

    271 | }
    272 |

> 273 | const handleItemSearch = () => {

        |       ^^^^^^^^^^^^^^^^
    274 |   if (itemSearchDebounce) {
    275 |     clearTimeout(itemSearchDebounce)
    276 |   }

[ESLint] 'router' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:284:13

    282 |
    283 |     if (!id && display_name && box_name) {

> 284 | await router.replace(`/boxes/${encodeURIComponent(boxData.id)}`)

        |             ^^^^^^
    285 |     }
    286 |
    287 |     const { data: itemsData, error: itemsError } = await supabase

[ESLint] 'itemsData' is assigned a value but never used. (no-unused-vars)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:287:19

    285 |     }
    286 |

> 287 | const { data: itemsData, error: itemsError } = await supabase

        |                   ^^^^^^^^^
    288 |       .from('items')
    289 |       .select('*')
    290 |       .eq('box_id', box.value.id)

[ESLint] 'supabase' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:287:58

    285 |     }
    286 |

> 287 | const { data: itemsData, error: itemsError } = await supabase

        |                                                          ^^^^^^^^
    288 |       .from('items')
    289 |       .select('*')
    290 |       .eq('box_id', box.value.id)

[ESLint] 'pageState' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:293:7

    291 |
    292 |     if (itemsError) {

> 293 | pageState.value = 'error'

        |       ^^^^^^^^^
    294 |       return
    295 |     }
    296 |   } catch (error) {

[ESLint] 'boxesStore' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:301:11

    299 |
    300 |   try {

> 301 | await boxesStore.updateBox(box.value.id, {

        |           ^^^^^^^^^^
    302 |       name: boxDraft.value.name,
    303 |       description: boxDraft.value.description,
    304 |       access_level: boxDraft.value.access_level,

[ESLint] 'itemsStore' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:326:11

    324 | const saveItem = async () => {
    325 |   try {

> 326 | await itemsStore.updateItem(itemToEdit.value.id, {

        |           ^^^^^^^^^^
    327 |       name: itemToEdit.value.name,
    328 |       description: itemToEdit.value.description,
    329 |       tags: itemToEdit.value.tags,

[ESLint] 'fetchItems' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:331:11

    329 |       tags: itemToEdit.value.tags,
    330 |     })

> 331 | await fetchItems()

        |           ^^^^^^^^^^
    332 |     editItemDialog.value = false
    333 |   } catch (error) {
    334 |     console.error('Error saving item:', error)

[ESLint] 'itemsStore' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:345:11

    343 | const deleteItem = async () => {
    344 |   try {

> 345 | await itemsStore.deleteItem(itemToDelete.value)

        |           ^^^^^^^^^^
    346 |     deleteDialog.value = false
    347 |     await fetchItems()
    348 |   } catch (error) {

[ESLint] 'fetchItems' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:347:11

    345 |     await itemsStore.deleteItem(itemToDelete.value)
    346 |     deleteDialog.value = false

> 347 | await fetchItems()

        |           ^^^^^^^^^^
    348 |   } catch (error) {
    349 |     console.error('Error deleting item:', error)
    350 |   }

[ESLint] 'fetchItems' is not defined. (no-undef)

/Users/nathanielmoore/Desktop/box-buddy/src/pages/BoxDetailPage.vue:355:9

    353 | onMounted(async () => {
    354 |   await fetchBoxDetails()

> 355 | await fetchItems()

        |         ^^^^^^^^^^
    356 | })
    357 | </script>
    358 |
