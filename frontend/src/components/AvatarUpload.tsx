import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import type { Area } from 'react-easy-crop'
import Avatar from './Avatar'
import AvatarCropModal from './AvatarCropModal'
import { compressAvatar } from '@/lib/imageUtils'

interface AvatarUploadProps {
  src?: string | null
  name: string
  onUpload: (base64: string) => void
  onRemove: () => void
  loading?: boolean
}

export default function AvatarUpload({ src, name, onUpload, onRemove, loading }: AvatarUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so same file can be re-selected
    e.target.value = ''

    if (!file.type.startsWith('image/')) return

    // Read as data URL (more reliable than blob URLs for react-easy-crop)
    const reader = new FileReader()
    reader.onload = () => {
      setCropFile(file)
      setCropImageUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = async (croppedAreaPixels: Area) => {
    if (!cropFile) return

    setCropImageUrl(null)

    setCompressing(true)
    try {
      const base64 = await compressAvatar(cropFile, 128, 0.6, croppedAreaPixels)
      onUpload(base64)
    } catch (err) {
      console.error('Failed to compress image:', err)
    } finally {
      setCompressing(false)
      setCropFile(null)
    }
  }

  const handleCropCancel = () => {
    setCropImageUrl(null)
    setCropFile(null)
  }

  const busy = loading || compressing

  return (
    <div className="flex items-center gap-4">
      <Avatar src={src} name={name} size="lg" />

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {t('avatarUpload.changePhoto')}
        </button>
        {src && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {t('avatarUpload.removePhoto')}
          </button>
        )}
      </div>

      {cropImageUrl && (
        <AvatarCropModal
          imageUrl={cropImageUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
