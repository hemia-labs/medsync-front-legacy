<template>
   <da-dialog v-model="show" :persist="true">
    <template #body>
        <div class="bg-white rounded-lg">
            <div class="flex justify-end items-center">
                <svg xmlns="http://www.w3.org/2000/svg" @click="$emit('close')" class="icon icon-tabler icon-tabler-square-x text-gray-400 cursor-pointer" width="44" height="44" viewBox="0 0 24 24" stroke-width="1" stroke="#BDBDBD" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M10 10l4 4m0 -4l-4 4" />
                </svg>
            </div>
            <div class="px-5 pb-5 pt-1">
                <da-cropper v-on:save="(event) => $emit('save', event)"></da-cropper>
            </div>
        </div>
    </template>
   </da-dialog>
</template>

<script>
    export default {
        props: {
            show: Boolean
        },
    }
</script>

<style lang="scss" scoped>

</style>