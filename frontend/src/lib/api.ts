
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';

export const api = axios.create({
    baseURL: API_URL,
});

export const getMenu = async () => {
    const response = await api.get('/menu');
    return response.data;
};

export const placeOrder = async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
};
