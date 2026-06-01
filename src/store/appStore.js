import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import { familyEconomyApi } from './familyEconomyApi'

export const store = configureStore({
  reducer: {
    [familyEconomyApi.reducerPath]: familyEconomyApi.reducer,
  },
  middleware: (getDefaultMiddleware) => (
    getDefaultMiddleware().concat(familyEconomyApi.middleware)
  ),
})

setupListeners(store.dispatch)
