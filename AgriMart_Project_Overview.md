# AgriMart - Project Overview & Presentation Guide

## 1. Project Title
**AgriMart: India's Digital Farm-to-Retail Supply Chain Hub**

## 2. The Vision
AgriMart aims to revolutionize the agricultural supply chain in India by leveraging technology to connect local farmers directly with urban and rural retailers. The platform eliminates unnecessary middlemen, ensures fair pricing for farmers, and provides fresher produce at better rates for retailers.

## 3. Problem Statement
*   **Inefficient Supply Chain:** Traditional "Mandi" systems involve multiple intermediaries, leading to high wastage and price inflation.
*   **Lack of Transparency:** Farmers often don't know the final market price, while retailers have no information about the source of their produce.
*   **Payment & Logistics Hurdles:** Moving bulk agricultural goods is complex and often lacks digital tracking.

## 4. The Solution: Key Features
### A. Landing Page & First Impression
*   **Rich Aesthetics:** Modern, premium design with smooth animations and dynamic layouts.
*   **Direct Interaction:** Quick links to explore products and get started.
*   **Social Proof:** Integrated testimonials from verified farmers and retailers.

### B. User Roles & Redirection
*   **Farmers:** Can list products, manage inventory, and track earnings.
*   **Retailers:** Access a curated marketplace, manage a cart with bulk limits, and track orders.
*   **Admins:** Oversee the entire system, manage users, and monitor platform-wide transactions.

### C. Advanced Marketplace
*   **Smart Filtering:** Filter by category (Fruits, Vegetables, Grains, Dairy), price range, and newest listings.
*   **Bulk Ordering Logic:** Implements a minimum order weight (e.g., 15kg) to ensure logistics feasibility for agricultural trade.
*   **Rich Product Details:** Real-time stock availability and farmer profiles.

### D. Logistics & Tracking
*   **Shiprocket Integration:** A demo-ready tracking system that visualizes the shipment journey (Shipped, In Transit, Delivered).
*   **Transparency:** Retailers can see exactly where their produce is at any given time.

### E. Localization (i18n)
*   **Multi-Language Support:** Fully translated interface in **English, Hindi (हिन्दी), Marathi (मराठी), and Punjabi (ਪੰਜਾਬੀ)**.
*   **Cultural Relevance:** Ensuring the platform is accessible to farmers across different regions of India.

### F. Modern UI/UX
*   **Dark Mode Support:** Dynamic theme switching for better usability.
*   **Responsive Design:** Fully functional across desktops, tablets, and smartphones.

## 5. Technology Stack
*   **Frontend:**
    *   Core: HTML5, Vanilla JavaScript.
    *   Styling: Custom Vanilla CSS (Modern design system).
    *   Icons/Fonts: FontAwesome, Google Fonts (Playfair Display, DM Sans).
*   **Backend:**
    *   Runtime: Node.js
    *   Framework: Express.js
    *   Database: MongoDB (Mongoose ODM)
*   **Integration & Tools:**
    *   Image Hosting: Cloudinary.
    *   Logistics: Shiprocket (Tracking Demo).
    *   Authentication: JWT (JSON Web Tokens) with BcryptJS encryption.

## 6. Project Structure
```text
finalproject/
├── backend/            # Express.js Server
│   ├── src/
│   │   ├── controllers/ # Business logic
│   │   ├── models/      # MongoDB schemas
│   │   ├── routes/      # API endpoints
│   │   └── middleware/  # Auth & Role checks
│   └── server.js       # Main entry point
└── frontend/           # Static Web Assets
    ├── css/            # Global & Component styles
    ├── js/             # Frontend logic (app.js, admin.js, i18n.js)
    ├── pages/          # Role-specific dashboards (Admin, Farmer, Retailer)
    ├── assets/         # Images & Icons
    ├── index.html      # Landing Page
    └── login.html      # Unified Auth Page
```

## 7. Functional Workflow for Presentation
1.  **Home Page:** Show the vibrant landing page and localization (switch to Hindi).
2.  **Registration:** Register as a **Retailer**.
3.  **Marketplace:** Browse products, filter by "Fruits", and add "Basmati Rice" to the cart.
4.  **Cart & Checkout:** Show the "Minimum 15kg" validation logic. Complete a checkout.
5.  **Logistics:** Go to the Logistics tab to track the recently placed order.
6.  **Admin View:** Login as Admin to show user management and global platform stats.

---
*Created for AgriMart Project Presentation - May 2026*
