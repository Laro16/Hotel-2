import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HotelDashboard from './HotelDashboard'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<HotelDashboard />)
