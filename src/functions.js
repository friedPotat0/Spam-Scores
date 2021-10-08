import { DEFAULT_SCORE_LOWER_BOUNDS, DEFAULT_SCORE_UPPER_BOUNDS } from './constants.js'

/**
 * Returns Lower & Upper Bound
 * @param {*} storage
 * @returns {number[]} Lower & Upper Bound
 */
export function getBounds(storage) {
  const lowerBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  )
  const upperBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  )
  return [lowerBounds, upperBounds]
}
