// src/hooks/useAxiosPrivate.js
import { useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import useAuth from "./useAuth";

const useAxiosPrivate = () => {
    const { accessToken } = useAuth();

    useEffect(() => {
        if (accessToken) {
            axiosInstance.defaults.headers.common["Authorization"] =
                `Bearer ${accessToken}`;
        } else {
            delete axiosInstance.defaults.headers.common["Authorization"];
        }
    }, [accessToken]);

    return axiosInstance;
};

export default useAxiosPrivate;
