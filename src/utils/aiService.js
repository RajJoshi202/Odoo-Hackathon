/**
 * AI Service Client
 * =================
 * Utility module for communicating with the FastAPI AI microservice.
 * All AI-related API calls are centralized here for maintainability.
 *
 * The AI service runs at http://localhost:8000 (configurable via env var).
 */

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000'

/**
 * Check if the AI service is running.
 * @returns {Promise<boolean>}
 */
export async function checkAIHealth() {
  try {
    const res = await fetch(`${AI_BASE_URL}/`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return false
    const data = await res.json()
    return data.message === 'Inventory AI running'
  } catch {
    return false
  }
}

/**
 * Predict next-day demand from historical sales data.
 *
 * @param {Array<{sales: number}>} salesHistory - Array of daily sales entries
 * @returns {Promise<{predicted_daily_demand: number}>}
 */
export async function predictDemand(salesHistory) {
  const res = await fetch(`${AI_BASE_URL}/predict-demand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(salesHistory),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to predict demand')
  }

  return res.json()
}

/**
 * Get a smart reorder recommendation.
 *
 * @param {{ stock: number, demand: number, lead_time: number, safety_stock: number }} params
 * @returns {Promise<{reorder: boolean, reorder_point: number, recommended_order: number}>}
 */
export async function getReorderRecommendation({ stock, demand, lead_time, safety_stock }) {
  const res = await fetch(`${AI_BASE_URL}/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock, demand, lead_time, safety_stock }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to get reorder recommendation')
  }

  return res.json()
}
