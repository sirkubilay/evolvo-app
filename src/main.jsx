import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* DİKKAT: Aşağıdaki tırnak içine kendi Site Key'ini yapıştırmayı unutma! */}
    <GoogleReCaptchaProvider reCaptchaKey="6Leaj3UsAAAAAAEKZMktdtlgVTVJ3olEA77cWTCV">
      <App />
    </GoogleReCaptchaProvider>
  </React.StrictMode>,
)