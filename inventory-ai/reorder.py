"""
Smart Reorder Recommendation Module
====================================
Calculates whether a product needs to be reordered and, if so, how many units.

Core Formula
------------
  Reorder Point  =  (Daily Demand × Lead Time)  +  Safety Stock

  - **Daily Demand**: predicted units sold per day (from the forecasting module).
  - **Lead Time**: number of days it takes for a supplier to deliver new stock.
  - **Safety Stock**: extra buffer inventory to guard against demand spikes
    or supply delays.

Decision Logic
--------------
  • If  current stock  ≤  reorder point  →  reorder = True
  • Recommended order quantity  =  (Daily Demand × 30)
    — targets roughly 30 days of coverage so you don't reorder too frequently.
"""

from typing import Dict, Any


def calculate_reorder(
    stock: float,
    demand: float,
    lead_time: float,
    safety_stock: float,
) -> Dict[str, Any]:
    """
    Determine whether a reorder is needed and suggest a quantity.

    Parameters
    ----------
    stock : float
        Current on-hand inventory (units).
    demand : float
        Predicted daily demand (units/day).
    lead_time : float
        Supplier lead time (days).
    safety_stock : float
        Desired safety-stock buffer (units).

    Returns
    -------
    dict
        {
            "reorder": bool,           # True if stock is at or below reorder point
            "reorder_point": float,    # Calculated reorder threshold
            "recommended_order": float # Suggested quantity to order (30-day coverage)
        }

    Raises
    ------
    ValueError
        If any numeric input is negative.
    """

    # ── Input validation ──
    if stock < 0:
        raise ValueError("Stock cannot be negative.")
    if demand < 0:
        raise ValueError("Demand cannot be negative.")
    if lead_time < 0:
        raise ValueError("Lead time cannot be negative.")
    if safety_stock < 0:
        raise ValueError("Safety stock cannot be negative.")

    # ── Calculate reorder point ──
    reorder_point = (demand * lead_time) + safety_stock

    # ── Determine whether to reorder ──
    should_reorder = stock <= reorder_point

    # ── Calculate recommended order quantity ──
    # Target: 30 days of stock coverage from the point of reorder
    recommended_order = round(demand * 30) if should_reorder else 0

    return {
        "reorder": should_reorder,
        "reorder_point": round(reorder_point, 2),
        "recommended_order": recommended_order,
    }
