import { createSelector } from '@reduxjs/toolkit'

export const selectAuthState = (state) => state.auth

export const selectIsParentAuthenticated = createSelector(
  [selectAuthState],
  (auth) => Boolean(auth?.isAuthenticated && auth?.userRole === 'parent'),
)

export const selectHasCompleteParentProfile = createSelector(
  [selectAuthState],
  (auth) => Boolean(auth?.familyId && auth?.userRole),
)

export const selectShouldRedirectToParentHome = createSelector(
  [selectAuthState],
  (auth) => (
    !auth?.loading
    && Boolean(auth?.isAuthenticated)
    && Boolean(auth?.familyId)
    && Boolean(auth?.userRole)
  ),
)

export const selectShouldCompleteProfile = createSelector(
  [selectAuthState],
  (auth) => !auth?.loading && Boolean(auth?.isAuthenticated) && (!auth?.familyId || !auth?.userRole),
)

export function isParentAuthenticatedSnapshot(auth = {}) {
  return Boolean(auth.isAuthenticated && auth.userRole === 'parent')
}

export function shouldRedirectToParentHomeSnapshot(auth = {}) {
  return (
    !auth.loading
    && Boolean(auth.isAuthenticated)
    && Boolean(auth.familyId)
    && Boolean(auth.userRole)
  )
}

export function shouldCompleteProfileSnapshot(auth = {}) {
  return !auth.loading && Boolean(auth.isAuthenticated) && (!auth.familyId || !auth.userRole)
}
