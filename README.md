# 📦 CoreInventory

CoreInventory is a **modern warehouse and inventory management system** built for the **Odoo Hackathon**.  
It helps organizations manage **products, warehouses, stock levels, and inventory operations** through a clean web interface.

The system ensures **accurate stock tracking with real‑time updates and a complete inventory ledger** for all operations.

---

# 🚀 Features

## 🔐 Authentication
- Secure login and signup using **Supabase Auth**
- OTP-based password recovery
- Protected routes for authenticated users

## 📦 Product Management
- Create and manage products
- SKU-based product tracking
- Category support
- Unit of measure management
- Cost tracking

## 🏬 Warehouse Management
- Create multiple warehouses
- Create rack / location structures
- Track stock per location

## 📊 Stock Management
- Real-time stock tracking
- **On Hand vs Free to Use inventory logic**
- Low stock alerts
- Stock value calculation
- Location-based filtering

---

# 🔄 Inventory Operations

## 📥 Receipts (Incoming Goods)

Used when products enter the warehouse.

Example:

Supplier → Warehouse

Actions:
- Create receipt
- Add products
- Mark Ready
- Validate → stock increases automatically

---

## 📤 Deliveries (Outgoing Goods)

Used when goods leave the warehouse for shipment.

Example:

Warehouse → Customer

Process:
1. Pick items
2. Pack items
3. Validate delivery → stock decreases automatically

---

## 🔁 Internal Transfers

Move inventory between warehouse locations.

Example:

Rack A → Rack B

Stock updates automatically between locations.

---

## ⚖ Stock Adjustments

Correct inventory differences after physical counting.

Example:

System stock: 50  
Actual stock: 45  
Adjustment: -5  

---

# 📜 Move History (Inventory Ledger)

Every inventory operation creates a **movement record**.

Tracked data includes:
- Movement type
- Product
- Source location
- Destination location
- Quantity
- User
- Timestamp

This ensures **complete inventory traceability**.

---

# 📊 Inventory Logic

The system tracks two stock quantities:

### On Hand
Total physical quantity in a location.

### Free to Use
Quantity available for operations.

Formula:

Free to Use = On Hand − Reserved

Rule enforced:

free_to_use ≤ on_hand

---

# 🤖 AI Integration

The project includes **AI-powered features** to enhance inventory insights and automation.

Possible use cases:
- smart inventory insights
- stock predictions
- automated analysis

---

# 🛠 Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- shadcn/ui
- React Router

### State Management
- Zustand

### Forms & Validation
- React Hook Form
- Zod

### Backend / Database
- Supabase
- PostgreSQL

### Utilities
- date-fns
- react-hot-toast
- SheetJS (Excel export)

---

# 📁 Project Structure
src
├ components
├ pages
├ layouts
├ store
├ hooks
├ utils
├ constants
├ supabase


---

# ⚙ Setup Instructions

## 1️⃣ Clone the repository

```bash
git clone https://github.com/RajJoshi202/Odoo-Hackathon.git
cd core-inventory
2️⃣ Install dependencies
npm install
3️⃣ Configure environment variables
Create .env file:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
4️⃣ Run the development server
npm run dev
App will run at:

http://localhost:5173
👨‍💻 Contributors
Developed for Odoo Hackathon

Snehal Mishra

Mahek

Raj Joshi

📜 License
This project is developed for the Odoo Hackathon and is open for educational purposes.


✅ **How to use:**

1. Open your GitHub repo  
2. Click **README.md**  
3. Click **Edit (✏️)**  
4. **Paste this content**  
5. Click **Commit changes**

---

If you want, I can also give you a **much more impressive README (with badges, screenshots section, demo video section, and architecture diagram)** which will make your **hackathon repo look much more professional.** 🚀
