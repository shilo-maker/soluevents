import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link as LinkIcon,
  FileIcon,
  Upload,
  FolderOpen,
  AlertTriangle,
  Download,
  ExternalLink,
  Trash2,
  Loader2,
  X,
} from 'lucide-react'
import api from '@/lib/axios'
import { useEventFiles, useCreateLinkFile, useUploadFile, useDeleteFile, useUserStorage } from '@/hooks/useFiles'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import Badge from '@/components/Badge'
import type { FileCategory } from '@/types'

const FILE_CATEGORIES: FileCategory[] = ['rider', 'flyer', 'schedule', 'contract', 'media', 'other']

interface FilesTabProps {
  eventId: string
  canEdit: boolean
}

export default function FilesTab({ eventId, canEdit }: FilesTabProps) {
  const { t } = useTranslation()
  const { data: eventFiles } = useEventFiles(eventId)
  const createLinkFile = useCreateLinkFile(eventId)
  const uploadFile = useUploadFile(eventId)
  const deleteFileMutation = useDeleteFile(eventId)
  const { data: storageUsage } = useUserStorage()

  const [showLinkForm, setShowLinkForm] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkFilename, setLinkFilename] = useState('')
  const [linkCategory, setLinkCategory] = useState<FileCategory | ''>('')
  const [linkNotes, setLinkNotes] = useState('')
  const [uploadCategory, setUploadCategory] = useState<FileCategory | ''>('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [hasSelectedFile, setHasSelectedFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddLink = useCallback(async () => {
    try {
      await createLinkFile.mutateAsync({
        url: linkUrl,
        filename: linkFilename,
        category: linkCategory || undefined,
        notes: linkNotes || undefined,
      })
      setLinkUrl('')
      setLinkFilename('')
      setLinkCategory('')
      setLinkNotes('')
      setShowLinkForm(false)
    } catch {
      // Error displayed via mutation state
    }
  }, [linkUrl, linkFilename, linkCategory, linkNotes, createLinkFile])

  const handleUpload = useCallback(async () => {
    const fileEl = fileInputRef.current
    if (!fileEl?.files?.[0]) return
    const file = fileEl.files[0]
    if (file.size > 500 * 1024) {
      setUploadError(t('files.fileTooLarge'))
      return
    }
    setUploadError(null)
    try {
      await uploadFile.mutateAsync({
        file,
        category: uploadCategory || undefined,
        notes: uploadNotes || undefined,
      })
      setUploadCategory('')
      setUploadNotes('')
      setShowUploadForm(false)
      setHasSelectedFile(false)
      if (fileEl) fileEl.value = ''
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || t('files.uploadFailed'))
    }
  }, [uploadCategory, uploadNotes, uploadFile, t])

  const handleDownload = useCallback(async (fileId: string, filename: string) => {
    try {
      const res = await api.get(`/files/${fileId}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch {
      alert(t('files.downloadFailed'))
    }
  }, [t])

  const handleDelete = useCallback((fileId: string) => {
    if (deleteFileMutation.isPending) return
    if (confirm(t('files.deleteConfirm'))) {
      deleteFileMutation.mutate(fileId)
    }
  }, [deleteFileMutation, t])

  const categoryOptions = FILE_CATEGORIES.map((cat) => (
    <option key={cat} value={cat}>{t(`files.category.${cat}`)}</option>
  ))

  return (
    <div className="space-y-4">
      {/* Action buttons + storage bar */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              <button
                onClick={() => { setShowLinkForm(true); setShowUploadForm(false) }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                {t('files.addLink')}
              </button>
              <button
                onClick={() => { setShowUploadForm(true); setShowLinkForm(false) }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {t('files.uploadFile')}
              </button>
            </>
          )}
        </div>

        {/* Storage usage bar */}
        {storageUsage && storageUsage.limit > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storageUsage.used / storageUsage.limit > 0.8 ? 'bg-red-500' :
                  storageUsage.used / storageUsage.limit > 0.5 ? 'bg-yellow-500' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, (storageUsage.used / storageUsage.limit) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {t('files.storageUsed', { used: formatFileSize(storageUsage.used), limit: formatFileSize(storageUsage.limit) })}
            </span>
          </div>
        )}
      </div>

      {/* Add Link Form */}
      {showLinkForm && (
        <div className="card p-4 space-y-3 border-teal-200 border">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">{t('files.addLink')}</h4>
            <button onClick={() => { setShowLinkForm(false); setLinkUrl(''); setLinkFilename(''); setLinkCategory(''); setLinkNotes('') }} className="text-gray-400 hover:text-gray-600" aria-label={t('common.cancel')}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={t('files.urlPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <input
            type="text"
            value={linkFilename}
            onChange={(e) => setLinkFilename(e.target.value)}
            placeholder={t('files.filenamePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <div className="flex gap-2">
            <select
              value={linkCategory}
              onChange={(e) => setLinkCategory(e.target.value as FileCategory | '')}
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">{t('files.selectCategory')}</option>
              {categoryOptions}
            </select>
            <input
              type="text"
              value={linkNotes}
              onChange={(e) => setLinkNotes(e.target.value)}
              placeholder={t('files.notesPlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          {createLinkFile.isError && (
            <p className="text-xs text-red-600">
              {(createLinkFile.error as any)?.response?.data?.message || t('files.uploadFailed')}
            </p>
          )}
          <button
            disabled={!linkUrl || !linkFilename || createLinkFile.isPending}
            onClick={handleAddLink}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createLinkFile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.add')}
          </button>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="card p-4 space-y-3 border-gray-200 border">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">{t('files.uploadFile')}</h4>
            <button onClick={() => { setShowUploadForm(false); setUploadError(null); setUploadCategory(''); setUploadNotes(''); setHasSelectedFile(false); if (fileInputRef.current) fileInputRef.current.value = '' }} className="text-gray-400 hover:text-gray-600" aria-label={t('common.cancel')}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertTriangle className="w-3 h-3" />
            {t('files.maxFileSize')}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setHasSelectedFile(!!e.target.files?.[0])}
            className="w-full text-sm text-gray-500 file:me-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
          <div className="flex gap-2">
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as FileCategory | '')}
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">{t('files.selectCategory')}</option>
              {categoryOptions}
            </select>
            <input
              type="text"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder={t('files.notesPlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}
          <button
            disabled={uploadFile.isPending || !hasSelectedFile}
            onClick={handleUpload}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadFile.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('files.uploading')}</span>
            ) : t('files.uploadFile')}
          </button>
        </div>
      )}

      {/* File grid */}
      {eventFiles && eventFiles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {eventFiles.map((file) => (
            <div key={file.id} className="card p-3 flex flex-col items-center text-center group relative">
              {/* Actions (top-right corner) */}
              <div className="absolute top-1.5 end-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {file.file_type === 'link' ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title={t('files.openLink')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : !file.expired_at ? (
                  <button
                    onClick={() => handleDownload(file.id, file.filename)}
                    className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                    title={t('files.download')}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                ) : null}
                {canEdit && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                file.file_type === 'link' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {file.file_type === 'link' ? <LinkIcon className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
              </div>

              {/* Filename */}
              <span className="text-xs font-medium text-gray-900 truncate w-full">{file.filename}</span>

              {/* Badges */}
              <div className="flex items-center gap-1 flex-wrap justify-center mt-1">
                {file.category && (
                  <Badge variant="primary" size="sm">{t(`files.category.${file.category}`)}</Badge>
                )}
                {file.expired_at && (
                  <Badge variant="warning" size="sm">
                    <AlertTriangle className="w-3 h-3 me-1" />
                    {t('files.expired')}
                  </Badge>
                )}
              </div>

              {/* Meta */}
              <div className="text-[10px] text-gray-400 mt-1 truncate w-full">
                {file.file_type === 'upload' && file.file_size > 0
                  ? formatFileSize(file.file_size)
                  : file.uploader?.name || file.uploader?.email || ''}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">{t('files.noFiles')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('files.addLinkOrUpload')}</p>
        </div>
      )}
    </div>
  )
}
