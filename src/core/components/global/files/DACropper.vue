<template>
    <div>
        <div v-if="!image" class="bg-primary-100 px-5 text-primary-700 font-sans rounded-sm">
             Selecciona un imagen para continuar
         </div>
        <small v-if="errorMessage" class="error-text">{{ errorMessage }}</small>
        <cropper
            ref="cropper"
            class="cropper mt-2"
            :src="image"
            :transitions="true"
            image-restriction="fit-area"
            :min-height="height"
            :min-width="width"
        >
        </cropper>
        <div class="mt-2 flex gap-5 justify-center items-center">
            <v-btn
            color="#F83D3D"
            dark
            fab
            @click="removeFile"
            >
            <v-icon>mdi-delete</v-icon>
           </v-btn>
           <v-btn
            color="#E7AC18"
            dark
            fab
             @click="$refs.file.click()"
            >
            <input ref="file" type="file" class="hidden" accept="image/*" @change="uploadImage($event)" />
            <v-icon>mdi-cloud-upload</v-icon>
           </v-btn>
           <v-btn
            color="green"
            dark
            fab
            @click="save"
            >
            <v-icon>mdi-content-save</v-icon>
           </v-btn>
       </div>
    </div>
</template>

<script>
import {Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import { resizeImage } from '../../../../utils/file';

export default {
        props: {
        open: {
            type: Boolean,
            default: false
        },
        height: {
            type: Number,
            default: 500
        },
        width: {
            type: Number,
            default: 500
        }
    },
    components: {
        Cropper
    },
    data: function() {
        return {
            isloading: false,
            image: '',
            file: null,
            imagen: '',
            errorMessage: ''
        }
	},
    methods: {
        save: async function() {
            if(this.$refs.cropper.getResult().canvas) {
                this.file = this.$refs.cropper.getResult().canvas.toDataURL();
                let resizedImage = await resizeImage(this.file);

                if(this.file) {
                    this.$emit('save', resizedImage);
                }
            }
    },
    uploadImage(event) {
			// Reference to the DOM input element
			var input = event.target;
			// Ensure that you have a file before attempting to read it
			if (input.files && input.files[0]) {
                const file = input.files[0];
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                const maxSize = 5 * 1024 * 1024;

                this.errorMessage = '';

                if (!allowedTypes.includes(file.type)) {
                    this.errorMessage = 'Formato no permitido. Usa JPG, PNG o WEBP.';
                    this.removeFile();
                    return;
                }

                if (file.size > maxSize) {
                    this.errorMessage = 'La imagen no debe superar 5 MB.';
                    this.removeFile();
                    return;
                }

				// create a new FileReader to read this image and convert to base64 format
				var reader = new FileReader();
				// Define a callback function to run, when FileReader finishes its job
                
				reader.onload = (e) => {
					// Note: arrow function used here, so that "this.imageData" refers to the imageData of Vue component
					// Read image as base64 and set to imageData
					this.image = e.target.result;
				};

				// Start the reader job - read file as a data url (base64 format)
				reader.readAsDataURL(file);
            
			}
		},
    removeFile() {
            this.image = null;
            this.$refs.file.value = '';
    }
}
        
}
</script>

<style lang="scss" scoped>
.cropper {
	height: 600px;
	background: #e9e8e8;
}

</style>
