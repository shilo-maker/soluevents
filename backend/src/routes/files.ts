import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { authenticate } from '../middleware/auth'
import {
  getEventFiles,
  createFile,
  deleteFile,
  downloadFile,
  getUserStorage,
} from '../controllers/fileController'

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll',
  '.com', '.scr', '.pif', '.vbs', '.vbe', '.js', '.jse',
  '.wsf', '.wsh', '.hta', '.cpl', '.jar',
]

const uploadsDir = path.join(__dirname, '../../uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 }, // 500KB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      cb(new Error('File type not allowed'))
      return
    }
    cb(null, true)
  },
})

const router = Router()

router.use(authenticate)

router.get('/storage/me', getUserStorage)
router.get('/events/:eventId', getEventFiles)
router.post('/events/:eventId', upload.single('file'), createFile)
router.delete('/:id', deleteFile)
router.get('/:id/download', downloadFile)

export default router
