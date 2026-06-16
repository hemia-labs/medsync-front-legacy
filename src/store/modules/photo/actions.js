import { DAPhotosService } from '../../../services/context/core-proccess-context';
import types from '../common/mutation-types';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import fnTypes from '../common/fn-types';

const actions = {

    async initPhotos({dispatch}, data) {
        dispatch(fnTypes.getTypeFiles)
        dispatch(fnTypes.getPhotos, data)
    },

    /**
     *  Función que permite LISTAR los tipo de foto
     * @param {*} param0 
     */
    async getTypeFiles({commit}) {
        let response = await DAPhotosService.getTypeFiles();
        if(response.success) {
            commit(types.SET_TYPE_PHOTO, response.data)
            commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_TYPE_PHOTO,[])
            commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

        /**
         *  Función que permite GUARDAR una foto
         * @param {*} param0 
         */
        async savePhoto({commit, dispatch},data) {
            let response = await DAPhotosService.savePhoto(data);
            if(response.success) {
                commit(types.SET_PHOTO_SAVE, response.data)
                commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel() )
                dispatch(fnTypes.getPhotos, data.id_person)
            }
            else {
                commit(types.SET_PHOTO_SAVE,{})
                commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel(true, response.message) )
            }
        },

        /**
         *  Función que permite OBTENER las fotos de un PX
         * @param {*} param0 
         */
        async getPhotos({commit},data) {
            let response = await DAPhotosService.getPhotos(data);
            if(response.success) {
                commit(types.SET_PHOTO_GET, response.data)
                commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel() )
            }
            else {
                commit(types.SET_PHOTO_GET,[])
                commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel(true, response.message) )
            }
        },

        /**
         *  Función que permite ELIMINAR las fotos de un PX
         * @param {*} param0 
         */
        async deletePhoto({commit, dispatch},data) {
            let response = await DAPhotosService.deletePhoto(data);
            if(response.success) {
                commit(types.SET_PHOTO_DELETE, response.data)
                commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel() )
                dispatch(fnTypes.getPhotos, data.id_person)
            }
            else {
                commit(types.SET_PHOTO_DELETE,[])
                commit(types.SET_PHOTO_CAT_EXCEPTION, new DAHasErrorModel(true, response.message) )
            }
        },
        
}

export default actions