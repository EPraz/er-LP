import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore/lite'
import {FirebaseDB} from '../../firebase/config'
import {
  handleError,
  resetIsCanceling,
  resetIsSaving,
  savingNewNote,
  setActiveNote,
  setActiveSection,
  setCanceling,
  setNotes,
  setPhotosToActiveNote,
  setSaving,
  updateNote,
} from './dashboardSlice'
import {fileUpload, loadNotes} from '../../helpers'
import {
  setEventsInfo,
  setExpeditionGroupInfo,
  setHeroSectionInfo,
  setHistoryInfo,
  setNavbarInfo,
  setOrganizationInfo,
  setProgramStructureInfo,
} from '../landingPage'
import {setFooterInfo} from '../landingPage/footer'

/**
 * Initiates the process of creating a new note in the Firestore database.
 * Dispatches actions to update the Redux store with the new note and set it as the active note.
 * @returns {Function} Async function that can be used as a Redux thunk.
 */
export const startNewNote = () => {
  return async (dispatch, getState) => {
    const {notes} = getState().dashboard

    // Dispatch the action to indicate that the new note is being saved
    dispatch(savingNewNote())

    // Extract the user ID from the authentication state in the Redux store
    const {uid} = getState().auth

    // Create a new note with initial values
    const newNote = {
      title: `Nota ${notes.length + 1}`,
      body: `Body ${notes.length + 1}`,
      date: new Date().toLocaleString(),
      imagesUrls: [],
    }

    // Reference to a new document in the user's "journal/notes" collection
    const newDoc = doc(collection(FirebaseDB, `${uid}/journal/notes`))

    try {
      // Attempt to set the document data in the Firestore database
      await setDoc(newDoc, newNote)

      // Update the new note with its ID generated by Firestore
      newNote.id = newDoc.id

      // Dispatch actions to update the Redux store
      // dispatch(addNewEmptyNote(newNote)) // Add the new note to the store
      dispatch(startLoadingNotes())
      dispatch(setActiveNote(newNote)) // Set the new note as the active note
    } catch (error) {
      dispatch(handleError(error.message))
      // Handle errors related to communication with the database
      throw new Error('Error guardando nueva entrada en la DB!', error)
    } finally {
      // Dispatch an action to reset the isSaving state
      dispatch(resetIsSaving())
    }
  }
}

/**
 * Initiates the process of loading notes from the Firestore database for the current user.
 * Dispatches actions to update the Redux store with the loaded notes.
 * @returns {Function} Async function that can be used as a Redux thunk.
 * @throws {Error} If the user ID (UID) is missing in the authentication state.
 */
export const startLoadingNotes = () => {
  // Extract the user ID from the authentication state in the Redux store
  return async (dispatch, getState) => {
    const {uid} = getState().auth

    // Throw an error if the user ID is missing
    if (!uid) throw new Error('El UID del usuario no existe!')

    // console.log({uid})

    try {
      const notes = await loadNotes(uid)
      dispatch(setNotes(notes))

      // Dispatch actions to update the Redux store with the loaded notes
      // Add your logic here based on how you handle note loading in your application
    } catch (error) {
      dispatch(handleError(error.message))
      // Handle errors related to loading notes from the database
      throw new Error('Error cargando notas de la DB!', error)
    }
  }
}

/**
 * Asynchronous action creator to save the active note to Firestore.
 * Dispatches actions to set the saving state, retrieves user and active note information,
 * updates the note in Firestore, and dispatches an action to update the note locally.
 * @returns {Function} Asynchronous function to be used with Redux Thunk middleware.
 * @throws {Error} Throws an error if there is an issue updating the note in Firestore.
 */
export const startSaveNotes = () => {
  return async (dispatch, getState) => {
    try {
      // Set the saving state to indicate that the note is being saved
      dispatch(setSaving())

      // Retrieve the user ID and active note from the application state
      const {uid} = getState().auth
      const {active: activeNote} = getState().dashboard

      // Create a copy of the active note without the 'id' property
      const noteToFireStore = {...activeNote}
      delete noteToFireStore.id

      // Construct the Firestore document reference for the active note
      const docRef = doc(FirebaseDB, `${uid}/journal/notes/${activeNote.id}`)

      // Update the note in Firestore, merging existing data if the document already exists
      await setDoc(docRef, noteToFireStore, {merge: true})

      // Dispatch an action to update the note locally
      // dispatch(updateNote(activeNote))
      dispatch(startLoadingNotes())
    } catch (error) {
      dispatch(handleError(error.message))
      // If an error occurs during the save process, throw an error
      throw new Error('Error actualizando Note!!', error)
    } finally {
      // Dispatch an action to reset the isSaving state
      dispatch(resetIsSaving())
    }
  }
}

