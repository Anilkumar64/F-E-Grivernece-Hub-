import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from 'react-router-dom'
import './App.css'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <>
      <BrowserRouter>
        <AppRoutes></AppRoutes>
        <ToastContainer position="top-right" autoClose={3000} />
      </BrowserRouter >
    </>
  )
}

export default App
