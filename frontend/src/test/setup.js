// Matchers DOM (toBeInTheDocument, etc.) intégrés à Vitest.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Démonte les composants et vide le DOM après chaque test.
afterEach(() => {
  cleanup()
})
