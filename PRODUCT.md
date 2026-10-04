# FlySmart (پرواز پلاس) - Product Specification

## Overview

FlySmart (سامانه پرواز پلاس) is an aviation-grade flight search, instant reservation, and AI-powered flight regulation assistant platform designed for domestic and international air travelers in Iran and the region.

## Core Value Propositions

1. **Zero-Friction 1-Click Booking (Travelers Vault):** National ID and passenger credentials are stored securely once and auto-filled with 1 click on any future booking.
2. **Predictive Fare Analytics:** Live price advice (BUY_NOW vs WAIT) based on historical route volatility and remaining seat demand.
3. **SMS Price-Drop Watchdog:** Users set a budget ceiling for desired routes and receive real-time SMS notifications when seats drop below target.
4. **Interactive Budget Explorer:** Travelers explore all accessible destinations fitting their target travel budget.
5. **AI Aviation Assistant:** Comprehensive, real-time knowledge base covering all 18 standard airline and airport regulation domains (baggage, dangerous goods/powerbanks, pet transport, pregnancy, Mehrabad terminal maps, exit tax, delay compensation rights, refund charts).

## Target Surfaces

- **Marketing Landing Page (`/`):** Persuade mode. High-impact aerodynamic hero, integrated flight search bar, flash deals carousel, budget explorer, and travelers vault feature showcase.
- **Flight Discovery (`/flights`):** Operate mode. 7-day fare matrix calendar, granular filters (airlines, price, stops, time), real-time pricing cards with refund drawer.
- **Checkout & Reservation (`/checkout/[bookingId]`):** Operate mode. 1-click traveler injection, seat assignment, instant payment, ticket voucher issuance.
- **User Dashboard (`/dashboard`):** Operate mode. Active bookings, e-tickets, price alert manager, saved companions.
- **Aviation Assistant Widget:** Read & Assist mode. Natural language Persian & English question answering with verified regulatory citations.
