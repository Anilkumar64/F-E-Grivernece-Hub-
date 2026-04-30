import { createContext } from "react";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => children;

export default UserContext;
