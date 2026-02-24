import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onChange: (file: File | null) => void
  initialUrl?: string
}

export default function PlayerPictureInput({ onChange, initialUrl }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null)

  // Canvas / drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const scaleRef = useRef<HTMLInputElement>(null)
  const rafRef = useRef<number | null>(null)
  const stopRef = useRef(false)

  const positionOfCorner = useRef({ x: 0, y: 0 })
  const mousePosition = useRef({ x: 0, y: 0 })
  const lastMousePosition = useRef({ x: 0, y: 0 })
  const center = useRef({ x: 0, y: 0 })
  const drawingPoint = useRef({ x: 0, y: 0 })
  const imageSize = useRef({ width: 0, height: 0 })
  const scaleFactor = useRef(1)
  const lastScale = useRef(1)
  const mouseDown = useRef(false)

  // ─── Reset drawing state ───────────────────────────────────────────────────
  const resetValues = useCallback(() => {
    stopRef.current = false
    if (scaleRef.current) scaleRef.current.value = '1'
    lastScale.current = 1
    scaleFactor.current = 1
    positionOfCorner.current = { x: 0, y: 0 }
    mousePosition.current = { x: 0, y: 0 }
    lastMousePosition.current = { x: 0, y: 0 }
    center.current = { x: 0, y: 0 }
    drawingPoint.current = { x: 0, y: 0 }
  }, [])

  // ─── Draw loop ─────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    const scale = scaleRef.current
    if (!canvas || !img || !scale) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width: iw, height: ih } = imageSize.current
    const sf = parseFloat(scale.value) / lastScale.current
    scaleFactor.current = sf

    ctx.clearRect(
      drawingPoint.current.x,
      drawingPoint.current.y,
      iw * sf,
      ih * sf
    )

    if (mouseDown.current) {
      positionOfCorner.current.x = mousePosition.current.x - lastMousePosition.current.x
      positionOfCorner.current.y = mousePosition.current.y - lastMousePosition.current.y
    }

    drawingPoint.current.x = center.current.x - (iw * sf) / 2 + positionOfCorner.current.x
    drawingPoint.current.y = center.current.y - (ih * sf) / 2 + positionOfCorner.current.y

    ctx.drawImage(img, drawingPoint.current.x, drawingPoint.current.y, iw * sf, ih * sf)

    if (!stopRef.current) {
      rafRef.current = window.requestAnimationFrame(draw)
    }
  }, [])

  // ─── Init canvas with loaded image ────────────────────────────────────────
  const initCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    resetValues()
    imageSize.current = { width: img.width, height: img.height }
    canvas.width = img.width
    canvas.height = img.width // square crop
    center.current = { x: canvas.width / 2, y: canvas.height / 2 }

    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    ctx?.drawImage(img, 0, 0, img.width, img.height)

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = window.requestAnimationFrame(draw)
  }, [resetValues, draw])

  // ─── Canvas mouse/touch events ────────────────────────────────────────────
  const getCanvasRect = () => canvasRef.current?.getBoundingClientRect() ?? new DOMRect()

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = getCanvasRect()
    if ('touches' in e) {
      mousePosition.current.x = e.touches[0].clientX - rect.left
      mousePosition.current.y = e.touches[0].clientY - rect.top
    }
    mouseDown.current = true
    lastMousePosition.current.x = mousePosition.current.x - positionOfCorner.current.x
    lastMousePosition.current.y = mousePosition.current.y - positionOfCorner.current.y
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    mouseDown.current = false
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const rect = getCanvasRect()
    if ('touches' in e) {
      mousePosition.current.x = e.touches[0].clientX - rect.left
      mousePosition.current.y = e.touches[0].clientY - rect.top
    } else {
      mousePosition.current.x = e.clientX - rect.left
      mousePosition.current.y = e.clientY - rect.top
    }
  }, [])

  // ─── File input handler ───────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const img = imageRef.current
      if (!img) return
      img.src = reader.result as string
      img.onload = () => {
        setModalOpen(true)
        initCanvas(img)
      }
    })
    reader.readAsDataURL(file)
  }

  // ─── Confirm crop ─────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    stopRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const dataUrl = canvas.toDataURL()
    setPreviewUrl(dataUrl)
    setModalOpen(false)

    // Convert dataURL to File and bubble up
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    const u8arr = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i)
    const file = new File([u8arr], 'player.png', { type: mime })
    onChange(file)
  }

  const handleCancel = () => {
    stopRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setModalOpen(false)
  }

  // Close modal on outside click
  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleCancel()
  }

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      {/* Hidden image used as canvas source */}
      <img
        ref={imageRef}
        id="uploaded_image"
        style={{ display: 'none' }}
        alt=""
      />

      {/* Preview + click to change */}
      <div className="container-form">
        <input
          id="selectedFile"
          className="disp-none"
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          onChange={handleFileChange}
        />
        <img
          className="u-img-cropped-input u-img-cropped--blue"
          src={previewUrl ?? ''}
          id="upload-aphoto"
          onClick={() => document.getElementById('selectedFile')?.click()}
          style={{ cursor: 'pointer' }}
          alt="Player"
        />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          id="Modal"
          className="modal"
          style={{ display: 'block' }}
          onClick={handleModalBackdropClick}
        >
          <div className="modal_content">
            <div className="modal_header">
              <h4>Acrescenta uma fotografia</h4>
              <span className="closeModal" onClick={handleCancel}>&times;</span>
            </div>

            <div className="modal_body">
              <div className="like_modal">
                <div className="like_modal_container">
                  <div className="container-image container-canvas">
                    <canvas
                      ref={canvasRef}
                      className="player_input_image u-img-cropped-input u-img-cropped--blue"
                      id="canvas"
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onMouseMove={handleMouseMove}
                      onMouseOver={handleMouseUp}
                      onTouchStart={handleMouseDown}
                      onTouchEnd={handleMouseUp}
                      onTouchMove={handleMouseMove}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal_footer">
              <div className="player_input_image_footer">
                <input
                  ref={scaleRef}
                  type="range"
                  id="picture_scale"
                  min="0.5"
                  max="5"
                  step="0.01"
                  defaultValue="1"
                />
                <div className="player_input_image_footer_button">
                  <button
                    className="btn-secondary btn"
                    type="button"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-success btn"
                    type="button"
                    onClick={handleConfirm}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
