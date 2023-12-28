import {createSlice} from '@reduxjs/toolkit'
import {initialStateHeroSection} from '../../../types'

export const heroSectionSlice = createSlice({
  name: 'heroSection',
  initialState: initialStateHeroSection,
  reducers: {
    setSavingHeroSection: (state, action) => {
      state.isSaving = true
    },
    setHeroSectionInfo: (state, action) => {
      //set infoSection
      state.info.imageSection = action.payload.find(
        (item) => item.id === 'imageSection',
      )
      state.info.textSection = action.payload.find(
        (item) => item.id === 'textSection',
      )
    },

    resetSavingHeroSection: (state, action) => {
      state.isSaving = false
    },
  },
})

// Action creators are generated for each case reducer function
export const {
  setHeroSectionInfo,
  setSavingHeroSection,
  resetSavingHeroSection,
} = heroSectionSlice.actions
