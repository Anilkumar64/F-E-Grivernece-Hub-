import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from 'react-router-dom'
import './App.css'
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
              <ToastContainer position="top-right" autoClose={3000} />
            </NotificationProvider>
          </UserProvider>
        </AuthProvider>
      </BrowserRouter >
    </>
  )
}

export default App
