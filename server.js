import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { router as chatRoutes } from './routes/chatRoutes.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateMongoUri, connectWithRetry } from './utils/helpers.js';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Verificar configuración de OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  ADVERTENCIA: No se encontró la variable OPENAI_API_KEY');
  console.log('\x1b[36m%s\x1b[0m', 'Para configurar la API key de OpenAI:');
  console.log('1. Crea un archivo .env en la carpeta backend');
  console.log('2. Añade la línea: OPENAI_API_KEY=tu-api-key-de-openai');
  console.log('3. Reinicia el servidor\n');
  
  // Verificar si existe el archivo .env
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('\x1b[31m%s\x1b[0m', 'No se encontró el archivo .env');
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://tu-frontend-url.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Configuración de MongoDB mejorada
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'chatapp',
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

// Inicializar conexión
connectDB();

// Remover la inicialización duplicada y mejorar el manejo de conexión
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} está en uso. Intentando con otro puerto...`);
        server.close();
        app.listen(0, () => { // 0 asignará un puerto disponible automáticamente
          console.log(`🚀 Servidor reiniciado en el puerto ${server.address().port}`);
        });
      } else {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
};

// Inicializar servidor
startServer();

// Manejar desconexiones
mongoose.connection.on('disconnected', async () => {
  console.log('🔄 MongoDB desconectado - intentando reconectar...');
  try {
    await connectWithRetry(mongoose, process.env.MONGO_URI, 3);
  } catch (error) {
    console.error('❌ Reconexión fallida:', error);
  }
});

// Rutas
app.use('/api/chat', chatRoutes);

// Ruta para probar el servidor
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de ChatGPT funcionando correctamente',
    status: 'OpenAI configurado con clave fija en el controlador'
  });
});

// Agregar ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Agregar middleware de error
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
