import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL); // ✅ uses deployed backend
export default socket;
