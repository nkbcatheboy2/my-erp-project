const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId)

let firebaseInstance

export function getFirebase() {
  if (!firebaseReady) {
    return Promise.reject(new Error('Firebase is not configured.'))
  }

  if (!firebaseInstance) {
    firebaseInstance = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore/lite'),
    ]).then(async ([appSdk, authSdk, firestoreSdk]) => {
      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(config)
      const auth = authSdk.getAuth(app)
      await authSdk.setPersistence(auth, authSdk.browserLocalPersistence)
      return {
        app,
        auth,
        db: firestoreSdk.getFirestore(app),
        authSdk,
        firestoreSdk,
      }
    }).catch((error) => {
      firebaseInstance = null
      throw error
    })
  }

  return firebaseInstance
}

let fullFirestoreInstance

export async function getTransactionalFirestore() {
  const { app } = await getFirebase()
  if (!fullFirestoreInstance) {
    fullFirestoreInstance = import('firebase/firestore').then((firestoreSdk) => ({
      db: firestoreSdk.getFirestore(app),
      firestoreSdk,
    })).catch((error) => {
      fullFirestoreInstance = null
      throw error
    })
  }
  return fullFirestoreInstance
}
