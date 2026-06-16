const getters = {
    getTypeFiles:   state => state.isGetTypePhoto,
    savePhoto:      state => state.isSavePhoto,
    getPhotos:      state => state.isGetPhoto,
    deletePhoto:    state => state.isDeletePhoto,
    hasErrorPhoto:  state => state.hasErrorPhoto,
    listaFotos:  state => state.isGetPhoto.find(x => x.code == "C4CA42") ? state.isGetPhoto.find(x => x.code == "C4CA42").child : [],
    listaRayosX:  state => state.isGetPhoto.find(x => x.code ==  "C81E72") ? state.isGetPhoto.find(x => x.code ==  "C81E72").child : [],
}

export default getters