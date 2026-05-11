import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleReCaptchaProvider reCaptchaKey="6LeFlRYsAAAAAOJIWpqfBCBnoKjbY7T-DSpa2hh_">
    <App />
  </GoogleReCaptchaProvider>
)