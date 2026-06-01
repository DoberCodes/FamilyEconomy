import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import authReducer from './authSlice'
import { familyEconomyApi } from './familyEconomyApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [familyEconomyApi.reducerPath]: familyEconomyApi.reducer,
  },
  middleware: (getDefaultMiddleware) => (
    getDefaultMiddleware().concat(familyEconomyApi.middleware)
  ),
})

setupListeners(store.dispatch)
