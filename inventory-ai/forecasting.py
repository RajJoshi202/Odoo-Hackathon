"""
Demand Forecasting Module
=========================
Uses Linear Regression to predict next-day demand based on historical sales data.

How it works:
  1. Receives a list of daily sales figures (e.g. [{"sales": 5}, {"sales": 7}, …]).
  2. Converts them into a time-indexed feature matrix where X = day number (0, 1, 2, …)
     and y = sales on that day.
  3. Fits a Linear Regression model on (X, y).
  4. Predicts demand for the *next* day (day n).

Why Linear Regression?
  - Simple, interpretable, and fast to train.
  - Suitable for short-term trend estimation when data is limited.
  - Can easily be swapped with more advanced models (e.g. ARIMA, Prophet)
    later without changing the API contract.
"""

from typing import List, Dict
import pandas as pd
from sklearn.linear_model import LinearRegression


def predict_demand(sales_history: List[Dict[str, float]]) -> float:
    """
    Predict the next day's demand from a list of historical daily sales.

    Parameters
    ----------
    sales_history : list[dict]
        Each dict must have a "sales" key with a numeric value.
        Example: [{"sales": 5}, {"sales": 7}, {"sales": 6}]

    Returns
    -------
    float
        The predicted demand for the next day, rounded to the nearest integer.

    Raises
    ------
    ValueError
        If fewer than 2 data points are provided (regression needs at least 2).
    """

    # ── Validate input ──
    if not sales_history or len(sales_history) < 2:
        raise ValueError(
            "At least 2 sales data points are required for forecasting."
        )

    # ── Build a DataFrame ──
    # Each row represents one day; the index is the day number.
    df = pd.DataFrame(sales_history)

    # Feature: day number (0-based)
    X = df.index.values.reshape(-1, 1)  # shape (n, 1)

    # Target: actual sales on that day
    y = df["sales"].values  # shape (n,)

    # ── Train the model ──
    model = LinearRegression()
    model.fit(X, y)

    # ── Predict next day ──
    next_day = len(sales_history)  # day n (0-indexed)
    predicted = model.predict([[next_day]])[0]

    # Demand can't be negative; clamp to 0 and round to nearest integer
    return max(0, round(predicted))
