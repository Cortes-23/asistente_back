import OpenAI from 'openai';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { generateUniqueId } from '../utils/helpers.js';
import dotenv from 'dotenv';

dotenv.config();

// Configurar OpenAI con manejo de errores mejorado
let openai;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno OPENAI_API_KEY no está definida')
  }

  openai = new OpenAI({ apiKey });
  console.log('✅ OpenAI configurado correctamente');
} catch (error) {
  console.error('Error al inicializar OpenAI:', error);
}

// Registrar nuevo usuario
export const registerUser = async (req, res) => {
  console.log('Intentando registrar usuario:', req.body);
  
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ 
        error: 'El nombre es requerido y debe ser una cadena de texto válida' 
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ name: name.trim() });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Ya existe un usuario con este nombre' 
      });
    }

    const userId = generateUniqueId();
    
    const user = new User({
      name: name.trim(),
      userId
    });
    
    const savedUser = await user.save();
    console.log('Usuario guardado exitosamente:', savedUser);

    res.status(201).json({ 
      message: "¡Registro exitoso! 🎉",
      userId,
      name: name.trim()
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      error: 'Error al registrar usuario',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Iniciar sesión de usuario
export const loginUser = async (req, res) => {
  try {
    const { name, userId } = req.body;
    
    const user = await User.findOne({ name, userId });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener las últimas conversaciones
    const conversations = await Conversation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20); // Aumentamos el límite para mostrar más historia

    res.json({
      user,
      conversations,
      message: '¡Conversación recuperada exitosamente!'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al recuperar la conversación' });
  }
};

// Generar respuesta de ChatGPT
export const generateChatResponse = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: 'Mensaje y userId son requeridos' });
    }

    // Buscar o crear conversación
    let conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      conversation = new Conversation({ userId, messages: [] });
    }

    // Agregar mensaje del usuario
    conversation.messages.push({
      role: 'user',
      content: message
    });

    // Generar respuesta de OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversation.messages.map(({ role, content }) => ({ role, content }))
    });

    const assistantResponse = completion.choices[0].message.content;

    // Guardar respuesta del asistente
    conversation.messages.push({
      role: 'assistant',
      content: assistantResponse
    });

    conversation.lastUpdated = new Date();
    await conversation.save();

    res.json({ 
      response: assistantResponse,
      conversation: conversation.messages 
    });
  } catch (error) {
    console.error('Error al generar la respuesta:', error);
    res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      details: error.message 
    });
  }
};

// Obtener historial de conversaciones
export const getConversationHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await Conversation.findOne({ userId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    res.json({ conversation: conversation.messages });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo el historial' });
  }
};
