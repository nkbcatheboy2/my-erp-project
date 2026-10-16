import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: fileURLToPath(new URL('./.env.local', import.meta.url)) })

const app = express()
const port = Number(process.env.PORT || 5000)
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: allowedOrigin }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_request, response) => {
  try {
    await mongoose.connection.db.admin().ping()
    response.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    console.error('MongoDB health check failed:', error)
    response.status(503).json({ status: 'error', database: 'unavailable' })
  }
})

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from server/.env.local.')
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  app.listen(port, () => {
    console.log(`ERP API listening on http://localhost:${port}`)
  })
}

start().catch((error) => {
  console.error('Could not start the ERP API:', error)
  process.exitCode = 1
})
