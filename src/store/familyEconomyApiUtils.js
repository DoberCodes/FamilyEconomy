export function getErrorMessage(error, fallback = 'Could not load family data.') {
  if (typeof error === 'string') {
    return error
  }

  return error?.message || error?.error || fallback
}

export function toQueryError(error, fallback) {
  return {
    message: getErrorMessage(error, fallback),
  }
}

function familyTags(context, tagTypes) {
  return tagTypes.map((type) => ({ type, id: context.familyId }))
}

function invalidateFamilyTags(tagTypes) {
  return (_result, error, { context }) => (
    error ? [] : familyTags(context, tagTypes)
  )
}

export function familyMutation(builder, operation, fallback, tagTypes) {
  return builder.mutation({
    async queryFn(payload) {
      try {
        await operation(payload)
        return { data: { ok: true } }
      } catch (error) {
        return { error: toQueryError(error, fallback) }
      }
    },
    invalidatesTags: invalidateFamilyTags(tagTypes),
  })
}