/**
 * Initiates the uploading of multiple files and updates the active note with the corresponding photo URLs.
 *
 * @param {File[]} files - An array of File objects to be uploaded.
 * @returns {Promise<void>} A Promise that resolves once all files are successfully uploaded.
 * @throws {Error} Throws an error if there is an issue with file uploads.
 */
export const startUploadingFiles = (files = []) => {
  return async (dispatch, getState) => {
    try {
      // Dispatch an action to indicate that saving is in progress
      dispatch(setSaving())

      // Array to store promises for each file upload
      const fileUploadPromises = []

      // Iterate through each file and initiate file upload
      for (const file of files) {
        fileUploadPromises.push(fileUpload(file))
      }

      // Wait for all file uploads to complete
      const photosUrls = await Promise.all(fileUploadPromises)

      // Dispatch an action to set the photo URLs to the active note
      dispatch(setPhotosToActiveNote(photosUrls))
    } catch (error) {
      // Handle errors during file uploads
      dispatch(handleError(error.message))
      throw new Error('Error subiendo imagen!!', error.message)
    } finally {
      // Dispatch an action to reset the isSaving state
      dispatch(resetIsSaving())
    }
  }
}

/**
 * Initiates the process of deleting the currently active note.
 * This function dispatches actions to indicate that the deletion process has started,
 * deletes the corresponding note from the Firestore database, and updates the state
 * to reflect the removal of the note.
 *
 * @throws {Error} Throws an error if there is an issue with deleting the note or updating the state.
 */
export const startDeletingNote = () => {
  return async (dispatch, getState) => {
    try {
      // Dispatch an action to indicate that the saving process has started
      dispatch(setSaving())

      // Retrieve the user ID from the authentication state
      const {uid} = getState().auth

      // Retrieve the currently active note from the dashboard state
      const {active: noteActive} = getState().dashboard

      // Construct the Firestore document reference for the active note
      const docRef = doc(FirebaseDB, `${uid}/journal/notes/${noteActive.id}`)

      // Delete the note from the Firestore database
      await deleteDoc(docRef)

      // Dispatch an action to update the state, indicating the deletion of the note
      // dispatch(deleteNoteById(noteActive.id))
      dispatch(startLoadingNotes())
    } catch (error) {
      // Dispatch an action to handle and display the error
      dispatch(handleError(error.message))

      // Throw an error to indicate the failure of the deletion process
      throw new Error('Error eliminando nota!!', error.message)
    }
  }
}

export const resetInfo = (section = '', cancelled = true) => {
  return async (dispatch, getState) => {
    try {
      console.log(cancelled)
      if (cancelled) {
        dispatch(setCanceling())
      }
      // Reference to the Firestore collection containing user's notes
      const docRef = doc(FirebaseDB, `er_landing_page/${section}`)

      const docSnap = await getDoc(docRef)

      const infoReset = docSnap.data()

      const idToDispatchMap = {
        /* Corresponding dispatch action for 'navbar' */
        navbar: setNavbarInfo,
        /* Corresponding dispatch action for 'hero_section' */
        heroSection: setHeroSectionInfo, // is special because it has a collection inside
        /* Corresponding dispatch action for 'historia' */
        history: setHistoryInfo,
        /* Corresponding dispatch action for 'program_structure' */
        programStructure: setProgramStructureInfo,
        /* Corresponding dispatch action for 'expedition_group' */
        expeditionGroup: setExpeditionGroupInfo,
        /* Corresponding dispatch action for 'events' */
        events: setEventsInfo,
        /* Corresponding dispatch action for 'organization' */
        organization: setOrganizationInfo,
        /* Corresponding dispatch action for 'footer' */
        footer: setFooterInfo,
      }

      const dispatchAction = idToDispatchMap[section]
      if (dispatchAction) {
        dispatch(dispatchAction(infoReset))
        dispatch(setActiveSection(infoReset))
        if (cancelled) {
          dispatch(resetIsCanceling())
        }
      }
    } catch (error) {
      // Handle errors during file uploads
      dispatch(handleError(error.message))
      throw new Error('Error reseteando la informacion!!', error.message)
    }
  }
}
