"use client"

import * as React from "react"
import { Upload, Trash2, ArrowUp, ArrowDown, Star, Loader2, Maximize2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ProductImage,
  getProductImages,
  uploadProductImages,
  deleteProductImage,
  reorderProductImages,
  setAsMainProductImage
} from "@/app/(dashboard)/products/actions"

interface ProductImagesProps {
  productId: string
}

export default function ProductImages({ productId }: ProductImagesProps) {
  const [images, setImages] = React.useState<ProductImage[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState("")
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Cargar imágenes desde la BD
  const loadImages = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg("")
    try {
      const res = await getProductImages(productId)
      if (res.success && res.images) {
        setImages(res.images)
      } else {
        setErrorMsg(res.error || "Error al cargar las imágenes del producto.")
      }
    } catch (e) {
      console.error("Error loading images:", e)
      setErrorMsg("Ocurrió un error inesperado al recuperar la galería.")
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  React.useEffect(() => {
    if (productId) {
      loadImages()
    }
  }, [productId, loadImages])

  // Subida de imágenes
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setErrorMsg("")

    const formData = new FormData()
    // Validaciones básicas antes de enviar
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`El archivo ${file.name} supera el límite de 10 MB.`)
        setIsUploading(false)
        return
      }
      formData.append("files", file)
    }

    try {
      const res = await uploadProductImages(productId, formData)
      if (res.success) {
        loadImages()
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else {
        setErrorMsg(res.error || "Ocurrió un error al subir las imágenes.")
      }
    } catch (e) {
      console.error("Error uploading files:", e)
      setErrorMsg("Error al conectar con el servidor para subir las imágenes.")
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Eliminar una imagen
  const handleDelete = async (imageId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta imagen del producto?")) return

    setActionLoadingId(imageId)
    setErrorMsg("")

    try {
      const res = await deleteProductImage(imageId)
      if (res.success) {
        loadImages()
      } else {
        setErrorMsg(res.error || "Error al eliminar la imagen.")
      }
    } catch (e) {
      console.error("Error deleting image:", e)
      setErrorMsg("Ocurrió un error al intentar eliminar la imagen.")
    } finally {
      setActionLoadingId(null)
    }
  }

  // Reordenar imágenes (mover arriba/abajo)
  const handleReorder = async (imageId: string, direction: "up" | "down") => {
    setActionLoadingId(`${imageId}-${direction}`)
    setErrorMsg("")

    try {
      const res = await reorderProductImages(imageId, direction)
      if (res.success) {
        loadImages()
      } else {
        setErrorMsg(res.error || "Error al reordenar las imágenes.")
      }
    } catch (e) {
      console.error("Error reordering images:", e)
      setErrorMsg("Ocurrió un error al guardar el nuevo orden.")
    } finally {
      setActionLoadingId(null)
    }
  }

  // Establecer como principal
  const handleSetMain = async (imageId: string) => {
    setActionLoadingId(`${imageId}-main`)
    setErrorMsg("")

    try {
      const res = await setAsMainProductImage(imageId)
      if (res.success) {
        loadImages()
      } else {
        setErrorMsg(res.error || "Error al cambiar la imagen principal.")
      }
    } catch (e) {
      console.error("Error setting main image:", e)
      setErrorMsg("Ocurrió un error al actualizar la imagen principal.")
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Imágenes del Producto</CardTitle>
          <CardDescription>
            Sube fotos en formato JPG, PNG o WEBP (máx 10 MB por archivo). La primera imagen es la principal.
          </CardDescription>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
          />
          <Button
            type="button"
            onClick={triggerFileInput}
            disabled={isUploading || isLoading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Subir Imágenes
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Cargando galería...</span>
          </div>
        ) : images.length === 0 ? (
          <div
            onClick={triggerFileInput}
            className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 cursor-pointer text-muted-foreground text-center"
          >
            <Upload className="h-10 w-10 mb-2 text-muted-foreground/60" />
            <p className="font-semibold text-sm">No hay imágenes para este producto</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Haz clic aquí para seleccionar y subir fotos</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Imagen Principal y Galería combinadas en grid responsivo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image, index) => {
                const isMain = image.sort_order === 0
                const isItemLoading =
                  actionLoadingId === image.id ||
                  actionLoadingId === `${image.id}-up` ||
                  actionLoadingId === `${image.id}-down` ||
                  actionLoadingId === `${image.id}-main`

                return (
                  <div
                    key={image.id}
                    className={cn(
                      "group relative flex flex-col rounded-xl overflow-hidden bg-muted/30 border transition-all duration-200",
                      isMain
                        ? "border-primary/60 shadow-md ring-1 ring-primary/20 col-span-2 row-span-2 sm:col-span-2 sm:row-span-2 md:col-span-2 md:row-span-2"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    {/* Contenedor de la Imagen */}
                    <div
                      className={cn(
                        "relative flex items-center justify-center bg-zinc-950 overflow-hidden cursor-pointer",
                        isMain ? "aspect-video sm:aspect-square" : "aspect-square"
                      )}
                      onClick={() => setPreviewImage(image.image_url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.image_url}
                        alt={`Imagen del producto ${index + 1}`}
                        className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Overlay con lupa en hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <Maximize2 className="h-6 w-6 text-white" />
                      </div>

                      {/* Badge de Imagen Principal */}
                      {isMain && (
                        <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Star className="h-3 w-3 fill-current" /> Principal
                        </div>
                      )}

                      {/* Spinner de acción */}
                      {isItemLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    {/* Controles de la Imagen */}
                    <div className="flex items-center justify-between p-2.5 bg-card border-t border-border mt-auto">
                      <div className="flex gap-1">
                        {/* Botón Principal (Estrellita) */}
                        {!isMain && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isItemLoading || isUploading}
                            onClick={() => handleSetMain(image.id)}
                            title="Establecer como principal"
                            className="h-7 w-7 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Botón Reordenar Arriba */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isItemLoading || isUploading || index === 0}
                          onClick={() => handleReorder(image.id, "up")}
                          title="Mover anterior"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>

                        {/* Botón Reordenar Abajo */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isItemLoading || isUploading || index === images.length - 1}
                          onClick={() => handleReorder(image.id, "down")}
                          title="Mover siguiente"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Botón Eliminar */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isItemLoading || isUploading}
                        onClick={() => handleDelete(image.id)}
                        title="Eliminar imagen"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Lightbox / Modal de vista previa */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none flex items-center justify-center">
          {previewImage && (
            <div className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg bg-zinc-950/95 flex items-center justify-center border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Vista previa ampliada"
                className="object-contain max-h-[80vh] max-w-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
