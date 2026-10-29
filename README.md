# 🚗 Vehicle Rental Management Portal (B.Tech Capstone Project)

A full-stack responsive web application for managing vehicle rental operations, client records, booking transactions, automated pricing calculations, and double-booking prevention. Built with **React 19**, **Vite**, **React Router DOM v7**, and **JSON Server REST API**.

---

## 📋 Table of Contents
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Database Schema (db.json)](#-database-schema-dbjson)
- [REST API Endpoints](#-rest-api-endpoints)
- [Business Logic & Formulas](#-business-logic--formulas)
  - [Rental Calculation Formula](#1-rental-calculation-formula)
  - [Double-Booking Prevention Algorithm](#2-double-booking-prevention-algorithm)
- [Project Directory Structure](#-project-directory-structure)
- [Installation and Execution](#-installation-and-execution)
- [Testing Verification Checklist](#-testing-verification-checklist)
- [Future Enhancements](#-future-enhancements)

---

## ✨ Features

### 📊 1. Executive Dashboard
- **Live Dynamic Metrics**: Calculates Total Vehicles, Available Vehicles, Currently Rented, Total Customers, Total Rentals, Active Bookings, and Total Revenue dynamically from JSON Server data without hardcoding.
- **Fleet Composition Breakdown**: Real-time visual progress bars showing distribution across Cars, SUVs, Motorcycles, and Luxury vehicles.
- **Recent Transactions Table**: Live feed of the most recent rental bookings with one-click invoice views.
- **Instant Rental Shortcuts**: Fast-dispatch cards for vehicles marked available.

### 🚘 2. Fleet Vehicle Management
- Full **CRUD** operations (`GET`, `POST`, `PUT`, `DELETE`).
- **Multi-Filter & Search**: Real-time search by Vehicle Name, Brand, Registration Number, with dropdown filters for Type, Status (Available, Rented, Maintenance), and Fuel Type (Petrol, Diesel, Electric, Hybrid, CNG), plus Price & Name sorting.
- **Vehicle Details View** (`/vehicles/:id`): High-resolution vehicle specs, pricing rate, features, operational status, and complete past booking history.
- **Deletion Safety**: Blocks deletion of vehicles that have active rental transactions.

### 👥 3. Customer Directory Management
- Full **CRUD** operations (`GET`, `POST`, `PUT`, `DELETE`).
- Real-time search across Customer Name, Email, Phone, Driving License Number, and Address.
- **Validation**: 10-digit mobile number validation, email format checking, and duplicate prevention for email and driving license numbers.
- **Active Booking Guard**: Prevents deleting customers with ongoing active rentals.

### 📑 4. Rental Transaction & Booking Engine
- Full **CRUD** operations (`GET`, `POST`, `PUT`, `DELETE`).
- **Automated Calculation**: Real-time calculation of rental days and total amount based on selected dates and daily rates.
- **Double Booking Prevention**: Enforces calendar conflict checking before booking is created or updated.
- **Dynamic Status**: Tracks rentals across `Active`, `Upcoming`, `Completed`, and `Cancelled` states.
- **Invoice Summary** (`/rentals/:id`): Formal printable invoice summary detailing customer data, vehicle specifications, rate breakdown, and calculation proof.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Library** | [React](https://react.dev/) (v19) + JavaScript ES6+ |
| **UI Framework** | [Bootstrap 5](https://getbootstrap.com/) (Responsive Grid, Modals, Badges, Forms, Cards, Tables) |
| **Styling** | Bootstrap 5 + Custom CSS (RentWheels Dark-Themed Design System, Glassmorphism) |
| **Build Tool & Bundler** | [Vite](https://vite.dev/) |
| **Routing** | [React Router DOM](https://reactrouter.com/) (v7) |
| **Backend REST API** | [JSON Server](https://github.com/typicode/json-server) on Port 3000 |
| **Collections in `db.json`** | Exactly 3: `vehicles`, `customers`, and `rentals` |
| **HTTP Communication** | Native Fetch API (Centralized in `src/services/api.js`) |
| **Authentication Policy** | No Login Required (Open Portal; Customer Registration built into Booking Flow) |

---

## 🔄 System Architecture & Data Flow

```text
User Interaction (Forms / Buttons / Navigation)
       │
       ▼
React Components (Pages / Cards / Modals)
       │
       ▼
React Hooks (useState, useEffect, useParams, useMemo)
       │
       ▼
Validation & Utils (rentalUtils.js, validation.js)
       │
       ▼
API Service Layer (src/services/api.js)
       │
       ▼
HTTP Fetch Requests (GET / POST / PUT / DELETE)
       │
       ▼
JSON Server (http://localhost:3000)
       │
       ▼
Persistent Database (db.json)
```

---

## 🗄️ Database Schema (`db.json`)

The database consists strictly of 3 core collections:

```json
{
  "vehicles": [
    {
      "id": "1",
      "name": "Honda City",
      "brand": "Honda",
      "type": "Car",
      "model": "2024",
      "registrationNumber": "AP01AB1234",
      "pricePerDay": 2500,
      "fuelType": "Petrol",
      "seats": 5,
      "transmission": "Automatic",
      "status": "Available",
      "image": "https://images.unsplash.com/...",
      "description": "Comfortable premium sedan suitable for city and highway travel."
    }
  ],
  "customers": [
    {
      "id": "1",
      "name": "Rahul Kumar",
      "email": "rahul.kumar@example.com",
      "phone": "9876543210",
      "licenseNumber": "DL1420110012345",
      "address": "Bhimavaram, Andhra Pradesh",
      "createdAt": "2026-09-20"
    }
  ],
  "rentals": [
    {
      "id": "1",
      "vehicleId": "2",
      "customerId": "1",
      "startDate": "2026-09-28",
      "endDate": "2026-10-02",
      "numberOfDays": 5,
      "pricePerDay": 3200,
      "totalAmount": 16000,
      "status": "Active",
      "createdAt": "2026-09-27"
    }
  ]
}
```

---

## 🌐 REST API Endpoints

All endpoints run on `http://localhost:3000`:

| Resource | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Vehicles** | `GET` | `/vehicles` | Retrieve all vehicles in fleet |
| | `GET` | `/vehicles/:id` | Retrieve single vehicle by ID |
| | `POST` | `/vehicles` | Add a new vehicle |
| | `PUT` | `/vehicles/:id` | Update vehicle details |
| | `DELETE` | `/vehicles/:id` | Delete vehicle by ID |
| **Customers** | `GET` | `/customers` | Retrieve all registered customers |
| | `GET` | `/customers/:id` | Retrieve single customer by ID |
| | `POST` | `/customers` | Register a new customer |
| | `PUT` | `/customers/:id` | Update customer record |
| | `DELETE` | `/customers/:id` | Delete customer by ID |
| **Rentals** | `GET` | `/rentals` | Retrieve all rental transactions |
| | `GET` | `/rentals/:id` | Retrieve single rental by ID |
| | `POST` | `/rentals` | Create a new rental transaction |
| | `PUT` | `/rentals/:id` | Update rental booking |
| | `DELETE` | `/rentals/:id` | Delete / cancel rental booking |

---

## 🧮 Business Logic & Formulas

### 1. Rental Calculation Formula
The total rental fee is calculated automatically upon date selection and cannot be manually overridden:

$$\text{Rental Amount} = \text{Number of Days} \times \text{Price Per Day}$$

- **Inclusive Days Calculation**: If Start Date is `2026-10-01` and End Date is `2026-10-03`, the duration is calculated as **3 days**.
- Same-day rentals (e.g., `2026-10-01` to `2026-10-01`) count as **1 day**.

### 2. Double-Booking Prevention Algorithm
Before any rental creation (`POST`) or edit (`PUT`), the system queries existing bookings for that vehicle. Two date intervals $[S_{req}, E_{req}]$ and $[S_{ex}, E_{ex}]$ overlap if:

$$S_{req} \le E_{ex} \quad \text{AND} \quad E_{req} \ge S_{ex}$$

- **Exclusion Rules**: Rentals with status `Cancelled` are ignored. When editing an existing rental, the current rental's ID is excluded from collision checking.
- **Validation Guard**: If an overlap is detected, submission is blocked and an informative alert is displayed.

---

## 📁 Project Directory Structure

```text
Vehicle-Rental-Portal/
├── public/
│   └── vehicles/               # Local vehicle asset storage
├── src/
│   ├── components/
│   │   ├── ConfirmModal.jsx    # Accessible modal for deletion confirmation
│   │   ├── CustomerForm.jsx    # Reusable customer Add/Edit form with validation
│   │   ├── EmptyState.jsx      # Friendly fallback card for empty queries
│   │   ├── Loading.jsx         # Loading spinner with animated status
│   │   ├── Navbar.jsx          # Header navigation & server status indicator
│   │   ├── RentalForm.jsx      # Rental form with live computation & overlap guard
│   │   ├── SearchBar.jsx       # Universal search & multi-select filter bar
│   │   ├── Sidebar.jsx         # Collapsible sidebar with active route state
│   │   ├── StatCard.jsx        # Key metric card with gradient icon boxes
│   │   ├── Toast.jsx           # Timed auto-dismiss notification toast
│   │   ├── VehicleCard.jsx     # Vehicle fleet card with badges & actions
│   │   └── VehicleForm.jsx     # Reusable vehicle Add/Edit form
│   ├── pages/
│   │   ├── AddCustomer.jsx     # Register customer view
│   │   ├── AddRental.jsx       # Book new rental view
│   │   ├── AddVehicle.jsx      # Add new vehicle view
│   │   ├── Customers.jsx       # Customer list & search view
│   │   ├── Dashboard.jsx       # Real-time analytics dashboard
│   │   ├── EditCustomer.jsx    # Edit customer view
│   │   ├── EditRental.jsx      # Edit rental view with conflict checking
│   │   ├── EditVehicle.jsx     # Edit vehicle view
│   │   ├── NotFound.jsx        # 404 Route handler
│   │   ├── RentalDetails.jsx   # Detailed invoice breakdown view
│   │   ├── Rentals.jsx         # Rental transactions history view
│   │   ├── VehicleDetails.jsx  # Vehicle specification & history view
│   │   └── Vehicles.jsx        # Fleet directory & filtering view
│   ├── services/
│   │   └── api.js              # Centralized JSON Server HTTP service layer
│   ├── utils/
│   │   ├── rentalUtils.js      # Date difference, currency format, overlap checks
│   │   └── validation.js       # Field validation rules & regex checks
│   ├── App.css                 # Comprehensive responsive CSS styles
│   ├── App.jsx                 # Route definitions and application layout
│   ├── index.css               # Design tokens, color system, and resets
│   └── main.jsx                # Application root with BrowserRouter
├── db.json                     # JSON Server mock database
├── package.json                # Project dependencies and npm scripts
├── vite.config.js              # Vite configuration
└── README.md                   # Comprehensive project documentation
```

---

## 🚀 Installation and Execution

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start JSON Server (Backend - Terminal 1)
```bash
npx json-server --watch db.json --port 3000
```
*(Or run `npm run server`)*

### Step 3: Start Vite Dev Server (Frontend - Terminal 2)
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Testing Verification Checklist

- [x] **Dashboard Metrics**: Live values calculated dynamically from API data.
- [x] **Vehicle CRUD**: GET, POST, PUT, DELETE operations verified.
- [x] **Customer CRUD**: GET, POST, PUT, DELETE operations with phone/email validation.
- [x] **Rental CRUD**: GET, POST, PUT, DELETE operations with real-time billing calculations.
- [x] **Double-Booking Prevention**: Verified that overlapping bookings on the same vehicle are blocked.
- [x] **Date Validation**: Past dates blocked for new bookings; end date cannot precede start date.
- [x] **Confirmation Modals**: Delete operations confirm before issuing API requests.
- [x] **Persistence**: Modifications persist across browser reloads in `db.json`.

---

## 🔮 Future Enhancements
1. Multi-tier user authentication (Admin, Manager, Customer login).
2. Online payment gateway integration (Razorpay / Stripe sandbox).
3. Export invoice as PDF and CSV report downloads.
4. GPS vehicle tracking simulator and maintenance odometer logging.
