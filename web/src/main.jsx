import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import '@fontsource-variable/inter';
import './theme/tokens.css';
import './theme/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <RealtimeProvider>
                <NotificationsProvider>
                  <ChatProvider>
                    <App />
                  </ChatProvider>
                </NotificationsProvider>
              </RealtimeProvider>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  </React.StrictMode>,
);
