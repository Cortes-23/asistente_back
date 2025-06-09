import express from 'express';
import { generateChatResponse, registerUser, loginUser } from '../controllers/chatController.js';

const router = express.Router();

// Ruta para registrar un nuevo usuario
router.post('/register', registerUser);
// Ruta para iniciar sesión
router.post('/login', loginUser);
// Ruta para generar respuestas de ChatGPT
router.post('/', generateChatResponse);

export { router };
