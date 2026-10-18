const resizeImage = (base64Str, maxWidth = 500, maxHeight = 500, outputType = 'image/png', quality = 0.92) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onerror = () => reject(new Error('No se pudo abrir la imagen.'))
        img.onload = () => {
            try {
                if(!img.width || !img.height || !Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || maxWidth <= 0 || maxHeight <= 0) throw new Error('Dimensiones de imagen inválidas.')
                const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
                const width = Math.max(1, Math.round(img.width * scale))
                const height = Math.max(1, Math.round(img.height * scale))
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if(!ctx) throw new Error('No se pudo preparar la imagen.')
                ctx.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL(outputType, quality))
            } catch(error) { reject(error) }
        }
        img.src = base64Str
    })
}

export { resizeImage }
