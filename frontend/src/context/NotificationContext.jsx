import React from "react";
import NotificationContext from "./NotificationCore.jsx";
import { useNotifications } from "../hooks/useNotifications";

export const NotificationProvider = ({ children }) => {
    const value = useNotifications();
    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export default NotificationProvider;
