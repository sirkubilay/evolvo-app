import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import { AndroidWebGate, shouldGateAndroidWeb } from './components/AndroidWebGate.jsx'

const root = ReactDOM.createRoot(document.getElementById('root'))

if (shouldGateAndroidWeb()) {
  root.render(<AndroidWebGate />)
} else root.render(
  <GoogleReCaptchaProvider reCaptchaKey="6LeFlRYsAAAAAOJIWpqfBCBnoKjbY7T-DSpa2hh_">
    <App />
  </GoogleReCaptchaProvider>
)