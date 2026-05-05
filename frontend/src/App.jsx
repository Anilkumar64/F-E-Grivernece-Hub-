import { Toaster } from "react-hot-toast";
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UserProvider } from "./context/UserContext";

function App() {
  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <UserProvider>
            <NotificationProvider>
              <AppRoutes></AppRoutes>
              <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
            </NotificationProvider>
          </UserProvider>
        </AuthProvider>
      </BrowserRouter >
    </>
  )
}

export default App
